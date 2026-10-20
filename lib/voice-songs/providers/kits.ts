/**
 * Optional quality fallback. Used only when REPLICATE_API_TOKEN is absent and KITS_API_KEY is set.
 * Kits trains against a model id you created in their dashboard from the user's sample (KITS_MODEL_ID).
 * This adapter never picks a stock celebrity voice.
 */

const BASE = (process.env.KITS_API_BASE ?? "https://api.kits.ai").replace(/\/$/, "");

export function kitsConfigured(): boolean {
  return Boolean(process.env.KITS_API_KEY?.trim() && process.env.KITS_MODEL_ID?.trim());
}

export async function kitsConvert(audioUrl: string): Promise<{ id: string; audioUrl?: string }> {
  const apiKey = process.env.KITS_API_KEY?.trim();
  const modelId = process.env.KITS_MODEL_ID?.trim();
  if (!apiKey || !modelId) throw new Error("KITS_API_KEY and KITS_MODEL_ID are not set.");
  const response = await fetch(`${BASE}/v1/voice-conversions`, {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ voiceModelId: modelId, audioUrl, format: "mp3" }),
  });
  const json = (await response.json().catch(() => ({}))) as { id?: string; audioUrl?: string; url?: string; error?: string; message?: string };
  if (!response.ok) {
    throw new Error(json.error || json.message || `Kits conversion failed (${response.status}).`);
  }
  return { id: json.id ?? "kits", audioUrl: json.audioUrl ?? json.url };
}
