const BASE = (process.env.ELEVENLABS_API_BASE ?? "https://api.elevenlabs.io").replace(/\/$/, "");

export type MusicChunk = { text: string; durationMs: number; styles: string[] };

function key(): string {
  const value = process.env.ELEVENLABS_API_KEY?.trim();
  if (!value) throw new Error("ELEVENLABS_API_KEY is not set.");
  return value;
}

export function buildChunks(input: { lyrics: string; genre: string; mood: string; totalMs?: number }): MusicChunk[] {
  const blocks = input.lyrics
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
  const parts = blocks.length > 0 ? blocks.slice(0, 6) : [input.lyrics.trim()];
  const total = Math.min(180_000, Math.max(12_000, input.totalMs ?? 75_000));
  const each = Math.min(120_000, Math.max(3_000, Math.floor(total / parts.length)));
  const styles = [input.genre, input.mood, "original song", "studio vocal", "clear lyrics", "no artist impression"].filter(Boolean);
  return parts.map((text) => ({
    text: text.startsWith("[") ? text : `[Section]\n${text}`,
    durationMs: each,
    styles,
  }));
}

export async function composeMusic(input: { lyrics: string; genre: string; mood: string }): Promise<{ audio: Buffer; mime: string }> {
  const chunks = buildChunks(input);
  const response = await fetch(`${BASE}/v1/music?output_format=mp3_44100_128`, {
    method: "POST",
    headers: {
      "xi-api-key": key(),
      "content-type": "application/json",
      accept: "audio/mpeg",
    },
    body: JSON.stringify({
      model_id: process.env.ELEVENLABS_MUSIC_MODEL?.trim() || "music_v2",
      composition_plan: {
        chunks: chunks.map((chunk) => ({
          text: chunk.text,
          duration_ms: chunk.durationMs,
          positive_styles: chunk.styles,
          negative_styles: ["celebrity impression", "famous singer", "cover song", "impersonation"],
        })),
      },
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`ElevenLabs Music failed (${response.status}): ${detail.slice(0, 280)}`);
  }
  const audio = Buffer.from(await response.arrayBuffer());
  if (audio.length < 1000) throw new Error("ElevenLabs Music returned an empty file.");
  return { audio, mime: "audio/mpeg" };
}

export async function separateStems(audio: Buffer, filename = "guide.mp3"): Promise<Buffer> {
  const body = new FormData();
  body.append("file", new Blob([new Uint8Array(audio)], { type: "audio/mpeg" }), filename);
  body.append("sign_with_c2pa", "true");
  const response = await fetch(`${BASE}/v1/music/stem-separation?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": key(), accept: "application/zip" },
    body,
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`ElevenLabs stem separation failed (${response.status}): ${detail.slice(0, 280)}`);
  }
  return Buffer.from(await response.arrayBuffer());
}
