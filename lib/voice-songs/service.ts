import { createHash, randomUUID } from "crypto";
import { buyIxisUrl, redeem, WalletError } from "@/lib/apixis-wallet";
import { assessQuality, LIVENESS_PASS, livenessScore, pickPhrase } from "./audio";
import { screenFields, screenText } from "./filter";
import { coWriteLyrics } from "./lyrics";
import {
  ALL_ACCESS_RELEASES_PER_MONTH,
  ALL_ACCESS_SONGS_PER_MONTH,
  INCLUDED_TAKES,
  MAX_RELEASES_PER_MONTH,
  periodKey,
  priceFor,
  ROYALTY_LYRIXIS_BPS,
  ROYALTY_USER_BPS,
  type VoiceSongSku,
} from "./pricing";
import { cardSessionPaid, createCardSession, generateTake, NotConfigured, submitToDistributor, trainVoiceModel } from "./providers";
import type { VoiceSongsStore } from "./store";
import {
  AI_DISCLOSURE_NOTICE,
  aiDisclosure,
  CONSENT_TEXT,
  type Actor,
  type PaymentRow,
  type ReleaseRow,
  type SongRow,
  type TakeRow,
  type VoiceRow,
} from "./types";

export type ServiceDeps = {
  store: VoiceSongsStore;
  now?: () => Date;
  allAccess?: (actor: Actor) => Promise<boolean>;
  id?: () => string;
};

function nowIso(deps: ServiceDeps) {
  return (deps.now ?? (() => new Date()))().toISOString();
}

function id(deps: ServiceDeps) {
  return (deps.id ?? randomUUID)();
}

export type ApiFailure = { ok: false; status: number; code: string; message: string; needed?: number; buyUrl?: string };
export type ApiOk<T> = { ok: true; data: T };
export type ApiResult<T> = ApiOk<T> | ApiFailure;

function fail(status: number, code: string, message: string, extra: Partial<ApiFailure> = {}): ApiFailure {
  return { ok: false, status, code, message, ...extra };
}

function notConfigured(error: unknown): ApiFailure | null {
  if (error instanceof NotConfigured) return fail(503, "not_configured", error.message);
  return null;
}

async function access(deps: ServiceDeps, actor: Actor) {
  if (deps.allAccess) return deps.allAccess(actor);
  if (actor.owner) return true;
  return actor.demo && actor.demoAllowance;
}

export async function snapshot(deps: ServiceDeps, actor: Actor) {
  const voice = await deps.store.getVoice(actor.userId);
  const songs = await deps.store.listSongs(actor.userId);
  const takes = (await Promise.all(songs.map((song) => deps.store.listTakes(song.id)))).flat();
  const releases = await deps.store.listReleases(actor.userId);
  const period = periodKey(deps.now?.() ?? new Date());
  const usage = await deps.store.getUsage(actor.userId, period);
  const allAccessOn = await access(deps, actor);
  const balance = actor.demo ? await deps.store.getBalance(actor.userId) : null;
  const payments = await deps.store.listPayments(actor.userId);
  const setupPaid = payments.some((row) => row.sku === "setup" && row.status === "captured");
  return { voice, songs, takes, releases, usage, allAccess: allAccessOn, balance, period, consentText: CONSENT_TEXT, setupPaid };
}

export async function saveSample(
  deps: ServiceDeps,
  actor: Actor,
  input: { bytes: Buffer; mime: string; seconds: number; peak: number; rms: number; clippingRatio: number }
): Promise<ApiResult<{ voice: VoiceRow }>> {
  const quality = assessQuality({ ...input, bytes: input.bytes.length, demo: actor.demo });
  if (!quality.ok) return fail(400, "sample_quality", quality.notes.join(" "));
  const existing = await deps.store.getVoice(actor.userId);
  if (existing && existing.status === "training") return fail(409, "training", "Training is already running.");
  const stamp = nowIso(deps);
  const voice: VoiceRow = {
    id: existing?.id ?? id(deps),
    userId: actor.userId,
    status: "recorded",
    samplePath: `${actor.userId}/voice/sample`,
    sampleSeconds: quality.seconds,
    sampleMime: input.mime,
    quality,
    consentText: null,
    consentAcceptedAt: null,
    livenessPhrase: existing?.livenessPhrase ?? null,
    livenessTranscript: null,
    livenessScore: null,
    livenessPassed: false,
    provider: null,
    providerModelRef: null,
    trainError: null,
    isDemo: actor.demo,
    deletedAt: null,
    createdAt: existing?.createdAt ?? stamp,
    updatedAt: stamp,
  };
  await deps.store.putBlob(voice.samplePath!, input.bytes, input.mime);
  await deps.store.saveVoice(voice);
  return { ok: true, data: { voice } };
}

export async function acceptConsent(deps: ServiceDeps, actor: Actor, accepted: boolean): Promise<ApiResult<{ voice: VoiceRow }>> {
  if (!accepted) return fail(400, "consent_required", "Tick the consent box. Lyrixis will not train a voice without it.");
  const voice = await deps.store.getVoice(actor.userId);
  if (!voice?.samplePath) return fail(400, "sample_required", "Record a sample first.");
  const phrase = pickPhrase(`${actor.userId}:${voice.id}:${nowIso(deps).slice(0, 13)}`);
  const next: VoiceRow = {
    ...voice,
    status: "consented",
    consentText: CONSENT_TEXT,
    consentAcceptedAt: nowIso(deps),
    livenessPhrase: phrase,
    livenessPassed: false,
    livenessTranscript: null,
    livenessScore: null,
    updatedAt: nowIso(deps),
  };
  await deps.store.saveVoice(next);
  return { ok: true, data: { voice: next } };
}

export async function submitLiveness(
  deps: ServiceDeps,
  actor: Actor,
  input: { transcript: string; bytes: number }
): Promise<ApiResult<{ voice: VoiceRow }>> {
  const voice = await deps.store.getVoice(actor.userId);
  if (!voice?.consentAcceptedAt || !voice.livenessPhrase) return fail(400, "consent_required", "Accept the voice consent first.");
  if (input.bytes < 800 && !actor.demo) return fail(400, "liveness_audio", "Read the phrase aloud so we can check it.");
  const transcript = actor.demo && !input.transcript.trim() ? voice.livenessPhrase : input.transcript;
  const score = livenessScore(voice.livenessPhrase, transcript);
  if (!actor.demo && score < LIVENESS_PASS) {
    const next = { ...voice, livenessTranscript: transcript, livenessScore: score, livenessPassed: false, updatedAt: nowIso(deps) };
    await deps.store.saveVoice(next);
    return fail(400, "liveness_mismatch", "That reading did not match the phrase. Read the words on the screen and try again.");
  }
  const passedScore = actor.demo ? 1 : score;
  const next: VoiceRow = {
    ...voice,
    status: "verified",
    livenessTranscript: transcript,
    livenessScore: passedScore,
    livenessPassed: true,
    updatedAt: nowIso(deps),
  };
  await deps.store.saveVoice(next);
  return { ok: true, data: { voice: next } };
}

async function setupPaid(deps: ServiceDeps, actor: Actor) {
  const payments = await deps.store.listPayments(actor.userId);
  return payments.some((row) => row.sku === "setup" && row.status === "captured");
}

export async function train(deps: ServiceDeps, actor: Actor): Promise<ApiResult<{ voice: VoiceRow }>> {
  const voice = await deps.store.getVoice(actor.userId);
  if (!voice?.livenessPassed || !voice.samplePath) return fail(400, "not_verified", "Finish consent and the read-aloud check first.");
  const covered = (await access(deps, actor)) || actor.owner;
  const period = periodKey(deps.now?.() ?? new Date());
  const usage = await deps.store.getUsage(actor.userId, period);
  const already = await setupPaid(deps, actor);
  if (!covered && !already && !usage.setupCovered) {
    return fail(402, "payment_required", "Voice setup is $5 (500 Ixis) once, or included with All-Access.");
  }
  const blob = await deps.store.getBlob(voice.samplePath);
  if (!blob) return fail(400, "sample_missing", "The sample file is missing. Record it again.");
  const running: VoiceRow = { ...voice, status: "training", trainError: null, updatedAt: nowIso(deps) };
  await deps.store.saveVoice(running);
  try {
    const trained = await trainVoiceModel(blob.body, voice.id, actor.demo);
    const ready: VoiceRow = {
      ...running,
      status: "ready",
      provider: trained.provider,
      providerModelRef: trained.modelRef,
      updatedAt: nowIso(deps),
    };
    await deps.store.saveVoice(ready);
    if (covered && !already) {
      usage.setupCovered = true;
      await deps.store.saveUsage(usage);
    }
    return { ok: true, data: { voice: ready } };
  } catch (error) {
    const configured = notConfigured(error);
    const message = error instanceof Error ? error.message : "Training failed.";
    const failed: VoiceRow = { ...running, status: "failed", trainError: message, updatedAt: nowIso(deps) };
    await deps.store.saveVoice(failed);
    if (configured) return configured;
    return fail(502, "train_failed", message);
  }
}

export async function removeVoice(deps: ServiceDeps, actor: Actor): Promise<ApiResult<{ deleted: true }>> {
  const voice = await deps.store.getVoice(actor.userId);
  if (!voice) return { ok: true, data: { deleted: true } };
  const stamp = nowIso(deps);
  await deps.store.saveVoice({ ...voice, status: "deleted", deletedAt: stamp, samplePath: null, providerModelRef: null, updatedAt: stamp });
  await deps.store.deleteUserBlobs(actor.userId);
  return { ok: true, data: { deleted: true } };
}

export async function writeLyrics(
  deps: ServiceDeps,
  actor: Actor,
  input: { theme: string; mood: string; genre: string; note: string; lyrics: string }
) {
  const voice = await deps.store.getVoice(actor.userId);
  if (!voice || voice.status !== "ready") return fail(400, "voice_not_ready", "Train your voice before writing a song.");
  const screened = screenFields({ theme: input.theme, mood: input.mood, genre: input.genre, note: input.note, lyrics: input.lyrics });
  if (!screened.ok) return fail(400, "blocked", screened.reason);
  const draft = await coWriteLyrics({ ...input, history: [], demo: actor.demo });
  if (draft.blocked) return fail(400, "blocked", draft.blocked);
  if (!draft.lyrics) return fail(503, "not_configured", draft.reply);
  return { ok: true as const, data: draft };
}

async function unconsumed(deps: ServiceDeps, actor: Actor, sku: VoiceSongSku) {
  const rows = await deps.store.listPayments(actor.userId);
  return rows.find((row) => row.sku === sku && row.status === "captured" && !row.consumed) ?? null;
}

export async function quoteSku(deps: ServiceDeps, actor: Actor, sku: VoiceSongSku) {
  const price = priceFor(sku);
  const covered = await access(deps, actor);
  const period = periodKey(deps.now?.() ?? new Date());
  const usage = await deps.store.getUsage(actor.userId, period);
  const allowance =
    sku === "take"
      ? false
      : covered &&
        ((sku === "setup" && !usage.setupCovered && !(await setupPaid(deps, actor))) ||
          (sku === "song" && usage.songsUsed < ALL_ACCESS_SONGS_PER_MONTH) ||
          (sku === "release" && usage.releasesUsed < ALL_ACCESS_RELEASES_PER_MONTH));
  const balance = actor.demo ? await deps.store.getBalance(actor.userId) : null;
  return { price, allowance, balance, releasesThisMonth: usage.releasesUsed, songsThisMonth: usage.songsUsed };
}

export async function pay(
  deps: ServiceDeps,
  actor: Actor,
  input: { sku: VoiceSongSku; method: "ixis" | "card" | "allowance"; idempotencyKey: string; returnUrl: string }
): Promise<ApiResult<{ payment: PaymentRow; checkoutUrl?: string }>> {
  if (input.idempotencyKey.length < 8 || input.idempotencyKey.length > 80) {
    return fail(400, "idempotency", "Use an idempotency key between 8 and 80 characters.");
  }
  const existing = await deps.store.findPayment(input.idempotencyKey);
  if (existing && existing.userId === actor.userId) {
    return { ok: true, data: { payment: existing, checkoutUrl: existing.checkoutUrl ?? undefined } };
  }
  const price = priceFor(input.sku);
  const quote = await quoteSku(deps, actor, input.sku);
  if (input.sku === "release" && quote.releasesThisMonth >= MAX_RELEASES_PER_MONTH) {
    return fail(429, "release_cap", "You can request at most 4 releases in a month.");
  }
  if (input.method === "allowance") {
    if (!quote.allowance) return fail(402, "no_allowance", "This month’s All-Access allowance does not cover that.");
    const payment = await captureLocal(deps, actor, input.sku, "allowance", input.idempotencyKey, null);
    return { ok: true, data: { payment } };
  }
  if (actor.owner && input.method === "ixis") {
    const payment = await captureLocal(deps, actor, input.sku, "owner", input.idempotencyKey, "owner");
    return { ok: true, data: { payment } };
  }
  if (input.method === "ixis") {
    if (actor.demo) {
      const balance = await deps.store.getBalance(actor.userId);
      if (balance < price.ixis) {
        return fail(402, "insufficient_ixis", `Not enough demo Ixis. This is ${price.ixis} Ixis.`, {
          needed: price.ixis,
          buyUrl: buyIxisUrl("lyrixis", input.returnUrl),
        });
      }
      await deps.store.adjustBalance(actor.userId, -price.ixis);
      const payment = await captureLocal(deps, actor, input.sku, "ixis", input.idempotencyKey, `demo_rcpt_${input.idempotencyKey.slice(0, 12)}`);
      return { ok: true, data: { payment } };
    }
    try {
      const result = await redeem({
        owner: actor.walletOwner,
        productKey: price.productKey,
        idempotencyKey: input.idempotencyKey,
        provision: async () => ({ sku: input.sku }),
      });
      if (!result.ok) {
        return fail(402, "insufficient_ixis", `Not enough Ixis. This is ${result.needed || price.ixis} Ixis.`, {
          needed: result.needed || price.ixis,
          buyUrl: buyIxisUrl("lyrixis", input.returnUrl),
        });
      }
      const payment = await captureLocal(deps, actor, input.sku, "ixis", input.idempotencyKey, result.receiptId);
      return { ok: true, data: { payment } };
    } catch (error) {
      if (error instanceof WalletError) return fail(error.status === 503 ? 503 : 502, "wallet_error", error.message);
      throw error;
    }
  }
  if (actor.demo) {
    const payment = await captureLocal(deps, actor, input.sku, "card", input.idempotencyKey, `demo_card_${input.idempotencyKey.slice(0, 12)}`);
    return { ok: true, data: { payment } };
  }
  try {
    const session = await createCardSession({
      skuLabel: `Lyrixis ${price.label}`,
      usdCents: price.usd * 100,
      successUrl: `${input.returnUrl}${input.returnUrl.includes("?") ? "&" : "?"}card=1&key=${encodeURIComponent(input.idempotencyKey)}&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: input.returnUrl,
      metadata: { userId: actor.userId, sku: input.sku, idempotencyKey: input.idempotencyKey },
      idempotencyKey: input.idempotencyKey,
    });
    const payment: PaymentRow = {
      id: id(deps),
      userId: actor.userId,
      sku: input.sku,
      method: "card",
      ixis: price.ixis,
      usdCents: price.usd * 100,
      status: "pending",
      receiptId: session.sessionId,
      idempotencyKey: input.idempotencyKey,
      songId: null,
      consumed: false,
      checkoutUrl: session.url,
      isDemo: false,
      createdAt: nowIso(deps),
    };
    await deps.store.savePayment(payment);
    return { ok: true, data: { payment, checkoutUrl: session.url } };
  } catch (error) {
    const configured = notConfigured(error);
    if (configured) return configured;
    return fail(502, "card_failed", error instanceof Error ? error.message : "Card checkout failed.");
  }
}

async function captureLocal(
  deps: ServiceDeps,
  actor: Actor,
  sku: VoiceSongSku,
  method: PaymentRow["method"],
  idempotencyKey: string,
  receiptId: string | null
): Promise<PaymentRow> {
  const price = priceFor(sku);
  const payment: PaymentRow = {
    id: id(deps),
    userId: actor.userId,
    sku,
    method,
    ixis: method === "allowance" || method === "owner" ? 0 : price.ixis,
    usdCents: method === "card" ? price.usd * 100 : 0,
    status: "captured",
    receiptId,
    idempotencyKey,
    songId: null,
    consumed: false,
    checkoutUrl: null,
    isDemo: actor.demo,
    createdAt: nowIso(deps),
  };
  await deps.store.savePayment(payment);
  return payment;
}

export async function confirmCard(deps: ServiceDeps, actor: Actor, idempotencyKey: string, sessionId: string) {
  const payment = await deps.store.findPayment(idempotencyKey);
  if (!payment || payment.userId !== actor.userId) return fail(404, "payment_missing", "No checkout matches that key.");
  if (payment.status === "captured") return { ok: true as const, data: { payment } };
  const paid = actor.demo || (await cardSessionPaid(sessionId));
  if (!paid) return fail(402, "card_unpaid", "The card payment is not complete yet.");
  const next = { ...payment, status: "captured" as const, receiptId: sessionId };
  await deps.store.savePayment(next);
  return { ok: true as const, data: { payment: next } };
}

export async function createSong(
  deps: ServiceDeps,
  actor: Actor,
  input: { title: string; theme: string; mood: string; genre: string; lyrics: string; idempotencyKey: string }
): Promise<ApiResult<{ song: SongRow; take: TakeRow }>> {
  const voice = await deps.store.getVoice(actor.userId);
  if (!voice || voice.status !== "ready" || voice.userId !== actor.userId) {
    return fail(400, "voice_not_ready", "A ready voice model on your account is required.");
  }
  const screened = screenFields(input);
  if (!screened.ok) return fail(400, "blocked", screened.reason);
  if (input.lyrics.trim().length < 40) return fail(400, "lyrics_short", "Add a verse and a chorus before generating.");
  const covered = await access(deps, actor);
  const period = periodKey(deps.now?.() ?? new Date());
  const usage = await deps.store.getUsage(actor.userId, period);
  let payment = await deps.store.findPayment(input.idempotencyKey);
  if (payment?.consumed && payment.songId && payment.userId === actor.userId) {
    const existing = await deps.store.getSong(payment.songId);
    const takes = existing ? await deps.store.listTakes(existing.id) : [];
    if (existing && takes[0]) return { ok: true, data: { song: existing, take: takes[0] } };
  }
  if (payment && (payment.userId !== actor.userId || payment.sku !== "song" || payment.status !== "captured" || payment.consumed)) payment = null;
  if (!payment) payment = await unconsumed(deps, actor, "song");
  const useAllowance = !payment && !actor.owner && covered && usage.songsUsed < ALL_ACCESS_SONGS_PER_MONTH;
  if (!payment && !useAllowance && !actor.owner) return fail(402, "payment_required", "A voice song is $6 (600 Ixis), or uses one All-Access song this month.");
  const stamp = nowIso(deps);
  const song: SongRow = {
    id: id(deps),
    userId: actor.userId,
    voiceId: voice.id,
    title: input.title.trim() || input.theme.trim() || "Untitled",
    theme: input.theme,
    mood: input.mood,
    genre: input.genre,
    lyrics: input.lyrics.trim(),
    messages: [],
    status: "generating",
    funding: payment?.method ?? (actor.owner ? "owner" : "allowance"),
    receiptId: payment?.receiptId ?? null,
    takesIncluded: INCLUDED_TAKES,
    error: null,
    isDemo: actor.demo,
    createdAt: stamp,
    updatedAt: stamp,
  };
  await deps.store.saveSong(song);
  if (payment) {
    payment.consumed = true;
    payment.songId = song.id;
    await deps.store.savePayment(payment);
  }
  const take = await renderTake(deps, actor, song, voice.providerModelRef, 1, "included", 65);
  const readySong = { ...song, status: take.status === "ready" ? ("preview" as const) : ("failed" as const), error: take.error, updatedAt: nowIso(deps) };
  await deps.store.saveSong(readySong);
  if (take.status !== "ready") {
    if (payment) {
      payment.consumed = false;
      await deps.store.savePayment(payment);
    }
    return take.error?.includes("not configured")
      ? fail(503, "not_configured", take.error)
      : fail(502, "generate_failed", take.error || "Generation failed.");
  }
  if (useAllowance || payment?.method === "allowance") {
    usage.songsUsed += 1;
    await deps.store.saveUsage(usage);
  }
  return { ok: true, data: { song: readySong, take } };
}

async function renderTake(
  deps: ServiceDeps,
  actor: Actor,
  song: SongRow,
  modelRef: string | null,
  takeNumber: number,
  kind: TakeRow["kind"],
  voiceMix: number
): Promise<TakeRow> {
  const stamp = nowIso(deps);
  const take: TakeRow = {
    id: id(deps),
    songId: song.id,
    userId: actor.userId,
    takeNumber,
    kind,
    status: "running",
    mixPath: null,
    mime: null,
    voiceMix,
    musicProvider: null,
    voiceProvider: null,
    watermarked: true,
    notes: [],
    error: null,
    isDemo: actor.demo,
    createdAt: stamp,
  };
  await deps.store.saveTake(take);
  try {
    const generated = await generateTake({
      lyrics: song.lyrics,
      genre: song.genre,
      mood: song.mood,
      theme: song.theme,
      modelRef,
      demo: actor.demo,
      voiceMix,
    });
    const mixPath = `${actor.userId}/songs/${song.id}/take-${takeNumber}`;
    await deps.store.putBlob(mixPath, generated.audio, generated.mime);
    const ready: TakeRow = {
      ...take,
      status: "ready",
      mixPath,
      mime: generated.mime,
      musicProvider: generated.musicProvider,
      voiceProvider: generated.voiceProvider,
      watermarked: generated.watermarked,
      notes: generated.notes,
    };
    await deps.store.saveTake(ready);
    return ready;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed.";
    const failed = { ...take, status: "failed" as const, error: message };
    await deps.store.saveTake(failed);
    return failed;
  }
}

export async function extraTake(
  deps: ServiceDeps,
  actor: Actor,
  songId: string,
  input: { idempotencyKey: string; voiceMix: number; lyrics?: string }
): Promise<ApiResult<{ song: SongRow; take: TakeRow }>> {
  const song = await deps.store.getSong(songId);
  if (!song || song.userId !== actor.userId) return fail(404, "not_found", "Song not found.");
  const voice = await deps.store.getVoice(actor.userId);
  if (!voice || voice.id !== song.voiceId) return fail(403, "voice_mismatch", "This song is tied to your voice model.");
  if (input.lyrics) {
    const screened = screenText(input.lyrics, "lyrics");
    if (!screened.ok) return fail(400, "blocked", screened.reason);
    song.lyrics = input.lyrics.trim();
  }
  const takes = await deps.store.listTakes(song.id);
  const readyCount = takes.filter((row) => row.status === "ready").length;
  const kind: TakeRow["kind"] = readyCount < song.takesIncluded ? "included" : "extra";
  if (kind === "extra") {
    let payment = await deps.store.findPayment(input.idempotencyKey);
    if (!payment || payment.userId !== actor.userId || payment.sku !== "take" || payment.status !== "captured") {
      payment = await unconsumed(deps, actor, "take");
    }
    if (!payment && !actor.owner) return fail(402, "payment_required", "An extra take is 100 Ixis ($1).");
    if (payment) {
      payment.consumed = true;
      payment.songId = song.id;
      await deps.store.savePayment(payment);
    }
  }
  song.updatedAt = nowIso(deps);
  await deps.store.saveSong(song);
  const take = await renderTake(deps, actor, song, voice.providerModelRef, takes.length + 1, kind, input.voiceMix);
  if (take.status !== "ready") return fail(take.error?.includes("not configured") ? 503 : 502, "generate_failed", take.error || "Take failed.");
  return { ok: true, data: { song, take } };
}

export async function requestRelease(
  deps: ServiceDeps,
  actor: Actor,
  input: { songId: string; takeId: string; artistName: string; title: string; credits: string; rights: boolean; idempotencyKey: string; artwork?: { bytes: Buffer; mime: string } }
): Promise<ApiResult<{ release: ReleaseRow }>> {
  if (!input.rights) return fail(400, "rights_required", "Accept the rights declaration to request a release.");
  const song = await deps.store.getSong(input.songId);
  if (!song || song.userId !== actor.userId) return fail(404, "not_found", "Song not found.");
  const take = (await deps.store.listTakes(song.id)).find((row) => row.id === input.takeId && row.status === "ready");
  if (!take || take.userId !== actor.userId) return fail(400, "take_required", "Pick a finished take.");
  const screened = screenFields({ artistName: input.artistName, title: input.title, credits: input.credits, lyrics: song.lyrics });
  if (!screened.ok) return fail(400, "blocked", screened.reason);
  const period = periodKey(deps.now?.() ?? new Date());
  const usage = await deps.store.getUsage(actor.userId, period);
  if (usage.releasesUsed >= MAX_RELEASES_PER_MONTH) return fail(429, "release_cap", "You can request at most 4 releases in a month.");
  const covered = await access(deps, actor);
  let payment = await deps.store.findPayment(input.idempotencyKey);
  if (!payment || payment.userId !== actor.userId || payment.sku !== "release" || payment.status !== "captured") {
    payment = await unconsumed(deps, actor, "release");
  }
  const useAllowance = !payment && !actor.owner && covered && usage.releasesUsed < ALL_ACCESS_RELEASES_PER_MONTH;
  if (!payment && !useAllowance && !actor.owner) return fail(402, "payment_required", "A release is $9 (900 Ixis), or the one release included with All-Access this month.");
  const stamp = nowIso(deps);
  const release: ReleaseRow = {
    id: id(deps),
    songId: song.id,
    takeId: take.id,
    userId: actor.userId,
    artistName: input.artistName.trim(),
    title: input.title.trim(),
    artworkPath: null,
    credits: input.credits.trim(),
    aiDisclosure: aiDisclosure(false),
    rightsAcceptedAt: stamp,
    royaltyUserBps: ROYALTY_USER_BPS,
    royaltyLyrixisBps: ROYALTY_LYRIXIS_BPS,
    status: "queued",
    reviewNote: null,
    distributor: "unconfigured",
    distributorStatus: "not_configured",
    distributorRef: null,
    distributorMessage: "Waiting for review. The distributor is not called until a reviewer approves.",
    funding: payment?.method ?? (actor.owner ? "owner" : "allowance"),
    receiptId: payment?.receiptId ?? null,
    isDemo: actor.demo,
    createdAt: stamp,
    updatedAt: stamp,
  };
  if (input.artwork && input.artwork.bytes.length > 0) {
    if (!input.artwork.mime.startsWith("image/")) return fail(400, "artwork_type", "Cover art must be an image.");
    release.artworkPath = `${actor.userId}/art/${release.id}`;
    await deps.store.putBlob(release.artworkPath, input.artwork.bytes, input.artwork.mime);
  }
  await deps.store.saveRelease(release);
  usage.releasesUsed += 1;
  await deps.store.saveUsage(usage);
  if (payment) {
    payment.consumed = true;
    payment.songId = song.id;
    await deps.store.savePayment(payment);
  }
  return { ok: true, data: { release } };
}

export async function reviewRelease(
  deps: ServiceDeps,
  actor: Actor,
  input: { releaseId: string; decision: "approve" | "reject"; note: string }
): Promise<ApiResult<{ release: ReleaseRow }>> {
  if (!actor.owner && !actor.demo) return fail(403, "forbidden", "Only a Lyrixis reviewer can decide a release.");
  const release = await deps.store.getRelease(input.releaseId);
  if (!release) return fail(404, "not_found", "Release not found.");
  if (!actor.owner && release.userId !== actor.userId) return fail(403, "forbidden", "That release is not yours.");
  if (input.decision === "reject") {
    const next = { ...release, status: "rejected" as const, reviewNote: input.note || "Rejected in review.", updatedAt: nowIso(deps) };
    await deps.store.saveRelease(next);
    return { ok: true, data: { release: next } };
  }
  const sent = await submitToDistributor({
    releaseId: release.id,
    title: release.title,
    artistName: release.artistName,
    credits: `${release.credits}\n${AI_DISCLOSURE_NOTICE}\nSplit: user ${release.royaltyUserBps / 100}% / Lyrixis ${release.royaltyLyrixisBps / 100}%.`,
  });
  const next: ReleaseRow = {
    ...release,
    status: sent.status === "submitted" ? "submitted" : "approved",
    reviewNote: input.note || "Approved.",
    distributor: sent.distributor,
    distributorStatus: sent.status,
    distributorRef: sent.ref,
    distributorMessage: sent.message,
    aiDisclosure: aiDisclosure(sent.status === "submitted"),
    updatedAt: nowIso(deps),
  };
  await deps.store.saveRelease(next);
  return { ok: true, data: { release: next } };
}

export function consentHash(text: string = CONSENT_TEXT) {
  return createHash("sha256").update(text).digest("hex");
}
