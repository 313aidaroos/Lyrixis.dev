/** Tiny PCM WAV so mock previews play without an external file. */

export function toneWav(seconds = 8, sampleRate = 22050): Buffer {
  const frames = Math.max(1, Math.floor(seconds * sampleRate));
  const data = Buffer.alloc(frames * 2);
  const notes = [262, 330, 392, 523, 392, 330, 294, 349];
  const beat = Math.floor(sampleRate * 0.45);
  for (let i = 0; i < frames; i += 1) {
    const freq = notes[Math.floor(i / beat) % notes.length];
    const pos = (i % beat) / beat;
    const env = Math.min(1, pos / 0.04) * (1 - Math.max(0, pos - 0.7) / 0.3);
    const sample = Math.sin((2 * Math.PI * freq * i) / sampleRate) * 0.28 * env;
    data.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(sample * 32767))), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

export function isWav(buffer: Buffer): boolean {
  return buffer.length > 44 && buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WAVE";
}
