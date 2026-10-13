import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { consentHash } from "./consent";
import { voiceProviderStatus } from "./config";
import { phraseMatches, phraseMatchScore } from "./liveness";
import { assessSample } from "./quality";
import {
  ALL_ACCESS_RELEASES_PER_MONTH,
  ALL_ACCESS_VOICE_SONGS_PER_MONTH,
  ROYALTY_LYRIXIS_BPS,
  ROYALTY_USER_BPS,
  VOICE_RELEASE_IXIS,
  VOICE_RELEASE_SKU,
  VOICE_SETUP_IXIS,
  VOICE_SETUP_SKU,
  VOICE_SONG_IXIS,
  VOICE_SONG_SKU,
  VOICE_TAKE_IXIS,
  VOICE_TAKE_SKU,
  allAccessCovers,
  mayGenerate,
  mayRelease,
} from "./pricing";
import { screenArtistName, screenVoiceText } from "./safety";
import { nextVoiceStep, type VoiceJobState } from "./steps";
import { isWav, toneWav } from "./wav";
import { unzip, zipStore } from "./zip";

const ready: VoiceJobState = {
  owner: false,
  funding: "wallet",
  hasSample: true,
  consent: true,
  liveness: true,
  modelUrl: null,
  trainingStatus: "none",
  guideReady: false,
  voiceStatus: "none",
  outputReady: false,
};

const none = voiceProviderStatus({});
const live = voiceProviderStatus({
  ELEVENLABS_API_KEY: "present",
  REPLICATE_API_TOKEN: "present",
  TRANSCRIPTION_API_KEY: "present",
});

describe("voice song prices", () => {
  it("locks the plan prices and the 90/10 royalty split", () => {
    expect(VOICE_SETUP_IXIS).toBe(500);
    expect(VOICE_SONG_IXIS).toBe(600);
    expect(VOICE_TAKE_IXIS).toBe(100);
    expect(VOICE_RELEASE_IXIS).toBe(900);
    expect(VOICE_SETUP_SKU).toBe("lyrixis.voice.setup");
    expect(VOICE_SONG_SKU).toBe("lyrixis.voice.song");
    expect(VOICE_TAKE_SKU).toBe("lyrixis.voice.take");
    expect(VOICE_RELEASE_SKU).toBe("lyrixis.voice.release");
    expect(ROYALTY_USER_BPS).toBe(9000);
    expect(ROYALTY_LYRIXIS_BPS).toBe(1000);
    expect(ALL_ACCESS_VOICE_SONGS_PER_MONTH).toBe(4);
    expect(ALL_ACCESS_RELEASES_PER_MONTH).toBe(1);
  });

  it("lets the owner skip payment and requires funding for everyone else", () => {
    expect(mayGenerate({ owner: true, funding: "unpaid" })).toBe(true);
    expect(mayGenerate({ owner: false, funding: "unpaid" })).toBe(false);
    expect(mayGenerate({ owner: false, funding: "wallet" })).toBe(true);
    expect(mayGenerate({ owner: false, funding: "card" })).toBe(true);
    expect(mayRelease({ owner: true, funding: "unpaid", releasesThisMonth: 1 })).toBe(true);
    expect(mayRelease({ owner: false, funding: "unpaid", releasesThisMonth: 0 })).toBe(false);
    expect(mayRelease({ owner: true, funding: "owner_bypass", releasesThisMonth: 4 })).toBe(false);
  });

  it("counts All-Access allowances", () => {
    expect(allAccessCovers({ hasAllAccess: true, kind: "song", setupsThisMonth: 0, songsThisMonth: 3, releasesThisMonth: 0 })).toBe(true);
    expect(allAccessCovers({ hasAllAccess: true, kind: "song", setupsThisMonth: 0, songsThisMonth: 4, releasesThisMonth: 0 })).toBe(false);
    expect(allAccessCovers({ hasAllAccess: false, kind: "setup", setupsThisMonth: 0, songsThisMonth: 0, releasesThisMonth: 0 })).toBe(false);
    expect(allAccessCovers({ hasAllAccess: true, kind: "release", setupsThisMonth: 1, songsThisMonth: 0, releasesThisMonth: 0 })).toBe(true);
  });
});

describe("own voice only", () => {
  it("blocks artist imitation and allows an ordinary lyric", () => {
    expect(screenVoiceText("sing this like Taylor Swift").ok).toBe(false);
    expect(screenVoiceText("in the style of Drake").ok).toBe(false);
    expect(screenVoiceText("a clone of Beyoncé").ok).toBe(false);
    expect(screenVoiceText("the pink sky over the bay").ok).toBe(true);
    expect(screenVoiceText("I called you twice from the station").ok).toBe(true);
    expect(screenArtistName("Drake").ok).toBe(false);
    expect(screenArtistName("Awad Alaidaroos").ok).toBe(true);
  });
});

describe("liveness and sample quality", () => {
  it("accepts a transcript that contains the phrase", () => {
    const phrase = "My voice is my own and I am recording it for my song.";
    expect(phraseMatches(phrase, "um my voice is my own and I am recording it for my song")).toBe(true);
    expect(phraseMatches(phrase, "hello there")).toBe(false);
    expect(phraseMatchScore(phrase, phrase)).toBe(1);
  });

  it("rejects a tiny sample and warns under 90 seconds", () => {
    expect(assessSample({ durationSeconds: 5, kind: "training" }).ok).toBe(false);
    const short = assessSample({ durationSeconds: 40, peak: 0.4, rms: 0.1, kind: "training" });
    expect(short.ok).toBe(true);
    expect(short.warnings.join(" ")).toMatch(/90 seconds/);
    expect(assessSample({ durationSeconds: 3, kind: "liveness" }).ok).toBe(true);
  });
});

describe("generation steps", () => {
  it("stops when keys are missing and walks the live pipeline", () => {
    expect(nextVoiceStep({ ...ready, owner: false, funding: "unpaid" }, none).step).toBe("payment_required");
    expect(nextVoiceStep({ ...ready, owner: true, funding: "unpaid" }, none).step).toBe("not_configured");
    expect(nextVoiceStep({ ...ready, hasSample: false, owner: true }, live).step).toBe("need_sample");
    expect(nextVoiceStep({ ...ready, consent: false, owner: true }, live).step).toBe("need_consent");
    expect(nextVoiceStep({ ...ready, liveness: false, owner: true }, live).step).toBe("need_liveness");
    expect(nextVoiceStep({ ...ready, owner: true }, live).step).toBe("start_training");
    expect(nextVoiceStep({ ...ready, owner: true, trainingStatus: "running" }, live).step).toBe("wait_training");
    expect(nextVoiceStep({ ...ready, owner: true, modelUrl: "https://example.com/own.zip" }, live).step).toBe("compose");
    expect(nextVoiceStep({ ...ready, owner: true, modelUrl: "https://example.com/own.zip", guideReady: true }, live, true).step).toBe("start_convert");
    const mock = voiceProviderStatus({ VOICE_SONGS_MOCK: "1" });
    expect(nextVoiceStep({ ...ready, owner: true, funding: "unpaid" }, mock).step).toBe("mock_render");
    expect(none.missing).toEqual(["ELEVENLABS_API_KEY", "REPLICATE_API_TOKEN"]);
  });
});

describe("audio helpers", () => {
  it("writes a wav and a zip that round-trips", () => {
    const wav = toneWav(1);
    expect(isWav(wav)).toBe(true);
    const zipped = zipStore([{ name: "dataset/ownvoice/split_000.wav", data: wav }]);
    const files = unzip(zipped);
    expect(files).toHaveLength(1);
    expect(files[0].name).toContain("ownvoice");
    expect(isWav(files[0].data)).toBe(true);
    expect(consentHash()).toHaveLength(8);
  });
});

describe("voice song studio source", () => {
  const root = path.resolve(__dirname, "../..");
  it("records with MediaRecorder and uses the Lyrixis nav", () => {
    const recorder = readFileSync(path.join(root, "components/voice-songs/RecordPanel.tsx"), "utf8");
    expect(recorder).toContain("new MediaRecorder");
    const studio = readFileSync(path.join(root, "components/voice-songs/VoiceStudio.tsx"), "utf8");
    expect(studio).toContain("SiteNav");
    expect(studio).toContain("font-marquee");
    expect(studio).toContain("Sign in with Apixis ID");
    const sql = readFileSync(path.join(root, "database/migrations/0007_voice_songs.sql"), "utf8");
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("voice-songs-private");
    expect(sql).toContain("user_id = public.current_app_user_id()");
    expect(sql).not.toMatch(/for insert/i);
  });
});
