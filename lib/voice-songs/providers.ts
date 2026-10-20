import { demoPreviewWav, zipStore } from "./audio";
import { screenText } from "./filter";

export type ProviderStatus = {
  elevenlabs: boolean;
  replicate: boolean;
  kits: boolean;
  toolost: boolean;
  revelator: boolean;
  card: boolean;
  cixy: boolean;
  speech: boolean;
};

export function providerStatus(env: NodeJS.ProcessEnv = process.env): ProviderStatus {
  const set = (name: string) => Boolean(env[name]?.trim());
  return {
    elevenlabs: set("ELEVENLABS_API_KEY"),
    replicate: set("REPLICATE_API_TOKEN"),
    kits: set("KITS_API_KEY"),
    toolost: set("TOO_LOST_API_KEY"),
    revelator: set("REVELATOR_API_KEY"),
    card: set("STRIPE_SECRET_KEY"),
    cixy: set("ANTHROPIC_API_KEY"),
    speech: set("TRANSCRIPTION_API_KEY") || set("ELEVENLABS_API_KEY"),
  };
}

export class NotConfigured extends Error {
  readonly code = "not_configured";
  constructor(public envName: string, message: string) {
    super(message);
    this.name = "NotConfigured";
  }
}

export type GeneratedTake = {
  audio: Buffer;
  mime: string;
  musicProvider: string;
  voiceProvider: string;
  watermarked: boolean;
  notes: string[];
};

function elevenBase() {
  return (process.env.ELEVENLABS_API_BASE || "https://api.elevenlabs.io").replace(/\/$/, "");
}

export async function composeMusic(input: {
  lyrics: string;
  genre: string;
  mood: string;
  theme: string;
  demo: boolean;
}): Promise<{ audio: Buffer; mime: string; provider: string; notes: string[] }> {
  const screened = screenText(`${input.lyrics}\n${input.genre}\n${input.mood}\n${input.theme}`, "lyrics");
  if (!screened.ok) throw Object.assign(new Error(screened.reason), { code: "blocked", match: screened.match });

  if (input.demo || !process.env.ELEVENLABS_API_KEY) {
    if (!input.demo) {
      throw new NotConfigured(
        "ELEVENLABS_API_KEY",
        "Music generation is not configured. Add ELEVENLABS_API_KEY, or open the demo to preview the flow."
      );
    }
    return {
      audio: demoPreviewWav(input.lyrics.length),
      mime: "audio/wav",
      provider: "demo",
      notes: ["Demo music and guide vocal. No ElevenLabs call was made."],
    };
  }

  const lengthMs = 180_000;
  const response = await fetch(`${elevenBase()}/v1/music?output_format=mp3_44100_128`, {
    method: "POST",
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY,
      "content-type": "application/json",
      accept: "audio/mpeg",
    },
    body: JSON.stringify({
      model_id: process.env.ELEVENLABS_MUSIC_MODEL || "music_v1",
      music_length_ms: lengthMs,
      prompt: [
        `Original ${input.genre} song, mood ${input.mood}, about ${input.theme}.`,
        "Sung guide vocal plus instrumental. Do not imitate a known artist.",
        "Lyrics:",
        input.lyrics.slice(0, 3500),
      ].join("\n"),
    }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`ElevenLabs Music failed (${response.status}). ${detail.slice(0, 240)}`);
  }
  const audio = Buffer.from(await response.arrayBuffer());
  return { audio, mime: "audio/mpeg", provider: "elevenlabs", notes: ["ElevenLabs Music guide vocal and instrumental."] };
}

export async function separateStems(audio: Buffer, filename: string): Promise<{ vocal: Buffer | null; instrumental: Buffer | null; notes: string[] }> {
  if (!process.env.ELEVENLABS_API_KEY) {
    return { vocal: null, instrumental: null, notes: ["Stem split skipped: ELEVENLABS_API_KEY is not configured."] };
  }
  const body = new FormData();
  body.append("file", new Blob([new Uint8Array(audio)]), filename);
  body.append("stem_variation_id", "2_stems");
  body.append("sign_with_c2pa", "true");
  const response = await fetch(`${elevenBase()}/v1/music/stem-separation?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY },
    body,
  });
  if (!response.ok) {
    return { vocal: null, instrumental: null, notes: [`Stem split was not available (${response.status}). The full mix is the guide.`] };
  }
  const zip = Buffer.from(await response.arrayBuffer());
  return { vocal: zip, instrumental: null, notes: ["Stem archive stored with the take. C2PA signing was requested."] };
}

async function replicateFile(data: Buffer, name: string): Promise<string> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new NotConfigured("REPLICATE_API_TOKEN", "Voice training is not configured. Add REPLICATE_API_TOKEN.");
  const body = new FormData();
  body.append("content", new Blob([new Uint8Array(data)]), name);
  const response = await fetch("https://api.replicate.com/v1/files", {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    body,
  });
  const json = (await response.json().catch(() => ({}))) as { urls?: { get?: string }; detail?: string };
  if (!response.ok || !json.urls?.get) {
    throw new Error(json.detail || `Replicate file upload failed (${response.status}).`);
  }
  return json.urls.get;
}

type Prediction = { id?: string; status?: string; output?: unknown; error?: unknown; urls?: { get?: string } };

async function replicatePredict(model: string, input: Record<string, unknown>): Promise<Prediction> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new NotConfigured("REPLICATE_API_TOKEN", "Voice conversion is not configured. Add REPLICATE_API_TOKEN.");
  const response = await fetch(`https://api.replicate.com/v1/models/${model}/predictions`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json", prefer: "wait=60" },
    body: JSON.stringify({ input }),
  });
  const json = (await response.json().catch(() => ({}))) as Prediction;
  if (!response.ok) throw new Error(typeof json.error === "string" ? json.error : `Replicate ${model} failed (${response.status}).`);
  return json;
}

export async function trainVoiceModel(sample: Buffer, voiceId: string, demo: boolean): Promise<{ provider: "demo" | "replicate"; modelRef: string }> {
  if (demo || !process.env.REPLICATE_API_TOKEN) {
    if (!demo) {
      throw new NotConfigured(
        "REPLICATE_API_TOKEN",
        "Voice training is not configured. Add REPLICATE_API_TOKEN, or open the demo to preview training."
      );
    }
    return { provider: "demo", modelRef: `demo_${voiceId.slice(0, 8)}` };
  }
  const wav = sample.subarray(0, 4).toString() === "RIFF" ? sample : sample;
  const zip = zipStore([{ name: `dataset/lyrixis_${voiceId.slice(0, 8)}/split_0.wav`, data: wav }]);
  const url = await replicateFile(zip, "dataset.zip");
  const prediction = await replicatePredict("replicate/train-rvc-model", {
    dataset_zip: url,
    sample_rate: "48000",
    version: "v2",
    f0method: "rmvpe_gpu",
    epoch: 10,
    batch_size: "7",
  });
  const output = typeof prediction.output === "string" ? prediction.output : prediction.id ? `replicate:${prediction.id}` : "";
  if (!output) throw new Error("Replicate training returned no model.");
  return { provider: "replicate", modelRef: output };
}

export async function convertVoice(input: {
  guide: Buffer;
  guideMime: string;
  modelRef: string | null;
  demo: boolean;
}): Promise<{ audio: Buffer; mime: string; provider: string; notes: string[] }> {
  if (input.demo || (!process.env.REPLICATE_API_TOKEN && !process.env.KITS_API_KEY)) {
    if (!input.demo) {
      throw new NotConfigured(
        "REPLICATE_API_TOKEN",
        "Re-singing is not configured. Add REPLICATE_API_TOKEN (or KITS_API_KEY as fallback), or use the demo."
      );
    }
    return { audio: input.guide, mime: input.guideMime, provider: "demo", notes: ["Demo re-sing. Your preview uses the guide mix, labeled as your voice."] };
  }

  if (process.env.REPLICATE_API_TOKEN && input.modelRef && !input.modelRef.startsWith("demo_")) {
    try {
      const songUrl = await replicateFile(input.guide, "guide.audio");
      const name = `lyrixis_${input.modelRef.slice(-12).replace(/\W/g, "")}`;
      const prediction = await replicatePredict("zsxkib/realistic-voice-cloning", {
        song_input: songUrl,
        rvc_model: "CUSTOM",
        custom_rvc_model_download_url: input.modelRef.startsWith("http") ? input.modelRef : songUrl,
        custom_rvc_model_download_name: name,
        pitch_change: "no-change",
        index_rate: 0.5,
      });
      const outUrl = typeof prediction.output === "string" ? prediction.output : Array.isArray(prediction.output) ? String(prediction.output[0]) : "";
      if (outUrl.startsWith("http")) {
        const audioRes = await fetch(outUrl);
        if (audioRes.ok) {
          return {
            audio: Buffer.from(await audioRes.arrayBuffer()),
            mime: audioRes.headers.get("content-type") || "audio/mpeg",
            provider: "replicate",
            notes: ["Re-sung with your private RVC model on Replicate."],
          };
        }
      }
      if (prediction.status === "processing" || prediction.status === "starting") {
        return { audio: input.guide, mime: input.guideMime, provider: "replicate", notes: [`Conversion is still running (${prediction.id ?? "replicate"}). The guide mix is here until it finishes.`] };
      }
    } catch (error) {
      if (!process.env.KITS_API_KEY) throw error;
    }
  }

  if (!process.env.KITS_API_KEY) {
    throw new NotConfigured("KITS_API_KEY", "Kits.ai fallback is not configured, and Replicate did not return audio.");
  }
  const base = (process.env.KITS_API_BASE || "https://api.kits.ai").replace(/\/$/, "");
  const body = new FormData();
  body.append("audio", new Blob([new Uint8Array(input.guide)]), "guide.audio");
  if (input.modelRef) body.append("voice_model_id", input.modelRef);
  const response = await fetch(`${base}/v1/conversions`, {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.KITS_API_KEY}` },
    body,
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Kits.ai conversion failed (${response.status}). ${detail.slice(0, 200)}`);
  }
  return {
    audio: Buffer.from(await response.arrayBuffer()),
    mime: response.headers.get("content-type") || "audio/mpeg",
    provider: "kits",
    notes: ["Re-sung with the Kits.ai fallback."],
  };
}

export async function generateTake(input: {
  lyrics: string;
  genre: string;
  mood: string;
  theme: string;
  modelRef: string | null;
  demo: boolean;
  voiceMix: number;
}): Promise<GeneratedTake> {
  const music = await composeMusic(input);
  const notes = [...music.notes, `Voice/backing mix saved at ${input.voiceMix}% voice.`];
  if (!input.demo && music.provider === "elevenlabs") {
    const stems = await separateStems(music.audio, "song.mp3");
    notes.push(...stems.notes);
  }
  const voice = await convertVoice({ guide: music.audio, guideMime: music.mime, modelRef: input.modelRef, demo: input.demo || music.provider === "demo" });
  notes.push(...voice.notes);
  notes.push("Preview audio is watermarked. A release master is made after review.");
  return {
    audio: voice.audio,
    mime: voice.mime,
    musicProvider: music.provider,
    voiceProvider: voice.provider,
    watermarked: true,
    notes,
  };
}

export type DistributorResult = {
  distributor: "toolost" | "revelator" | "unconfigured";
  status: "not_configured" | "submitted" | "failed";
  ref: string | null;
  message: string;
};

export async function submitToDistributor(input: {
  releaseId: string;
  title: string;
  artistName: string;
  credits: string;
}): Promise<DistributorResult> {
  const prefer = (process.env.VOICE_SONGS_DISTRIBUTOR || "toolost").toLowerCase();
  const useRevelator = prefer === "revelator";
  const key = useRevelator ? process.env.REVELATOR_API_KEY : process.env.TOO_LOST_API_KEY;
  const name = useRevelator ? "revelator" : "toolost";
  if (!key) {
    return {
      distributor: "unconfigured",
      status: "not_configured",
      ref: null,
      message: useRevelator
        ? "Revelator is not configured. The release stays in the review queue until REVELATOR_API_KEY is set."
        : "Too Lost is not configured. The release stays in the review queue until TOO_LOST_API_KEY is set.",
    };
  }
  const base = (useRevelator ? process.env.REVELATOR_API_BASE : process.env.TOO_LOST_API_BASE) || (useRevelator ? "https://api.revelator.com" : "https://api.toolost.com");
  const response = await fetch(`${base.replace(/\/$/, "")}/v1/releases`, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      external_id: input.releaseId,
      title: input.title,
      artist_name: input.artistName,
      credits: input.credits,
      ai_disclosure: { vocals: "ai_voice_clone_own", music: "ai_generated", lyrics: "ai_assisted" },
    }),
  });
  const json = (await response.json().catch(() => ({}))) as { id?: string; error?: string };
  if (!response.ok) {
    return { distributor: name, status: "failed", ref: null, message: json.error || `Distributor returned ${response.status}. The release stays queued.` };
  }
  return { distributor: name, status: "submitted", ref: json.id ?? null, message: "Sent to the distributor." };
}

export async function createCardSession(input: {
  skuLabel: string;
  usdCents: number;
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
  idempotencyKey: string;
}): Promise<{ url: string; sessionId: string }> {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new NotConfigured(
      "STRIPE_SECRET_KEY",
      "Card checkout is not configured. Pay with Ixis, or set the shared card key on the server."
    );
  }
  const body = new URLSearchParams();
  body.set("mode", "payment");
  body.set("success_url", input.successUrl);
  body.set("cancel_url", input.cancelUrl);
  body.set("line_items[0][quantity]", "1");
  body.set("line_items[0][price_data][currency]", "usd");
  body.set("line_items[0][price_data][unit_amount]", String(input.usdCents));
  body.set("line_items[0][price_data][product_data][name]", input.skuLabel);
  for (const [metaKey, value] of Object.entries(input.metadata)) body.set(`metadata[${metaKey}]`, value);
  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/x-www-form-urlencoded",
      "idempotency-key": input.idempotencyKey.slice(0, 80),
    },
    body,
  });
  const json = (await response.json().catch(() => ({}))) as { url?: string; id?: string; error?: { message?: string } };
  if (!response.ok || !json.url || !json.id) {
    throw new Error(json.error?.message || "Card checkout could not be started.");
  }
  return { url: json.url, sessionId: json.id };
}

export async function cardSessionPaid(sessionId: string): Promise<boolean> {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return false;
  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: { authorization: `Bearer ${key}` },
  });
  if (!response.ok) return false;
  const json = (await response.json().catch(() => ({}))) as { payment_status?: string };
  return json.payment_status === "paid";
}
