import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { livenessScore, LIVENESS_PASS } from "../audio";
import { screenText } from "../filter";
import {
  ALL_ACCESS_RELEASES_PER_MONTH,
  ALL_ACCESS_SONGS_PER_MONTH,
  ROYALTY_LYRIXIS_BPS,
  ROYALTY_USER_BPS,
  VOICE_SONG_PRICES,
  VOICE_SONG_SKUS,
} from "../pricing";
import { providerStatus } from "../providers";
import {
  acceptConsent,
  createSong,
  extraTake,
  pay,
  removeVoice,
  requestRelease,
  reviewRelease,
  saveSample,
  submitLiveness,
  train,
  writeLyrics,
} from "../service";
import { MemoryStore } from "../store";
import type { Actor } from "../types";
import { demoPreviewWav } from "../audio";

const root = path.resolve(__dirname, "../../..");

function actor(partial: Partial<Actor> = {}): Actor {
  return {
    userId: "11111111-1111-4111-8111-111111111111",
    email: "singer@example.com",
    demo: true,
    demoAllowance: false,
    owner: false,
    walletOwner: "singer@example.com",
    ...partial,
  };
}

function deps(store = new MemoryStore(), allAccess = false) {
  return { store, allAccess: async () => allAccess, now: () => new Date("2026-10-12T12:00:00Z") };
}

async function readyVoice(store: MemoryStore, person = actor()) {
  const service = deps(store, person.demoAllowance);
  const sample = await saveSample(service, person, {
    bytes: demoPreviewWav(2),
    mime: "audio/wav",
    seconds: 8,
    peak: 0.4,
    rms: 0.08,
    clippingRatio: 0,
  });
  expect(sample.ok).toBe(true);
  const consent = await acceptConsent(service, person, true);
  expect(consent.ok).toBe(true);
  if (!consent.ok) return;
  const live = await submitLiveness(service, person, { transcript: consent.data.voice.livenessPhrase || "", bytes: 2000 });
  expect(live.ok).toBe(true);
  const paid = await pay(service, person, { sku: "setup", method: "ixis", idempotencyKey: `setup-${person.userId.slice(0, 8)}`, returnUrl: "https://lyrixis.dev/voice-songs" });
  expect(paid.ok).toBe(true);
  const trained = await train(service, person);
  expect(trained.ok).toBe(true);
  return service;
}

describe("Voice Songs prices", () => {
  it("locks the approved dollars, Ixis, and Wallet SKUs", () => {
    expect(VOICE_SONG_PRICES.setup).toMatchObject({ usd: 5, ixis: 500, productKey: "lyrixis.voice.setup" });
    expect(VOICE_SONG_PRICES.song).toMatchObject({ usd: 6, ixis: 600, productKey: "lyrixis.voice.song" });
    expect(VOICE_SONG_PRICES.take).toMatchObject({ usd: 1, ixis: 100, productKey: "lyrixis.voice.take" });
    expect(VOICE_SONG_PRICES.release).toMatchObject({ usd: 9, ixis: 900, productKey: "lyrixis.voice.release" });
    expect(VOICE_SONG_SKUS.setup).toBe("lyrixis.voice.setup");
    expect(ROYALTY_USER_BPS).toBe(9000);
    expect(ROYALTY_LYRIXIS_BPS).toBe(1000);
    expect(ALL_ACCESS_SONGS_PER_MONTH).toBe(4);
    expect(ALL_ACCESS_RELEASES_PER_MONTH).toBe(1);
  });
});

describe("own-voice filter", () => {
  it("blocks artist names, covers, and famous titles", () => {
    expect(screenText("sing like Drake").ok).toBe(false);
    expect(screenText("in the style of Taylor Swift").ok).toBe(false);
    expect(screenText("a chorus like bohemian rhapsody").ok).toBe(false);
    expect(screenText("Night Window", "artist").ok).toBe(true);
    expect(screenText("I keep a warm light on in the kitchen").ok).toBe(true);
  });

  it("passes a read-aloud when most of the words match", () => {
    const phrase = "I consent to Lyrixis using only my own voice for songs I create.";
    expect(livenessScore(phrase, phrase)).toBe(1);
    expect(livenessScore(phrase, "I consent to Lyrixis using only my own voice for songs")).toBeGreaterThanOrEqual(LIVENESS_PASS);
    expect(livenessScore(phrase, "hello there")).toBeLessThan(LIVENESS_PASS);
  });
});

describe("Voice Songs flow", () => {
  it("rejects a short live sample and a missing provider key", async () => {
    const store = new MemoryStore();
    const person = actor({ demo: false });
    const service = deps(store);
    const tiny = Buffer.alloc(4000, 1);
    const rejected = await saveSample(service, person, { bytes: tiny, mime: "audio/wav", seconds: 12, peak: 0.2, rms: 0.05, clippingRatio: 0 });
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) expect(rejected.code).toBe("sample_quality");

    const bytes = Buffer.alloc(200 * 1600, 2);
    const saved = await saveSample(service, person, { bytes, mime: "audio/wav", seconds: 200, peak: 0.4, rms: 0.08, clippingRatio: 0 });
    expect(saved.ok).toBe(true);
    await acceptConsent(service, person, true);
    const voice = await store.getVoice(person.userId);
    await submitLiveness(service, person, { transcript: voice?.livenessPhrase || "", bytes: 2000 });
    const previousReplicate = process.env.REPLICATE_API_TOKEN;
    const previousCard = process.env.STRIPE_SECRET_KEY;
    delete process.env.REPLICATE_API_TOKEN;
    delete process.env.STRIPE_SECRET_KEY;
    const trained = await train(service, person);
    expect(trained.ok).toBe(false);
    if (!trained.ok) expect(trained.code).toBe("payment_required");
    const paid = await pay(service, person, { sku: "setup", method: "card", idempotencyKey: "card-setup-live-01", returnUrl: "https://lyrixis.dev/voice-songs" });
    if (previousReplicate) process.env.REPLICATE_API_TOKEN = previousReplicate;
    if (previousCard) process.env.STRIPE_SECRET_KEY = previousCard;
    expect(paid.ok).toBe(false);
    if (!paid.ok) expect(paid.code).toBe("not_configured");
  });

  it("runs record, consent, train, lyric block, generate, extra take, and release in demo", async () => {
    const store = new MemoryStore();
    const person = actor();
    const service = await readyVoice(store, person);
    expect(service).toBeTruthy();
    const blocked = await writeLyrics(service!, person, { theme: "Drake", mood: "warm", genre: "pop", note: "", lyrics: "" });
    expect(blocked.ok).toBe(false);
    const draft = await writeLyrics(service!, person, { theme: "a kitchen light", mood: "warm", genre: "indie pop", note: "keep it original", lyrics: "" });
    expect(draft.ok).toBe(true);
    if (!draft.ok) return;
    const songPay = await pay(service!, person, { sku: "song", method: "ixis", idempotencyKey: "song-pay-demo-0001", returnUrl: "https://lyrixis.dev/voice-songs" });
    expect(songPay.ok).toBe(true);
    const again = await pay(service!, person, { sku: "song", method: "ixis", idempotencyKey: "song-pay-demo-0001", returnUrl: "https://lyrixis.dev/voice-songs" });
    expect(again.ok).toBe(true);
    const balance = await store.getBalance(person.userId);
    expect(balance).toBe(10_000 - 500 - 600);

    const created = await createSong(service!, person, {
      title: "Kitchen Light",
      theme: "a kitchen light",
      mood: "warm",
      genre: "indie pop",
      lyrics: draft.data.lyrics,
      idempotencyKey: "song-pay-demo-0001",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.data.take.watermarked).toBe(true);
    expect(created.data.take.musicProvider).toBe("demo");
    const blob = await store.getBlob(created.data.take.mixPath || "");
    expect(blob?.body.subarray(0, 4).toString()).toBe("RIFF");

    const second = await extraTake(service!, person, created.data.song.id, { idempotencyKey: "included-take-2", voiceMix: 40, lyrics: draft.data.lyrics });
    expect(second.ok).toBe(true);
    const third = await extraTake(service!, person, created.data.song.id, { idempotencyKey: "included-take-3", voiceMix: 50 });
    expect(third.ok).toBe(true);
    const fourth = await extraTake(service!, person, created.data.song.id, { idempotencyKey: "extra-take-4", voiceMix: 70 });
    expect(fourth.ok).toBe(false);
    if (!fourth.ok) expect(fourth.code).toBe("payment_required");
    await pay(service!, person, { sku: "take", method: "ixis", idempotencyKey: "extra-take-4", returnUrl: "https://lyrixis.dev/voice-songs" });
    const extra = await extraTake(service!, person, created.data.song.id, { idempotencyKey: "extra-take-4", voiceMix: 70 });
    expect(extra.ok).toBe(true);
    if (!extra.ok) return;
    expect(extra.data.take.kind).toBe("extra");

    const other = actor({ userId: "22222222-2222-4222-8222-222222222222", email: "other@example.com" });
    const stolen = await extraTake(deps(store), other, created.data.song.id, { idempotencyKey: "nope-other-user", voiceMix: 10 });
    expect(stolen.ok).toBe(false);

    const unpaid = await requestRelease(service!, person, {
      songId: created.data.song.id,
      takeId: created.data.take.id,
      artistName: "Amina Cole",
      title: "Kitchen Light",
      credits: "Vocal: Amina Cole. Music: generated. Lyrics: with Cixy.",
      rights: true,
      idempotencyKey: "release-missing",
    });
    expect(unpaid.ok).toBe(false);
    const celebrity = await requestRelease(service!, person, {
      songId: created.data.song.id,
      takeId: created.data.take.id,
      artistName: "Taylor Swift",
      title: "Kitchen Light",
      credits: "Vocal.",
      rights: true,
      idempotencyKey: "release-name",
    });
    expect(celebrity.ok).toBe(false);

    await pay(service!, person, { sku: "release", method: "card", idempotencyKey: "release-demo-01", returnUrl: "https://lyrixis.dev/voice-songs" });
    const release = await requestRelease(service!, person, {
      songId: created.data.song.id,
      takeId: created.data.take.id,
      artistName: "Amina Cole",
      title: "Kitchen Light",
      credits: "Lead vocal: Amina Cole, own consented voice. Music: generated. Lyrics: with Cixy.",
      rights: true,
      idempotencyKey: "release-demo-01",
    });
    expect(release.ok).toBe(true);
    if (!release.ok) return;
    expect(release.data.release.royaltyUserBps).toBe(9000);
    expect(release.data.release.royaltyLyrixisBps).toBe(1000);
    expect(release.data.release.status).toBe("queued");
    expect(release.data.release.aiDisclosure.vocals).toBe("ai_voice_clone_own");

    const reviewed = await reviewRelease(service!, person, { releaseId: release.data.release.id, decision: "approve", note: "ok" });
    expect(reviewed.ok).toBe(true);
    if (!reviewed.ok) return;
    expect(reviewed.data.release.distributorStatus).toBe("not_configured");
    expect(reviewed.data.release.distributorMessage).toMatch(/not configured/i);

    const removed = await removeVoice(service!, person);
    expect(removed.ok).toBe(true);
    expect(await store.getVoice(person.userId)).toBeNull();
    expect(await store.getBlob(`${person.userId}/voice/sample`)).toBeNull();
  });

  it("tracks All-Access allowances and the monthly release cap", async () => {
    const store = new MemoryStore();
    const person = actor({ demoAllowance: true });
    const service = deps(store, true);
    await readyVoice(store, person);
    const lyrics = "Verse one about a window and a quiet street.\nChorus: I am the one who stayed and sang the room awake tonight.";
    for (let n = 0; n < 4; n += 1) {
      const made = await createSong(service, person, {
        title: `Song ${n}`,
        theme: "window",
        mood: "quiet",
        genre: "folk",
        lyrics,
        idempotencyKey: `allow-song-${n}`,
      });
      expect(made.ok, `song ${n}`).toBe(true);
    }
    const fifth = await createSong(service, person, { title: "Song 5", theme: "window", mood: "quiet", genre: "folk", lyrics, idempotencyKey: "allow-song-5" });
    expect(fifth.ok).toBe(false);
    if (!fifth.ok) expect(fifth.code).toBe("payment_required");

    const usage = await store.getUsage(person.userId, "2026-10");
    expect(usage.songsUsed).toBe(4);
    const song = (await store.listSongs(person.userId))[0]!;
    const take = (await store.listTakes(song.id))[0]!;
    const first = await requestRelease(service, person, {
      songId: song.id, takeId: take.id, artistName: "Amina Cole", title: "Window", credits: "Own voice.", rights: true, idempotencyKey: "release-slot-0",
    });
    expect(first.ok).toBe(true);
    for (let n = 1; n < 4; n += 1) {
      const key = `release-slot-${n}`;
      const paid = await pay(service, person, { sku: "release", method: "ixis", idempotencyKey: key, returnUrl: "https://lyrixis.dev/voice-songs" });
      expect(paid.ok, `pay release ${n}`).toBe(true);
      const next = await requestRelease(service, person, {
        songId: song.id, takeId: take.id, artistName: "Amina Cole", title: `Window ${n}`, credits: "Own voice.", rights: true, idempotencyKey: key,
      });
      expect(next.ok, `release ${n}`).toBe(true);
    }
    const capped = await requestRelease(service, person, {
      songId: song.id, takeId: take.id, artistName: "Amina Cole", title: "Too many", credits: "Own voice.", rights: true, idempotencyKey: "release-slot-5",
    });
    expect(capped.ok).toBe(false);
    if (!capped.ok) expect(capped.code).toBe("release_cap");
  });
});

describe("Voice Songs migration", () => {
  it("enables RLS so each person reads only their own rows, and keeps audio private", () => {
    const sql = readFileSync(path.join(root, "database/migrations/20261012_voice_songs.sql"), "utf8");
    expect(sql).toMatch(/enable row level security/);
    expect(sql).toMatch(/user_id = public.current_app_user_id\(\)/);
    expect(sql).toMatch(/voice-songs-private/);
    expect(sql).toMatch(/public = false|false,/);
    expect(sql).not.toMatch(/for insert|for update|for delete/i);
    expect(providerStatus({} as NodeJS.ProcessEnv)).toEqual({
      elevenlabs: false, replicate: false, kits: false, toolost: false, revelator: false, card: false, cixy: false, speech: false,
    });
  });
});
