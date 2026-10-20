// 2026-10-05 (Grok): Option B — lyrics pipeline inside the Vercel function (no Redis/worker).
import { mkdtemp, readFile, rm, stat } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const afterMock = vi.fn();
vi.mock("next/server", () => ({ after: (fn: () => unknown) => afterMock(fn) }));

let uploadCount = 0;
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => {
      const chain = {
        select: () => chain,
        eq: () => chain,
        gte: async () => ({ count: uploadCount, error: null }),
      };
      return chain;
    },
  }),
}));
vi.mock("@/lib/audit", () => ({ writeAudit: vi.fn(async () => undefined) }));

import { STUCK_AFTER_MS, canRetry, isStuck, processingMode, startTrackProcessing } from "@/lib/processing";
import { WHISPER_MAX_BYTES, compressArgs, runFfmpeg } from "@/lib/ffmpeg";
import { uploadNameFor } from "@/providers/transcription/whisper-v3";
import { UPLOADS_PER_HOUR, prepareDirectUpload } from "@/services/tracks";
import type { AppUser } from "@/types";

const user = { id: "11111111-1111-4111-8111-111111111111", email: "t@example.com" } as AppUser;

describe("processing mode", () => {
  afterEach(() => {
    afterMock.mockReset();
  });

  it("runs inside the Vercel function (after()), with no Redis queue", async () => {
    expect(processingMode()).toBe("inline");
    await expect(startTrackProcessing("t1")).resolves.toBe("inline");
    expect(afterMock).toHaveBeenCalledTimes(1);
  });
});

describe("stuck detection and retry eligibility", () => {
  const now = Date.parse("2026-10-05T12:00:00Z");
  const ago = (ms: number) => new Date(now - ms).toISOString();

  it("flags an active track with no update past the function limit", () => {
    expect(isStuck({ status: "transcribing", updated_at: ago(STUCK_AFTER_MS + 1) }, now)).toBe(true);
    expect(isStuck({ status: "transcribing", updated_at: ago(60_000) }, now)).toBe(false);
    expect(isStuck({ status: "completed", updated_at: ago(STUCK_AFTER_MS * 10) }, now)).toBe(false);
  });

  it("offers Retry for failed, stuck, or never-started tracks only", () => {
    const audio_path = "u/t/original.mp3";
    expect(canRetry({ status: "failed", updated_at: ago(1000), audio_path }, now)).toBe(true);
    expect(canRetry({ status: "processing", updated_at: ago(1000), audio_path }, now)).toBe(false);
    expect(canRetry({ status: "processing", updated_at: ago(STUCK_AFTER_MS + 1), audio_path }, now)).toBe(true);
    expect(canRetry({ status: "uploaded", updated_at: ago(5_000), audio_path }, now)).toBe(false);
    expect(canRetry({ status: "uploaded", updated_at: ago(300_000), audio_path }, now)).toBe(true);
    expect(canRetry({ status: "completed", updated_at: ago(1000), audio_path }, now)).toBe(false);
    expect(canRetry({ status: "failed", updated_at: ago(1000), audio_path: null }, now)).toBe(false);
  });
});

describe("upload rate limit counts rows, not Redis", () => {
  beforeEach(() => {
    delete process.env.REDIS_URL;
  });

  it("rejects the 21st upload in an hour with 429", async () => {
    uploadCount = UPLOADS_PER_HOUR;
    await expect(
      prepareDirectUpload({ user, filename: "a.mp3", mimeType: "audio/mpeg", size: 1000, rightsConfirmed: true })
    ).rejects.toMatchObject({ status: 429 });
  });
});

describe("compressed audio for Whisper", () => {
  it("encodes 16 kHz mono MP3", () => {
    const args = compressArgs("in.wav", "out.mp3");
    expect(args).toEqual(expect.arrayContaining(["-ac", "1", "-ar", "16000", "-c:a", "libmp3lame"]));
    expect(args.at(-1)).toBe("out.mp3");
    expect(WHISPER_MAX_BYTES).toBeLessThan(25 * 1024 * 1024);
  });

  it("sends the real file name and type to the API", () => {
    expect(uploadNameFor("/tmp/x/normalized.mp3")).toEqual({ filename: "audio.mp3", mime: "audio/mpeg" });
    expect(uploadNameFor("/tmp/x/normalized.wav")).toEqual({ filename: "audio.wav", mime: "audio/wav" });
  });

  it("runs the bundled ffmpeg-static binary end to end", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "lyx-ff-"));
    try {
      const wav = path.join(dir, "tone.wav");
      const mp3 = path.join(dir, "tone.mp3");
      await runFfmpeg(["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "sine=frequency=440:duration=3", "-ar", "44100", "-ac", "2", wav]);
      await runFfmpeg(compressArgs(wav, mp3));
      const [w, m] = await Promise.all([stat(wav), stat(mp3)]);
      expect(m.size).toBeGreaterThan(0);
      expect(m.size).toBeLessThan(w.size / 5);
      const head = await readFile(mp3);
      expect(head.subarray(0, 3).toString("latin1") === "ID3" || (head[0] === 0xff && (head[1] & 0xe0) === 0xe0)).toBe(true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);
});

describe("pricing fallback", () => {
  it("calculator default for 100–999 matches the DB (149 Ixis)", async () => {
    const src = await readFile(path.join(process.cwd(), "components/PricingCalculator.tsx"), "utf8");
    expect(src).toMatch(/min_songs: 100, max_songs: 999, rate_ixis: 149\b/);
  });
});
