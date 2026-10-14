// Lyrics run inside the Vercel function that accepted the upload. ffmpeg-static normalizes
// the audio and Whisper transcribes it. There is no Redis queue and no Railway worker.
// next/server is imported lazily so this module stays importable from tests and services.

/**
 * Vercel Hobby with Fluid compute allows functions up to 300 s (Pro: 800 s). The project is on
 * Hobby (checked 2026-10-05), so every route that runs the pipeline exports maxDuration = 300.
 * Route files must export the literal number; keep them in sync with this constant.
 */
export const PROCESSING_MAX_DURATION_SECONDS = 300;

/** No status change for this long while "active" means the function was killed mid-run. */
export const STUCK_AFTER_MS = (PROCESSING_MAX_DURATION_SECONDS + 90) * 1000;

export const ACTIVE_STATUSES = new Set(["queued", "processing", "transcribing", "aligning", "analyzing"]);

export const STUCK_MESSAGE = "Processing stopped before it finished (time limit). Press Retry to run it again.";

export type ProcessingMode = "inline";

export function processingMode(): ProcessingMode {
  return "inline";
}

export function isStuck(track: { status: string; updated_at?: string | null }, now = Date.now()): boolean {
  if (!ACTIVE_STATUSES.has(track.status) || !track.updated_at) return false;
  const updated = Date.parse(track.updated_at);
  return Number.isFinite(updated) && now - updated > STUCK_AFTER_MS;
}

/** Statuses from which the owner may press Retry. */
export function canRetry(track: { status: string; updated_at?: string | null; audio_path?: string | null }, now = Date.now()): boolean {
  if (!track.audio_path) return false;
  if (track.status === "failed") return true;
  if (track.status === "uploaded") {
    // Finalize normally moves a row out of "uploaded" within a second; only offer Retry if it never did.
    const updated = track.updated_at ? Date.parse(track.updated_at) : Number.NaN;
    return Number.isFinite(updated) && now - updated > 120_000;
  }
  return isStuck(track, now);
}

/**
 * Start processing for a track whose audio is already in Storage. Returns the job id recorded in
 * processing_jobs.queue_job_id ("inline" for Option B). Must be called inside a request.
 */
export async function startTrackProcessing(trackId: string): Promise<string> {
  const { after } = await import("next/server");
  after(async () => {
    try {
      const { processTrack } = await import("@/workers/pipeline");
      await processTrack(trackId);
      console.log(`[lyrixis] processed ${trackId}`);
    } catch (error) {
      // processTrack already set tracks.status = failed with the message.
      console.error(`[lyrixis] processing failed for ${trackId}:`, error instanceof Error ? error.message : error);
    }
  });
  return "inline";
}
