import { createAdminClient } from "@/lib/supabase/admin";

export type ProfileRow = {
  id: string;
  user_id: string;
  status: string;
  consent_version: string | null;
  consent_hash: string | null;
  consent_accepted_at: string | null;
  liveness_phrase: string | null;
  liveness_passed_at: string | null;
  liveness_method: string | null;
  sample_path: string | null;
  sample_seconds: number | null;
  sample_mime: string | null;
  quality: Record<string, unknown> | null;
  training_prediction_id: string | null;
  model_url: string | null;
  provider: string | null;
  created_at: string;
  updated_at: string;
};

export type SongRow = {
  id: string;
  user_id: string;
  profile_id: string;
  title: string;
  theme: string | null;
  mood: string | null;
  genre: string | null;
  lyrics: string;
  status: string;
  funding: string;
  takes_allowed: number;
  takes_used: number;
  guide_path: string | null;
  stems_path: string | null;
  voice_prediction_id: string | null;
  output_path: string | null;
  output_mime: string | null;
  provider_music: string | null;
  provider_voice: string | null;
  error_message: string | null;
  watermarked: boolean;
  created_at: string;
  updated_at: string;
};

function db() {
  return createAdminClient();
}

export async function profileForUser(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await db().from("voice_profiles").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ProfileRow | null) ?? null;
}

export async function insertProfile(userId: string): Promise<ProfileRow> {
  const { data, error } = await db()
    .from("voice_profiles")
    .insert({ user_id: userId, status: "draft" })
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not create the voice profile.");
  return data as ProfileRow;
}

export async function updateProfile(id: string, userId: string, patch: Record<string, unknown>): Promise<ProfileRow> {
  const { data, error } = await db()
    .from("voice_profiles")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not update the voice profile.");
  return data as ProfileRow;
}

export async function insertSample(row: {
  profile_id: string;
  user_id: string;
  kind: "training" | "liveness";
  storage_path: string;
  mime_type: string;
  bytes: number;
  duration_seconds: number;
}): Promise<void> {
  const { error } = await db().from("voice_samples").insert({ ...row, storage_bucket: "voice-songs-private" });
  if (error) throw new Error(error.message);
}

export async function songsForUser(userId: string): Promise<SongRow[]> {
  const { data, error } = await db().from("voice_songs").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20);
  if (error) throw new Error(error.message);
  return (data ?? []) as SongRow[];
}

export async function songForUser(id: string, userId: string): Promise<SongRow | null> {
  const { data, error } = await db().from("voice_songs").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as SongRow | null) ?? null;
}

export async function insertSong(row: {
  user_id: string;
  profile_id: string;
  title: string;
  theme: string;
  mood: string;
  genre: string;
  lyrics: string;
  funding: string;
}): Promise<SongRow> {
  const { data, error } = await db().from("voice_songs").insert(row).select("*").single();
  if (error || !data) throw new Error(error?.message ?? "Could not save the song.");
  return data as SongRow;
}

export async function updateSong(id: string, userId: string, patch: Record<string, unknown>): Promise<SongRow> {
  const { data, error } = await db()
    .from("voice_songs")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not update the song.");
  return data as SongRow;
}

export async function insertTake(row: {
  song_id: string;
  user_id: string;
  take_number: number;
  status: string;
  storage_path: string | null;
  mime_type: string | null;
  watermarked: boolean;
  provider_music: string | null;
  provider_voice: string | null;
}): Promise<void> {
  const { error } = await db().from("voice_song_takes").insert(row);
  if (error) throw new Error(error.message);
}

export async function deleteProfileOwned(userId: string): Promise<ProfileRow | null> {
  const profile = await profileForUser(userId);
  if (!profile) return null;
  const { error } = await db().from("voice_profiles").delete().eq("id", profile.id).eq("user_id", userId);
  if (error) throw new Error(error.message);
  return profile;
}

export async function pathsForUser(userId: string): Promise<string[]> {
  const profile = await profileForUser(userId);
  const songs = await songsForUser(userId);
  const paths = [
    profile?.sample_path,
    ...songs.flatMap((song) => [song.guide_path, song.stems_path, song.output_path]),
  ].filter((path): path is string => {
    if (!path || path === "mock" || path === "skipped") return false;
    return !path.startsWith("http");
  });
  const { data } = await db().from("voice_samples").select("storage_path").eq("user_id", userId);
  for (const row of data ?? []) {
    if (row.storage_path) paths.push(row.storage_path as string);
  }
  return [...new Set(paths)];
}
