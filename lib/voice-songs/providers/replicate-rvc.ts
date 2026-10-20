/**
 * Replicate RVC. Training: replicate/train-rvc-model.
 * Conversion: zsxkib/realistic-voice-cloning, always with the user's own zip.
 * Preset voices on that model (celebrity names) are never selected.
 */

const API = "https://api.replicate.com/v1";
const TRAIN_MODEL = "replicate/train-rvc-model";
const CONVERT_MODEL = "zsxkib/realistic-voice-cloning";
const OWN = "ownvoice";

export type ReplicatePrediction = {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled" | string;
  output: unknown;
  error: unknown;
};

function token(): string {
  const value = process.env.REPLICATE_API_TOKEN?.trim();
  if (!value) throw new Error("REPLICATE_API_TOKEN is not set.");
  return value;
}

async function postPrediction(model: string, input: Record<string, unknown>): Promise<ReplicatePrediction> {
  const response = await fetch(`${API}/models/${model}/predictions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token()}`,
      "content-type": "application/json",
      prefer: "respond-async",
    },
    body: JSON.stringify({ input }),
  });
  const json = (await response.json().catch(() => ({}))) as ReplicatePrediction & { detail?: string };
  if (!response.ok || !json.id) {
    throw new Error(json.detail || `Replicate ${model} failed (${response.status}).`);
  }
  return json;
}

export async function replicateGet(id: string): Promise<ReplicatePrediction> {
  const response = await fetch(`${API}/predictions/${id}`, {
    headers: { authorization: `Bearer ${token()}` },
    cache: "no-store",
  });
  const json = (await response.json()) as ReplicatePrediction & { detail?: string };
  if (!response.ok) throw new Error(json.detail || `Replicate poll failed (${response.status}).`);
  return json;
}

export function outputUrl(output: unknown): string | null {
  if (typeof output === "string" && output.startsWith("http")) return output;
  if (Array.isArray(output)) {
    const found = output.find((item) => typeof item === "string" && item.startsWith("http"));
    return typeof found === "string" ? found : null;
  }
  return null;
}

/** dataset_zip must be a URL Replicate can fetch. The zip layout is dataset/ownvoice/split_*.wav. */
export async function startRvcTraining(datasetZipUrl: string): Promise<ReplicatePrediction> {
  return postPrediction(TRAIN_MODEL, {
    dataset_zip: datasetZipUrl,
    sample_rate: "48k",
    version: "v2",
    f0method: "rmvpe_gpu",
    epoch: 20,
    batch_size: "7",
  });
}

/**
 * Convert a guide song into the user's trained model.
 * `modelUrl` is the training output zip. The model name is always `ownvoice`.
 */
export async function startRvcConvert(songUrl: string, modelUrl: string): Promise<ReplicatePrediction> {
  if (/celebrity|preset|trump|swift|drake/i.test(modelUrl)) {
    throw new Error("Refusing a voice model that is not the user's own training output.");
  }
  return postPrediction(CONVERT_MODEL, {
    song_input: songUrl,
    rvc_model: OWN,
    custom_rvc_model_download_url: modelUrl,
    custom_rvc_model_download_name: OWN,
    pitch_change: "no-change",
    pitch_detection_algorithm: "rmvpe",
    index_rate: 0.5,
    filter_radius: 3,
    rms_mix_rate: 0.25,
    protect: 0.33,
    output_format: "mp3",
    main_vocals_volume_change: 2,
    instrumental_volume_change: 0,
    backup_vocals_volume_change: -6,
  });
}
