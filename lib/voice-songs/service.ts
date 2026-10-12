import { isOwner, isOwnerEmail } from "@/lib/owners";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { HttpError } from "@/lib/errors";
import { voiceProviderStatus } from "./config";
import { VOICE_CONSENT_VERSION, consentHash } from "./consent";
import { newLivenessPhrase, phraseMatches } from "./liveness";
import { assessSample } from "./quality";
import { mayGenerate, TAKES_INCLUDED } from "./pricing";
import { screenFields } from "./safety";
import { nextVoiceStep, type VoiceJobState } from "./steps";
import {
  createVoiceUpload,
  downloadVoiceObject,
  pathBelongsToUser,
  removeVoiceObjects,
  uploadVoiceObject,
  voiceLivenessPath,
  voiceObjectExists,
  voiceObjectPath,
  voiceSamplePath,
  voiceSignedUrl,
} from "./storage";
import { composeMusic, separateStems } from "./providers/elevenlabs-music";
import { outputUrl, replicateGet, startRvcConvert, startRvcTraining } from "./providers/replicate-rvc";
import { kitsConfigured, kitsConvert } from "./providers/kits";
import { sampleToDatasetZip } from "./audio-prep";
import { toneWav } from "./wav";
import { transcribeClip } from "./transcribe";
import { writeLyrics } from "./lyricist";
import {
  deleteProfileOwned,
  insertProfile,
  insertSample,
  insertSong,
  insertTake,
  pathsForUser,
  profileForUser,
  songForUser,
  songsForUser,
  updateProfile,
  updateSong,
  type ProfileRow,
  type SongRow,
} from "./repo";

export async function voiceSession() {
  const user = await requireUser();
  const supabase = await createServerSupabaseClient();
  const [{ data: auth }, { data: session }] = await Promise.all([supabase.auth.getUser(), supabase.auth.getSession()]);
  const owner = isOwner(auth.user, session.session?.access_token);
  return { user, owner, ownerEmail: isOwnerEmail(user.email) };
}

export function publicProfile(profile: ProfileRow | null) {
  if (!profile) return null;
  return {
    id: profile.id,
    status: profile.status,
    consentAccepted: Boolean(profile.consent_accepted_at),
    livenessPassed: Boolean(profile.liveness_passed_at),
    livenessMethod: profile.liveness_method,
    phrase: profile.liveness_passed_at ? null : profile.liveness_phrase,
    sampleSeconds: profile.sample_seconds,
    hasModel: Boolean(profile.model_url),
    provider: profile.provider,
    training: Boolean(profile.training_prediction_id) && !profile.model_url,
  };
}

export function publicSong(song: SongRow) {
  return {
    id: song.id,
    title: song.title,
    theme: song.theme,
    mood: song.mood,
    genre: song.genre,
    lyrics: song.lyrics,
    status: song.status,
    funding: song.funding,
    takesAllowed: song.takes_allowed,
    takesUsed: song.takes_used,
    watermarked: song.watermarked,
    providerMusic: song.provider_music,
    providerVoice: song.provider_voice,
    error: song.error_message,
    hasAudio: Boolean(song.output_path),
    createdAt: song.created_at,
  };
}

function extFromMime(mime: string): string {
  if (mime.includes("wav")) return "wav";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("mp4") || mime.includes("m4a")) return "m4a";
  return "webm";
}

export async function ensureProfile(userId: string): Promise<ProfileRow> {
  return (await profileForUser(userId)) ?? (await insertProfile(userId));
}

export async function beginSample(input: {
  userId: string;
  mime: string;
  bytes: number;
  durationSeconds: number;
  peak?: number;
  rms?: number;
}) {
  const report = assessSample({ durationSeconds: input.durationSeconds, peak: input.peak, rms: input.rms, kind: "training" });
  if (!report.ok) throw new HttpError(400, "sample_quality", report.errors.join(" "));
  if (input.bytes > 80 * 1024 * 1024) throw new HttpError(400, "too_large", "Keep the sample under 80 MB.");
  const profile = await ensureProfile(input.userId);
  const path = voiceSamplePath(input.userId, profile.id, extFromMime(input.mime));
  const upload = await createVoiceUpload(path);
  return { profileId: profile.id, upload, warnings: report.warnings };
}

export async function finishSample(input: {
  userId: string;
  path: string;
  mime: string;
  bytes: number;
  durationSeconds: number;
  peak?: number;
  rms?: number;
}) {
  if (!pathBelongsToUser(input.userId, input.path)) throw new HttpError(403, "forbidden", "That file is not on your account.");
  if (!(await voiceObjectExists(input.path))) throw new HttpError(400, "missing_audio", "The upload did not arrive. Record again.");
  const profile = await ensureProfile(input.userId);
  await insertSample({
    profile_id: profile.id,
    user_id: input.userId,
    kind: "training",
    storage_path: input.path,
    mime_type: input.mime,
    bytes: input.bytes,
    duration_seconds: input.durationSeconds,
  });
  return updateProfile(profile.id, input.userId, {
    status: profile.consent_accepted_at ? profile.status : "sample_ready",
    sample_path: input.path,
    sample_seconds: input.durationSeconds,
    sample_mime: input.mime,
    quality: { peak: input.peak ?? null, rms: input.rms ?? null },
    model_url: null,
    training_prediction_id: null,
    provider: null,
  });
}

export async function acceptConsent(userId: string) {
  const profile = await ensureProfile(userId);
  if (!profile.sample_path) throw new HttpError(400, "need_sample", "Record a voice sample before you sign the consent.");
  const phrase = profile.liveness_phrase ?? newLivenessPhrase();
  return updateProfile(profile.id, userId, {
    status: "consent_signed",
    consent_version: VOICE_CONSENT_VERSION,
    consent_hash: consentHash(),
    consent_accepted_at: new Date().toISOString(),
    liveness_phrase: phrase,
  });
}

export async function beginLiveness(input: { userId: string; mime: string; bytes: number; durationSeconds: number }) {
  const report = assessSample({ durationSeconds: input.durationSeconds, kind: "liveness" });
  if (!report.ok) throw new HttpError(400, "sample_quality", report.errors.join(" "));
  const profile = await ensureProfile(input.userId);
  if (!profile.consent_accepted_at) throw new HttpError(400, "need_consent", "Accept the voice consent first.");
  const phrase = profile.liveness_phrase ?? newLivenessPhrase();
  if (!profile.liveness_phrase) await updateProfile(profile.id, input.userId, { liveness_phrase: phrase });
  const path = voiceLivenessPath(input.userId, profile.id, extFromMime(input.mime));
  const upload = await createVoiceUpload(path);
  return { phrase, upload };
}

export async function finishLiveness(input: { userId: string; path: string; mime: string; bytes: number; durationSeconds: number }) {
  if (!pathBelongsToUser(input.userId, input.path)) throw new HttpError(403, "forbidden", "That file is not on your account.");
  const profile = await ensureProfile(input.userId);
  if (!profile.liveness_phrase) throw new HttpError(400, "need_phrase", "Start the read-aloud step again.");
  if (!(await voiceObjectExists(input.path))) throw new HttpError(400, "missing_audio", "The phrase recording did not arrive.");
  const providers = voiceProviderStatus();
  let method = "whisper_phrase";
  if (providers.speech) {
    const audio = await downloadVoiceObject(input.path);
    const heard = await transcribeClip(audio, input.mime);
    if (!phraseMatches(profile.liveness_phrase, heard)) {
      throw new HttpError(400, "phrase_mismatch", "That recording did not match the phrase on screen. Read it again, in your own voice.");
    }
  } else if (providers.mock) {
    method = "mock_duration";
  } else {
    throw new HttpError(503, "not_configured", "The read-aloud check needs TRANSCRIPTION_API_KEY, or turn on VOICE_SONGS_MOCK for a preview.");
  }
  await insertSample({
    profile_id: profile.id,
    user_id: input.userId,
    kind: "liveness",
    storage_path: input.path,
    mime_type: input.mime,
    bytes: input.bytes,
    duration_seconds: input.durationSeconds,
  });
  return updateProfile(profile.id, input.userId, {
    status: "liveness_passed",
    liveness_passed_at: new Date().toISOString(),
    liveness_method: method,
  });
}

export async function suggestLyrics(input: { theme: string; mood: string; genre: string; draft: string; note: string }) {
  const screened = screenFields({ theme: input.theme, mood: input.mood, genre: input.genre, draft: input.draft, note: input.note });
  if (!screened.ok) throw new HttpError(400, "impersonation", screened.reason);
  try {
    return await writeLyrics(input);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cixy could not write that.";
    if (/not configured/i.test(message)) throw new HttpError(503, "not_configured", message);
    if (/artist|imitat/i.test(message)) throw new HttpError(400, "impersonation", message);
    throw new HttpError(502, "cixy_failed", message);
  }
}

export async function saveSongDraft(input: {
  userId: string;
  owner: boolean;
  songId?: string | null;
  title: string;
  theme: string;
  mood: string;
  genre: string;
  lyrics: string;
}) {
  const screened = screenFields({
    title: input.title,
    theme: input.theme,
    mood: input.mood,
    genre: input.genre,
    lyrics: input.lyrics,
  });
  if (!screened.ok) throw new HttpError(400, "impersonation", screened.reason);
  if (input.lyrics.trim().length < 8) throw new HttpError(400, "lyrics", "Add a few lines of your own lyric first.");
  const profile = await ensureProfile(input.userId);
  if (input.songId) {
    const existing = await songForUser(input.songId, input.userId);
    if (!existing) throw new HttpError(404, "not_found", "That song is not on your account.");
    return updateSong(existing.id, input.userId, {
      title: input.title.trim() || "Untitled",
      theme: input.theme,
      mood: input.mood,
      genre: input.genre,
      lyrics: input.lyrics.trim(),
    });
  }
  return insertSong({
    user_id: input.userId,
    profile_id: profile.id,
    title: input.title.trim() || "Untitled",
    theme: input.theme,
    mood: input.mood,
    genre: input.genre,
    lyrics: input.lyrics.trim(),
    funding: input.owner ? "owner_bypass" : "unpaid",
  });
}

function jobState(profile: ProfileRow, song: SongRow, owner: boolean): VoiceJobState {
  return {
    owner,
    funding: song.funding,
    hasSample: Boolean(profile.sample_path),
    consent: Boolean(profile.consent_accepted_at),
    liveness: Boolean(profile.liveness_passed_at),
    modelUrl: profile.model_url,
    trainingStatus: profile.model_url ? "succeeded" : profile.training_prediction_id ? "running" : "none",
    guideReady: Boolean(song.guide_path),
    voiceStatus: song.output_path ? "succeeded" : song.voice_prediction_id ? "running" : "none",
    outputReady: Boolean(song.output_path),
  };
}

async function fetchRemote(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not download generated audio (${response.status}).`);
  return Buffer.from(await response.arrayBuffer());
}

export async function advanceSong(input: { userId: string; owner: boolean; songId: string }): Promise<SongRow> {
  const profile = await profileForUser(input.userId);
  const song = await songForUser(input.songId, input.userId);
  if (!profile || !song) throw new HttpError(404, "not_found", "Record your voice and save a lyric first.");
  if (!mayGenerate({ owner: input.owner, funding: song.funding })) {
    return updateSong(song.id, input.userId, { status: "payment_required", error_message: null });
  }
  if (song.output_path && song.status === "ready") return song;
  if (song.takes_used >= (song.takes_allowed || TAKES_INCLUDED) && song.output_path) {
    throw new HttpError(402, "take_limit", "This song already has its included takes. An extra take is 100 Ixis.");
  }

  const providers = voiceProviderStatus();
  const stemsDone = Boolean(song.stems_path) || song.stems_path === "skipped";
  const step = nextVoiceStep(jobState(profile, song, input.owner), providers, stemsDone);

  try {
    if (step.step === "payment_required") {
      return updateSong(song.id, input.userId, { status: "payment_required" });
    }
    if (step.step === "need_sample" || step.step === "need_consent" || step.step === "need_liveness") {
      throw new HttpError(400, step.step, "Finish the voice sample, consent, and read-aloud phrase before generating.");
    }
    if (step.step === "not_configured") {
      return updateSong(song.id, input.userId, {
        status: "not_configured",
        error_message: `Not configured. Missing ${step.missing.join(", ")}.`,
      });
    }
    if (step.step === "mock_render") {
      const path = "mock";
      const takeNumber = song.takes_used + 1;
      await insertTake({
        song_id: song.id,
        user_id: input.userId,
        take_number: takeNumber,
        status: "ready",
        storage_path: path,
        mime_type: "audio/wav",
        watermarked: true,
        provider_music: "mock",
        provider_voice: "mock",
      });
      return updateSong(song.id, input.userId, {
        status: "ready",
        funding: input.owner ? "owner_bypass" : song.funding,
        output_path: path,
        output_mime: "audio/wav",
        provider_music: "mock",
        provider_voice: "mock",
        watermarked: true,
        takes_used: takeNumber,
        error_message: null,
      });
    }
    if (step.step === "start_training") {
      if (!profile.sample_path) throw new HttpError(400, "need_sample", "Record a sample first.");
      const sample = await downloadVoiceObject(profile.sample_path);
      const zip = await sampleToDatasetZip(sample, profile.sample_mime?.split("/").pop() || "webm");
      const zipPath = voiceObjectPath(input.userId, "model", "dataset.zip");
      await uploadVoiceObject(zipPath, zip, "application/zip");
      const prediction = await startRvcTraining(await voiceSignedUrl(zipPath, 60 * 60 * 6));
      await updateProfile(profile.id, input.userId, {
        status: "training",
        training_prediction_id: prediction.id,
        provider: "replicate",
      });
      return updateSong(song.id, input.userId, { status: "training", error_message: null, provider_voice: "replicate" });
    }
    if (step.step === "wait_training") {
      const prediction = await replicateGet(profile.training_prediction_id || "");
      if (prediction.status === "succeeded") {
        const modelUrl = outputUrl(prediction.output);
        if (!modelUrl) throw new Error("Training finished without a model file.");
        await updateProfile(profile.id, input.userId, { status: "ready", model_url: modelUrl, provider: "replicate" });
        return updateSong(song.id, input.userId, { status: "composing", error_message: null });
      }
      if (prediction.status === "failed" || prediction.status === "canceled") {
        await updateProfile(profile.id, input.userId, { training_prediction_id: null, status: "failed" });
        throw new Error(typeof prediction.error === "string" ? prediction.error : "Voice training failed.");
      }
      return updateSong(song.id, input.userId, { status: "training" });
    }
    if (step.step === "compose") {
      const music = await composeMusic({ lyrics: song.lyrics, genre: song.genre || "pop", mood: song.mood || "warm" });
      const guidePath = voiceObjectPath(input.userId, song.id, "guide.mp3");
      await uploadVoiceObject(guidePath, music.audio, music.mime);
      return updateSong(song.id, input.userId, {
        status: "separating",
        guide_path: guidePath,
        provider_music: "elevenlabs",
        error_message: null,
      });
    }
    if (step.step === "separate") {
      try {
        const guide = await downloadVoiceObject(song.guide_path || "");
        const zip = await separateStems(guide);
        const stemsPath = voiceObjectPath(input.userId, song.id, "stems.zip");
        await uploadVoiceObject(stemsPath, zip, "application/zip");
        return updateSong(song.id, input.userId, { status: "converting", stems_path: stemsPath });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Stem split failed";
        return updateSong(song.id, input.userId, { status: "converting", stems_path: "skipped", error_message: message.slice(0, 240) });
      }
    }
    if (step.step === "wait_convert") {
      if (song.provider_voice === "kits") {
        return updateSong(song.id, input.userId, { status: "failed", error_message: "Kits did not return audio. Check KITS_MODEL_ID." });
      }
      const prediction = await replicateGet(song.voice_prediction_id || "");
      if (prediction.status === "succeeded") {
        const url = outputUrl(prediction.output);
        if (!url) throw new Error("Voice conversion finished without audio.");
        const audio = await fetchRemote(url);
        const outputPath = voiceObjectPath(input.userId, song.id, `take-${song.takes_used + 1}.mp3`);
        await uploadVoiceObject(outputPath, audio, "audio/mpeg");
        const takeNumber = song.takes_used + 1;
        await insertTake({
          song_id: song.id,
          user_id: input.userId,
          take_number: takeNumber,
          status: "ready",
          storage_path: outputPath,
          mime_type: "audio/mpeg",
          watermarked: true,
          provider_music: "elevenlabs",
          provider_voice: "replicate",
        });
        return updateSong(song.id, input.userId, {
          status: "ready",
          output_path: outputPath,
          output_mime: "audio/mpeg",
          takes_used: takeNumber,
          voice_prediction_id: null,
          error_message: null,
          watermarked: true,
        });
      }
      if (prediction.status === "failed" || prediction.status === "canceled") {
        throw new Error(typeof prediction.error === "string" ? prediction.error : "Voice conversion failed.");
      }
      return updateSong(song.id, input.userId, { status: "converting" });
    }
    if (step.step === "start_convert") {
      const guideUrl = await voiceSignedUrl(song.guide_path || "", 60 * 60 * 2);
      if (providers.replicate && profile.model_url) {
        const prediction = await startRvcConvert(guideUrl, profile.model_url);
        return updateSong(song.id, input.userId, {
          status: "converting",
          voice_prediction_id: prediction.id,
          provider_voice: "replicate",
        });
      }
      if (providers.kits && kitsConfigured()) {
        const converted = await kitsConvert(guideUrl);
        if (!converted.audioUrl) {
          throw new Error("Kits did not return audio. Confirm KITS_MODEL_ID is a model trained on your own voice.");
        }
        const audio = await fetchRemote(converted.audioUrl);
        const outputPath = voiceObjectPath(input.userId, song.id, `take-${song.takes_used + 1}.mp3`);
        await uploadVoiceObject(outputPath, audio, "audio/mpeg");
        const takeNumber = song.takes_used + 1;
        await insertTake({
          song_id: song.id,
          user_id: input.userId,
          take_number: takeNumber,
          status: "ready",
          storage_path: outputPath,
          mime_type: "audio/mpeg",
          watermarked: true,
          provider_music: "elevenlabs",
          provider_voice: "kits",
        });
        return updateSong(song.id, input.userId, {
          status: "ready",
          output_path: outputPath,
          output_mime: "audio/mpeg",
          provider_voice: "kits",
          takes_used: takeNumber,
          watermarked: true,
        });
      }
      return updateSong(song.id, input.userId, {
        status: "not_configured",
        error_message: "Not configured. Missing REPLICATE_API_TOKEN (or KITS_API_KEY and KITS_MODEL_ID).",
      });
    }
    return song;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    const message = error instanceof Error ? error.message : "Generation failed.";
    await updateSong(song.id, input.userId, { status: "failed", error_message: message.slice(0, 400) }).catch(() => undefined);
    throw new HttpError(502, "generate_failed", message);
  }
}

export async function eraseVoice(userId: string) {
  const paths = await pathsForUser(userId);
  await removeVoiceObjects(paths);
  await deleteProfileOwned(userId);
}

export async function loadSongAudio(userId: string, songId: string): Promise<{ body: Buffer; mime: string; filename: string }> {
  const song = await songForUser(songId, userId);
  if (!song?.output_path) throw new HttpError(404, "not_found", "This song has no audio yet.");
  const filename = `${(song.title || "voice-song").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "voice-song"}.preview`;
  if (song.output_path === "mock") {
    return { body: toneWav(8), mime: "audio/wav", filename: `${filename}.wav` };
  }
  const body = await downloadVoiceObject(song.output_path);
  return { body, mime: song.output_mime || "audio/mpeg", filename: `${filename}.mp3` };
}

export async function studioSnapshot(userId: string) {
  const [profile, songs] = await Promise.all([profileForUser(userId), songsForUser(userId)]);
  return { profile: publicProfile(profile), songs: songs.map(publicSong) };
}
