import { createAdminClient } from "@/lib/supabase/admin";
import { HttpError } from "@/lib/errors";
import { createVoiceUpload, pathBelongsToUser } from "./storage";
import { reviewRelease, type ReleaseDraft } from "./release";
import { displayStoreStatus, pendingDistributor } from "./distributors";
import { songForUser } from "./repo";
import { usageThisMonth } from "./billing";

export type ReleaseRow = {
  id: string;
  user_id: string;
  song_id: string;
  artist_name: string;
  title: string;
  cover_path: string | null;
  credits: { writer?: string; producer?: string; genre?: string; releaseDate?: string; explicit?: boolean };
  ai_vocals: boolean;
  ai_music: boolean;
  ai_lyrics: boolean;
  status: string;
  reviewer_note: string | null;
  distributor: string | null;
  distributor_ref: string | null;
  funding: string;
  royalty_user_bps: number;
  royalty_lyrixis_bps: number;
  created_at: string;
};

function db() {
  return createAdminClient();
}

export function publicRelease(row: ReleaseRow) {
  return {
    id: row.id,
    songId: row.song_id,
    artistName: row.artist_name,
    title: row.title,
    status: row.status,
    note: row.reviewer_note,
    distributor: row.distributor,
    distributorRef: row.distributor_ref,
    funding: row.funding,
    royaltyUserBps: row.royalty_user_bps,
    royaltyLyrixisBps: row.royalty_lyrixis_bps,
    storeStatus: displayStoreStatus(row.status),
    genre: row.credits?.genre ?? null,
    explicit: Boolean(row.credits?.explicit),
    hasCover: Boolean(row.cover_path),
    createdAt: row.created_at,
  };
}

export async function releasesForUser(userId: string): Promise<ReleaseRow[]> {
  const { data, error } = await db().from("voice_releases").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20);
  if (error) throw new Error(error.message);
  return (data ?? []) as ReleaseRow[];
}

export async function queueForReview(): Promise<ReleaseRow[]> {
  const { data, error } = await db()
    .from("voice_releases")
    .select("*")
    .in("status", ["submitted", "in_review", "approved", "held"])
    .order("created_at", { ascending: true })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []) as ReleaseRow[];
}

export async function beginCover(userId: string, releaseId: string, mime: string) {
  const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
  const path = `${userId}/releases/${releaseId}/cover.${ext}`;
  return createVoiceUpload(path);
}

export async function submitVoiceRelease(input: { userId: string; owner: boolean; draft: ReleaseDraft; songId: string; funding: string }) {
  const usage = await usageThisMonth(input.userId);
  const reviewed = reviewRelease({ ...input.draft, releasesThisMonth: usage.releases });
  if (!reviewed.ok) throw new HttpError(400, "release", reviewed.reason);
  const song = await songForUser(input.songId, input.userId);
  if (!song?.output_path) throw new HttpError(400, "need_audio", "Generate a song before you release it.");
  if (!input.owner && input.funding !== "wallet" && input.funding !== "card" && input.funding !== "all_access" && input.funding !== "owner_bypass") {
    throw new HttpError(402, "payment_required", "A release is $9 (900 Ixis). Pay on Checkout, then submit.");
  }
  const { data, error } = await db()
    .from("voice_releases")
    .insert({
      user_id: input.userId,
      song_id: input.songId,
      artist_name: reviewed.artistName,
      title: reviewed.title,
      credits: reviewed.credits,
      ai_vocals: true,
      ai_music: true,
      ai_lyrics: true,
      rights_accepted_at: new Date().toISOString(),
      royalty_user_bps: reviewed.royaltyUserBps,
      royalty_lyrixis_bps: reviewed.royaltyLyrixisBps,
      status: "submitted",
      funding: input.owner ? "owner_bypass" : input.funding,
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not save the release.");
  return data as ReleaseRow;
}

export async function attachCover(userId: string, releaseId: string, path: string) {
  if (!pathBelongsToUser(userId, path)) throw new HttpError(403, "forbidden", "That file is not on your account.");
  const { error } = await db().from("voice_releases").update({ cover_path: path, updated_at: new Date().toISOString() }).eq("id", releaseId).eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function decideRelease(input: { id: string; decision: "approve" | "reject"; note: string }) {
  const { data, error } = await db().from("voice_releases").select("*").eq("id", input.id).maybeSingle();
  if (error || !data) throw new HttpError(404, "not_found", "That release is not in the queue.");
  const row = data as ReleaseRow;
  if (input.decision === "reject") {
    const { error: updateError } = await db()
      .from("voice_releases")
      .update({ status: "rejected", reviewer_note: input.note.slice(0, 500), updated_at: new Date().toISOString() })
      .eq("id", row.id);
    if (updateError) throw new Error(updateError.message);
    return { status: "rejected" };
  }
  const sent = await pendingDistributor.submit({
    id: row.id,
    artistName: row.artist_name,
    title: row.title,
    credits: { writer: row.credits?.writer || row.artist_name, producer: row.credits?.producer || row.artist_name },
    ai: { vocals: row.ai_vocals, music: row.ai_music, lyrics: row.ai_lyrics },
    royaltyUserBps: row.royalty_user_bps,
    royaltyLyrixisBps: row.royalty_lyrixis_bps,
    audioUrl: null,
    coverUrl: null,
  });
  await db()
    .from("voice_releases")
    .update({
      status: "held",
      distributor: sent.distributor,
      distributor_ref: sent.ref,
      reviewer_note: input.note.slice(0, 500) || sent.message,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);
  return { status: sent.status, distributor: sent.distributor, ref: sent.ref };
}
