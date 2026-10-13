import { describe, expect, it } from "vitest";
import { encodeMonoWav } from "./wav-pcm";
import {
  CONSENT_LINE,
  RECORDING_SCRIPT,
  RETAKE_TIPS,
  cuesForSample,
  scriptProgress,
} from "./recording-script";

describe("voice setup script", () => {
  it("starts with a room check, a mic check, and a consent line read aloud", () => {
    expect(RECORDING_SCRIPT.map((cue) => cue.kind).slice(0, 3)).toEqual(["room", "mic", "consent"]);
    expect(RECORDING_SCRIPT[2]?.text).toBe(CONSENT_LINE);
    expect(CONSENT_LINE).toMatch(/owner of this voice/i);
    expect(CONSENT_LINE).toMatch(/synthetic version of my voice/i);
    expect(RECORDING_SCRIPT.filter((cue) => cue.kind === "speech").length).toBeGreaterThanOrEqual(6);
    expect(RECORDING_SCRIPT.some((cue) => cue.kind === "sing")).toBe(true);
    expect(RECORDING_SCRIPT.every((cue) => cue.pace.length > 10 && cue.seconds > 0)).toBe(true);
    expect(RETAKE_TIPS.length).toBeGreaterThanOrEqual(4);
  });

  it("tracks progress and leaves the silent room check out of the sample", () => {
    const progress = scriptProgress(["room", "mic"]);
    expect(progress.label).toBe("2 of 12");
    expect(progress.complete).toBe(false);
    expect(scriptProgress(RECORDING_SCRIPT.map((cue) => cue.id)).complete).toBe(true);
    expect(cuesForSample().some((cue) => cue.kind === "room")).toBe(false);
    expect(cuesForSample().some((cue) => cue.kind === "consent")).toBe(true);
  });

  it("writes a wav header for stitched line takes", () => {
    const wav = encodeMonoWav(new Float32Array([0, 0.5, -0.5]), 16000);
    const text = Buffer.from(wav.subarray(0, 12)).toString("ascii");
    expect(text.startsWith("RIFF")).toBe(true);
    expect(text.endsWith("WAVE")).toBe(true);
    expect(wav.length).toBe(44 + 6);
  });
});
