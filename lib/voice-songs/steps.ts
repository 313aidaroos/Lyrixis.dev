import type { VoiceProviderStatus } from "./config";
import { mayGenerate } from "./pricing";

export type TrainingStatus = "none" | "running" | "succeeded" | "failed";

export type VoiceJobState = {
  owner: boolean;
  funding: string;
  hasSample: boolean;
  consent: boolean;
  liveness: boolean;
  modelUrl: string | null;
  trainingStatus: TrainingStatus;
  guideReady: boolean;
  voiceStatus: TrainingStatus;
  outputReady: boolean;
};

export type VoiceStep =
  | { step: "payment_required" }
  | { step: "need_sample" }
  | { step: "need_consent" }
  | { step: "need_liveness" }
  | { step: "not_configured"; missing: string[] }
  | { step: "start_training" }
  | { step: "wait_training" }
  | { step: "compose" }
  | { step: "separate" }
  | { step: "start_convert" }
  | { step: "wait_convert" }
  | { step: "ready" }
  | { step: "mock_render" };

export function nextVoiceStep(state: VoiceJobState, providers: VoiceProviderStatus, stemsDone = false): VoiceStep {
  if (!mayGenerate({ owner: state.owner, funding: state.funding })) return { step: "payment_required" };
  if (!state.hasSample) return { step: "need_sample" };
  if (!state.consent) return { step: "need_consent" };
  if (!state.liveness) return { step: "need_liveness" };
  if (state.outputReady) return { step: "ready" };

  // Explicit mock finishes a preview without calling ElevenLabs or Replicate.
  if (providers.mock) return { step: "mock_render" };

  const missing = providers.missing.filter((key) => {
    if (key === "REPLICATE_API_TOKEN" && providers.kits) return false;
    return true;
  });
  if (!providers.elevenlabs || (!providers.replicate && !providers.kits)) {
    return { step: "not_configured", missing };
  }

  if (providers.replicate && !state.modelUrl) {
    if (state.trainingStatus === "running") return { step: "wait_training" };
    return { step: "start_training" };
  }
  if (!state.guideReady) return { step: "compose" };
  if (!stemsDone) return { step: "separate" };
  if (state.voiceStatus === "running") return { step: "wait_convert" };
  return { step: "start_convert" };
}
