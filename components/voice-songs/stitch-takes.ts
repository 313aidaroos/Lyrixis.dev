import { encodeMonoWav } from "@/lib/voice-songs/wav-pcm";

/** Decode each line take and join them into one WAV the sample upload already accepts. */
export async function stitchTakes(blobs: Blob[]): Promise<Blob> {
  if (blobs.length === 0) throw new Error("Record the script lines before saving.");
  const ctx = new AudioContext();
  try {
    const buffers: AudioBuffer[] = [];
    for (const blob of blobs) {
      const copy = (await blob.arrayBuffer()).slice(0);
      buffers.push(await ctx.decodeAudioData(copy));
    }
    const rate = buffers[0]?.sampleRate ?? 48000;
    const length = buffers.reduce((sum, buffer) => sum + Math.max(1, Math.round(buffer.duration * rate)), 0);
    const mixed = new Float32Array(length);
    let offset = 0;
    for (const buffer of buffers) {
      const channel = buffer.getChannelData(0);
      const scaled = Math.max(1, Math.round(buffer.duration * rate));
      if (buffer.sampleRate === rate && channel.length === scaled) {
        mixed.set(channel, offset);
      } else {
        for (let i = 0; i < scaled; i += 1) {
          const src = Math.min(channel.length - 1, Math.floor((i / scaled) * channel.length));
          mixed[offset + i] = channel[src] ?? 0;
        }
      }
      offset += scaled;
    }
    const wav = encodeMonoWav(mixed.subarray(0, offset), rate);
    const copy = new ArrayBuffer(wav.byteLength);
    new Uint8Array(copy).set(wav);
    return new Blob([copy], { type: "audio/wav" });
  } finally {
    await ctx.close();
  }
}
