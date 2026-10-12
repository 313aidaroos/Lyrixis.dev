import { SAMPLE_MAX_SECONDS, SAMPLE_MIN_SECONDS } from "./pricing";

export type QualityReport = {
  seconds: number;
  peak: number;
  rms: number;
  clippingRatio: number;
  ok: boolean;
  notes: string[];
};

export function assessQuality(input: {
  seconds: number;
  peak: number;
  rms: number;
  clippingRatio: number;
  bytes: number;
  demo: boolean;
}): QualityReport {
  const notes: string[] = [];
  const seconds = Number.isFinite(input.seconds) ? input.seconds : 0;
  const peak = Number.isFinite(input.peak) ? input.peak : 0;
  const rms = Number.isFinite(input.rms) ? input.rms : 0;
  const clipping = Number.isFinite(input.clippingRatio) ? input.clippingRatio : 0;

  if (input.demo && input.bytes > 1000 && seconds >= 1 && seconds <= 30) {
    notes.push("Demo sample stands in for a 3–5 minute recording. A real sample is required outside demo.");
    return { seconds, peak: peak || 0.4, rms: rms || 0.08, clippingRatio: clipping, ok: true, notes };
  }

  if (seconds < SAMPLE_MIN_SECONDS) notes.push(`Sample is ${Math.round(seconds)}s. Record 3 to 5 minutes.`);
  if (seconds > SAMPLE_MAX_SECONDS) notes.push(`Sample is ${Math.round(seconds)}s. Keep it under 5 minutes.`);
  if (peak >= 0.99 || clipping > 0.02) notes.push("The recording is clipping. Move back from the mic and try again.");
  if (rms > 0 && rms < 0.01) notes.push("The recording is very quiet. Speak and sing closer to the mic.");
  if (rms > 0.45) notes.push("The recording is too hot. Lower the input level.");
  const minBytes = Math.max(8_000, Math.floor(seconds * 1500));
  if (input.bytes < minBytes) notes.push("The file is too small for that length. Record again without heavy silence.");

  return { seconds, peak, rms, clippingRatio: clipping, ok: notes.length === 0, notes };
}

/** 16-bit PCM WAV. Used for demo previews and for a short liveness stand-in. */
export function encodeWav(samples: Float32Array, sampleRate: number): Buffer {
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i] ?? 0));
    buffer.writeInt16LE(clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, 44 + i * 2);
  }
  return buffer;
}

/** Short original preview: a simple major arpeggio plus a quiet watermark tick. */
export function demoPreviewWav(seed = 1): Buffer {
  const sampleRate = 22050;
  const seconds = 8;
  const length = sampleRate * seconds;
  const samples = new Float32Array(length);
  const notes = [261.63, 329.63, 392.0, 523.25, 392.0, 329.63];
  for (let i = 0; i < length; i += 1) {
    const t = i / sampleRate;
    const note = notes[Math.floor(t * 2) % notes.length] ?? 440;
    const env = Math.min(1, (i % Math.floor(sampleRate / 2)) / 800) * (1 - (i % Math.floor(sampleRate / 2)) / (sampleRate / 2));
    const voice = 0.22 * Math.sin(2 * Math.PI * note * t + seed);
    const pad = 0.06 * Math.sin(2 * Math.PI * (note / 2) * t);
    const tick = i % sampleRate < 180 && Math.floor(t) % 2 === 0 ? 0.04 * Math.sin(2 * Math.PI * 1800 * t) : 0;
    samples[i] = (voice + pad + tick) * (0.35 + 0.65 * Math.max(0, env));
  }
  return encodeWav(samples, sampleRate);
}

/** Uncompressed ZIP (store method) so training can pack one wav without a zip library. */
export function zipStore(files: { name: string; data: Buffer }[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(file.name.replace(/\\/g, "/"), "utf8");
    const crc = crc32(file.data);
    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(file.data.length, 18);
    local.writeUInt32LE(file.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    name.copy(local, 30);
    locals.push(local, file.data);

    const central = Buffer.alloc(46 + name.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(file.data.length, 20);
    central.writeUInt32LE(file.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    name.copy(central, 46);
    centrals.push(central);
    offset += local.length + file.data.length;
  }
  const centralBuf = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...locals, centralBuf, end]);
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) {
    crc = CRC_TABLE[(crc ^ data[i]!) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function livenessScore(phrase: string, transcript: string): number {
  const expected = phrase.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean);
  const heard = new Set(transcript.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean));
  if (expected.length === 0) return 0;
  const hits = expected.filter((word) => heard.has(word)).length;
  return hits / expected.length;
}

export const LIVENESS_PASS = 0.72;

export const LIVENESS_PHRASES = [
  "I consent to Lyrixis using only my own voice for songs I create.",
  "This is my voice and nobody else may clone it on Lyrixis.",
  "I am reading this phrase so Lyrixis can match my live voice.",
  "My voice model stays private to my Apixis ID and I can delete it.",
  "I will not ask Lyrixis to copy another singer or a famous voice.",
];

export function pickPhrase(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 33 + seed.charCodeAt(i)) >>> 0;
  return LIVENESS_PHRASES[hash % LIVENESS_PHRASES.length] ?? LIVENESS_PHRASES[0]!;
}
