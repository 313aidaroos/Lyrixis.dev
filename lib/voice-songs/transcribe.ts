const BASE = (process.env.TRANSCRIPTION_API_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");

export async function transcribeClip(audio: Buffer, mime: string): Promise<string> {
  const apiKey = process.env.TRANSCRIPTION_API_KEY?.trim();
  if (!apiKey) throw new Error("TRANSCRIPTION_API_KEY is not set.");
  const form = new FormData();
  const ext = mime.includes("wav") ? "wav" : mime.includes("mpeg") ? "mp3" : "webm";
  form.append("file", new Blob([new Uint8Array(audio)], { type: mime || "audio/webm" }), `phrase.${ext}`);
  form.append("model", process.env.TRANSCRIPTION_MODEL?.trim() || "whisper-1");
  form.append("response_format", "json");
  const response = await fetch(`${BASE}/audio/transcriptions`, {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}` },
    body: form,
  });
  const json = (await response.json().catch(() => ({}))) as { text?: string; error?: { message?: string } };
  if (!response.ok) throw new Error(json.error?.message || `Speech check failed (${response.status}).`);
  return (json.text ?? "").trim();
}
