import { createAdminClient } from "@/lib/supabase/admin";

export const VOICE_BUCKET = "voice-songs-private";

export function voiceSamplePath(userId: string, profileId: string, extension: string): string {
  const ext = extension.replace(/[^a-z0-9]/gi, "").slice(0, 8) || "webm";
  return `${userId}/voices/${profileId}/sample.${ext}`;
}

export function voiceLivenessPath(userId: string, profileId: string, extension: string): string {
  const ext = extension.replace(/[^a-z0-9]/gi, "").slice(0, 8) || "webm";
  return `${userId}/voices/${profileId}/liveness.${ext}`;
}

export function voiceObjectPath(userId: string, songId: string, name: string): string {
  const safe = name.replace(/[^a-z0-9._-]/gi, "");
  return `${userId}/songs/${songId}/${safe}`;
}

export function pathBelongsToUser(userId: string, path: string): boolean {
  return path.startsWith(`${userId}/`) && !path.includes("..");
}

export async function createVoiceUpload(path: string): Promise<{ bucket: string; path: string; token: string; signedUrl: string }> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(VOICE_BUCKET).createSignedUploadUrl(path);
  if (error || !data?.token) throw new Error(`Could not prepare the upload: ${error?.message ?? "no token"}`);
  return { bucket: VOICE_BUCKET, path: data.path, token: data.token, signedUrl: data.signedUrl };
}

export async function uploadVoiceObject(path: string, body: Buffer, contentType: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.storage.from(VOICE_BUCKET).upload(path, body, { contentType, upsert: true });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
}

export async function downloadVoiceObject(path: string): Promise<Buffer> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(VOICE_BUCKET).download(path);
  if (error || !data) throw new Error(`Storage download failed: ${error?.message ?? "empty object"}`);
  return Buffer.from(await data.arrayBuffer());
}

export async function voiceSignedUrl(path: string, seconds = 60 * 60): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(VOICE_BUCKET).createSignedUrl(path, seconds);
  if (error || !data?.signedUrl) throw new Error(`Could not sign the audio: ${error?.message ?? "unknown"}`);
  return data.signedUrl;
}

export async function removeVoiceObjects(paths: string[]): Promise<void> {
  const clean = paths.filter(Boolean);
  if (clean.length === 0) return;
  const admin = createAdminClient();
  const { error } = await admin.storage.from(VOICE_BUCKET).remove(clean);
  if (error) throw new Error(`Storage delete failed: ${error.message}`);
}

export async function voiceObjectExists(path: string): Promise<boolean> {
  const admin = createAdminClient();
  const slash = path.lastIndexOf("/");
  const folder = slash === -1 ? "" : path.slice(0, slash);
  const name = slash === -1 ? path : path.slice(slash + 1);
  const { data, error } = await admin.storage.from(VOICE_BUCKET).list(folder, { search: name, limit: 20 });
  if (error) return false;
  return (data ?? []).some((item) => item.name === name);
}
