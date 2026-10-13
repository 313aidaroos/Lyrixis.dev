export type SampleReport = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

const MIN_SECONDS = 20;
const AIM_SECONDS = 90;

/** Browser reports peak and rms in 0..1 from an AnalyserNode. */
export function assessSample(input: { durationSeconds: number; peak?: number; rms?: number; kind?: "training" | "liveness" }): SampleReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const duration = input.durationSeconds;
  const min = input.kind === "liveness" ? 2 : MIN_SECONDS;
  if (!Number.isFinite(duration) || duration < min) {
    errors.push(input.kind === "liveness" ? "Read the phrase for at least 2 seconds." : "Record at least 20 seconds. Three minutes is the aim.");
  }
  if (input.kind !== "liveness" && duration < AIM_SECONDS && duration >= min) {
    warnings.push("Under 90 seconds. A 3 minute sample, talking and singing, trains a steadier voice.");
  }
  if (input.kind !== "liveness" && duration > 8 * 60) {
    errors.push("Keep the sample under 8 minutes.");
  }
  if (typeof input.peak === "number" && input.peak >= 0.98) {
    warnings.push("The microphone clipped. Move back a little and record again if the words distort.");
  }
  if (typeof input.rms === "number" && input.rms > 0 && input.rms < 0.02 && duration >= min) {
    warnings.push("The level is very low. Check the mic is selected and the room is not muted.");
  }
  return { ok: errors.length === 0, errors, warnings };
}
