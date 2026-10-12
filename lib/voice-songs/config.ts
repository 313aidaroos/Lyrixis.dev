export type VoiceProviderStatus = {
  elevenlabs: boolean;
  replicate: boolean;
  kits: boolean;
  speech: boolean;
  mock: boolean;
  /** Keys required for a real song that are absent. */
  missing: string[];
  /** Optional keys that are absent. Shown, not treated as a hard failure when a primary exists. */
  optionalMissing: string[];
  musicReady: boolean;
  voiceReady: boolean;
  liveReady: boolean;
};

export function voiceProviderStatus(env: Record<string, string | undefined> = process.env): VoiceProviderStatus {
  const elevenlabs = Boolean(env.ELEVENLABS_API_KEY?.trim());
  const replicate = Boolean(env.REPLICATE_API_TOKEN?.trim());
  const kits = Boolean(env.KITS_API_KEY?.trim());
  const speech = Boolean(env.TRANSCRIPTION_API_KEY?.trim());
  const mock = env.VOICE_SONGS_MOCK === "1" || env.VOICE_SONGS_MOCK === "true";
  const missing: string[] = [];
  if (!elevenlabs) missing.push("ELEVENLABS_API_KEY");
  if (!replicate) missing.push("REPLICATE_API_TOKEN");
  const optionalMissing: string[] = [];
  if (!kits) optionalMissing.push("KITS_API_KEY");
  if (!speech) optionalMissing.push("TRANSCRIPTION_API_KEY");
  const voiceReady = replicate || kits || mock;
  const musicReady = elevenlabs || mock;
  return {
    elevenlabs,
    replicate,
    kits,
    speech,
    mock,
    missing,
    optionalMissing,
    musicReady,
    voiceReady,
    liveReady: elevenlabs && (replicate || kits) && speech,
  };
}

export function assertNoSecretsInSource(value: string): boolean {
  return !/sk_live_|apx_live_|r8_[A-Za-z0-9]{8,}/.test(value);
}
