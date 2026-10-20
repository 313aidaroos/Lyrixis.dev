import { createAdminClient } from "@/lib/supabase/admin";
import type { PaymentRow, ReleaseRow, SongRow, TakeRow, UsageRow, VoiceRow } from "./types";
import type { VoiceSongsStore } from "./store";

const BUCKET = "voice-songs-private";

function admin() {
  return createAdminClient();
}

export class SupabaseStore implements VoiceSongsStore {
  async getVoice(userId: string) {
    const { data, error } = await admin().from("voice_song_voices").select("*").eq("user_id", userId).is("deleted_at", null).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? voiceFrom(data) : null;
  }
  async saveVoice(row: VoiceRow) {
    const { error } = await admin().from("voice_song_voices").upsert(voiceTo(row));
    if (error) throw new Error(error.message);
  }
  async listSongs(userId: string) {
    const { data, error } = await admin().from("voice_song_songs").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(songFrom);
  }
  async getSong(id: string) {
    const { data, error } = await admin().from("voice_song_songs").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? songFrom(data) : null;
  }
  async saveSong(row: SongRow) {
    const { error } = await admin().from("voice_song_songs").upsert(songTo(row));
    if (error) throw new Error(error.message);
  }
  async listTakes(songId: string) {
    const { data, error } = await admin().from("voice_desk_takes").select("*").eq("song_id", songId).order("take_number");
    if (error) throw new Error(error.message);
    return (data ?? []).map(takeFrom);
  }
  async saveTake(row: TakeRow) {
    const { error } = await admin().from("voice_desk_takes").upsert(takeTo(row));
    if (error) throw new Error(error.message);
  }
  async listReleases(userId: string) {
    const { data, error } = await admin().from("voice_song_releases").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(releaseFrom);
  }
  async listReleaseQueue() {
    const { data, error } = await admin().from("voice_song_releases").select("*").in("status", ["queued", "in_review"]).order("created_at");
    if (error) throw new Error(error.message);
    return (data ?? []).map(releaseFrom);
  }
  async getRelease(id: string) {
    const { data, error } = await admin().from("voice_song_releases").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? releaseFrom(data) : null;
  }
  async saveRelease(row: ReleaseRow) {
    const { error } = await admin().from("voice_song_releases").upsert(releaseTo(row));
    if (error) throw new Error(error.message);
  }
  async findPayment(idempotencyKey: string) {
    const { data, error } = await admin().from("voice_song_payments").select("*").eq("idempotency_key", idempotencyKey).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? paymentFrom(data) : null;
  }
  async listPayments(userId: string) {
    const { data, error } = await admin().from("voice_song_payments").select("*").eq("user_id", userId);
    if (error) throw new Error(error.message);
    return (data ?? []).map(paymentFrom);
  }
  async savePayment(row: PaymentRow) {
    const { error } = await admin().from("voice_song_payments").upsert(paymentTo(row));
    if (error) throw new Error(error.message);
  }
  async getUsage(userId: string, period: string) {
    const { data, error } = await admin().from("voice_song_usage").select("*").eq("user_id", userId).eq("period", period).maybeSingle();
    if (error) throw new Error(error.message);
    return data
      ? { userId, period, songsUsed: data.songs_used, releasesUsed: data.releases_used, setupCovered: data.setup_covered }
      : { userId, period, songsUsed: 0, releasesUsed: 0, setupCovered: false };
  }
  async saveUsage(row: UsageRow) {
    const { error } = await admin().from("voice_song_usage").upsert({
      user_id: row.userId,
      period: row.period,
      songs_used: row.songsUsed,
      releases_used: row.releasesUsed,
      setup_covered: row.setupCovered,
    });
    if (error) throw new Error(error.message);
  }
  async putBlob(objectPath: string, body: Buffer, contentType: string) {
    const { error } = await admin().storage.from(BUCKET).upload(objectPath, body, { contentType, upsert: true });
    if (error) throw new Error(error.message);
  }
  async getBlob(objectPath: string) {
    const { data, error } = await admin().storage.from(BUCKET).download(objectPath);
    if (error || !data) return null;
    return { body: Buffer.from(await data.arrayBuffer()), contentType: data.type || "application/octet-stream" };
  }
  async deleteUserBlobs(userId: string) {
    const client = admin().storage.from(BUCKET);
    for (const folder of ["voice", "songs", "art"]) {
      const prefix = folder === "voice" ? `${userId}/voice` : `${userId}/${folder}`;
      const { data } = await client.list(prefix);
      const paths = (data ?? []).map((item) => `${prefix}/${item.name}`);
      if (paths.length) await client.remove(paths);
    }
    await client.remove([`${userId}/voice/sample`]);
  }
  async getBalance() {
    return 0;
  }
  async adjustBalance() {
    return 0;
  }
}

function voiceTo(row: VoiceRow) {
  return {
    id: row.id,
    user_id: row.userId,
    status: row.status,
    sample_path: row.samplePath,
    sample_seconds: row.sampleSeconds,
    sample_mime: row.sampleMime,
    quality: row.quality,
    consent_text: row.consentText,
    consent_accepted_at: row.consentAcceptedAt,
    liveness_phrase: row.livenessPhrase,
    liveness_transcript: row.livenessTranscript,
    liveness_score: row.livenessScore,
    liveness_passed: row.livenessPassed,
    provider: row.provider,
    provider_model_ref: row.providerModelRef,
    train_error: row.trainError,
    is_demo: row.isDemo,
    deleted_at: row.deletedAt,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}
function voiceFrom(row: Record<string, unknown>): VoiceRow {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    status: row.status as VoiceRow["status"],
    samplePath: (row.sample_path as string | null) ?? null,
    sampleSeconds: num(row.sample_seconds),
    sampleMime: (row.sample_mime as string | null) ?? null,
    quality: (row.quality as VoiceRow["quality"]) ?? null,
    consentText: (row.consent_text as string | null) ?? null,
    consentAcceptedAt: (row.consent_accepted_at as string | null) ?? null,
    livenessPhrase: (row.liveness_phrase as string | null) ?? null,
    livenessTranscript: (row.liveness_transcript as string | null) ?? null,
    livenessScore: num(row.liveness_score),
    livenessPassed: Boolean(row.liveness_passed),
    provider: (row.provider as VoiceRow["provider"]) ?? null,
    providerModelRef: (row.provider_model_ref as string | null) ?? null,
    trainError: (row.train_error as string | null) ?? null,
    isDemo: Boolean(row.is_demo),
    deletedAt: (row.deleted_at as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}
function songTo(row: SongRow) {
  return {
    id: row.id, user_id: row.userId, voice_id: row.voiceId, title: row.title, theme: row.theme, mood: row.mood,
    genre: row.genre, lyrics: row.lyrics, messages: row.messages, status: row.status, funding: row.funding,
    receipt_id: row.receiptId, takes_included: row.takesIncluded, error: row.error, is_demo: row.isDemo,
    created_at: row.createdAt, updated_at: row.updatedAt,
  };
}
function songFrom(row: Record<string, unknown>): SongRow {
  return {
    id: String(row.id), userId: String(row.user_id), voiceId: String(row.voice_id), title: String(row.title),
    theme: String(row.theme ?? ""), mood: String(row.mood ?? ""), genre: String(row.genre ?? ""),
    lyrics: String(row.lyrics ?? ""), messages: (row.messages as SongRow["messages"]) ?? [],
    status: row.status as SongRow["status"], funding: (row.funding as SongRow["funding"]) ?? null,
    receiptId: (row.receipt_id as string | null) ?? null, takesIncluded: Number(row.takes_included ?? 3),
    error: (row.error as string | null) ?? null, isDemo: Boolean(row.is_demo),
    createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
}
function takeTo(row: TakeRow) {
  return {
    id: row.id, song_id: row.songId, user_id: row.userId, take_number: row.takeNumber, kind: row.kind,
    status: row.status, mix_path: row.mixPath, mime: row.mime, voice_mix: row.voiceMix,
    music_provider: row.musicProvider, voice_provider: row.voiceProvider, watermarked: row.watermarked,
    notes: row.notes, error: row.error, is_demo: row.isDemo, created_at: row.createdAt,
  };
}
function takeFrom(row: Record<string, unknown>): TakeRow {
  return {
    id: String(row.id), songId: String(row.song_id), userId: String(row.user_id), takeNumber: Number(row.take_number),
    kind: row.kind as TakeRow["kind"], status: row.status as TakeRow["status"],
    mixPath: (row.mix_path as string | null) ?? null, mime: (row.mime as string | null) ?? null,
    voiceMix: Number(row.voice_mix ?? 65), musicProvider: (row.music_provider as string | null) ?? null,
    voiceProvider: (row.voice_provider as string | null) ?? null, watermarked: Boolean(row.watermarked),
    notes: (row.notes as string[]) ?? [], error: (row.error as string | null) ?? null,
    isDemo: Boolean(row.is_demo), createdAt: String(row.created_at),
  };
}
function releaseTo(row: ReleaseRow) {
  return {
    id: row.id, song_id: row.songId, take_id: row.takeId, user_id: row.userId, artist_name: row.artistName,
    title: row.title, artwork_path: row.artworkPath, credits: row.credits, ai_disclosure: row.aiDisclosure,
    rights_accepted_at: row.rightsAcceptedAt, royalty_user_bps: row.royaltyUserBps, royalty_lyrixis_bps: row.royaltyLyrixisBps,
    status: row.status, review_note: row.reviewNote, distributor: row.distributor, distributor_status: row.distributorStatus,
    distributor_ref: row.distributorRef, distributor_message: row.distributorMessage, funding: row.funding,
    receipt_id: row.receiptId, is_demo: row.isDemo, created_at: row.createdAt, updated_at: row.updatedAt,
  };
}
function releaseFrom(row: Record<string, unknown>): ReleaseRow {
  return {
    id: String(row.id), songId: String(row.song_id), takeId: String(row.take_id), userId: String(row.user_id),
    artistName: String(row.artist_name), title: String(row.title), artworkPath: (row.artwork_path as string | null) ?? null,
    credits: String(row.credits ?? ""), aiDisclosure: row.ai_disclosure as ReleaseRow["aiDisclosure"],
    rightsAcceptedAt: (row.rights_accepted_at as string | null) ?? null,
    royaltyUserBps: Number(row.royalty_user_bps), royaltyLyrixisBps: Number(row.royalty_lyrixis_bps),
    status: row.status as ReleaseRow["status"], reviewNote: (row.review_note as string | null) ?? null,
    distributor: row.distributor as ReleaseRow["distributor"], distributorStatus: row.distributor_status as ReleaseRow["distributorStatus"],
    distributorRef: (row.distributor_ref as string | null) ?? null, distributorMessage: (row.distributor_message as string | null) ?? null,
    funding: (row.funding as ReleaseRow["funding"]) ?? null, receiptId: (row.receipt_id as string | null) ?? null,
    isDemo: Boolean(row.is_demo), createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
}
function paymentTo(row: PaymentRow) {
  return {
    id: row.id, user_id: row.userId, sku: row.sku, method: row.method, ixis: row.ixis, usd_cents: row.usdCents,
    status: row.status, receipt_id: row.receiptId, idempotency_key: row.idempotencyKey, song_id: row.songId,
    consumed: row.consumed, checkout_url: row.checkoutUrl, is_demo: row.isDemo, created_at: row.createdAt,
  };
}
function paymentFrom(row: Record<string, unknown>): PaymentRow {
  return {
    id: String(row.id), userId: String(row.user_id), sku: row.sku as PaymentRow["sku"], method: row.method as PaymentRow["method"],
    ixis: Number(row.ixis), usdCents: Number(row.usd_cents), status: row.status as PaymentRow["status"],
    receiptId: (row.receipt_id as string | null) ?? null, idempotencyKey: String(row.idempotency_key),
    songId: (row.song_id as string | null) ?? null, consumed: Boolean(row.consumed),
    checkoutUrl: (row.checkout_url as string | null) ?? null, isDemo: Boolean(row.is_demo), createdAt: String(row.created_at),
  };
}
function num(value: unknown): number | null {
  return value === null || value === undefined ? null : Number(value);
}
