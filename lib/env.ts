// Env values pasted into dashboards sometimes carry trailing whitespace or a
// literal "\n" sequence. Normalize so secrets/IDs never reach a provider malformed.
function clean(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined;
  const value = raw.replace(/(\\n|\\r)+$/g, "").trim();
  return value.length > 0 ? value : undefined;
}

function required(name: string): string {
  const value = clean(process.env[name]);
  if (!value) {
    throw new Error(`${name} is not set. Copy .env.example to .env.local and fill in real credentials.`);
  }
  return value;
}

function optional(name: string): string | undefined {
  return clean(process.env[name]);
}

export function getAppUrl(): string {
  return optional("APP_URL") ?? "http://localhost:3000";
}

export function getSupabaseUrl(): string {
  return required("NEXT_PUBLIC_SUPABASE_URL");
}

export function getSupabaseAnonKey(): string {
  return required("NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

export function getServiceRoleKey(): string {
  return required("SUPABASE_SERVICE_ROLE_KEY");
}

export function getStorageBucket(): string {
  return optional("STORAGE_BUCKET") ?? "lyrixis-audio-private";
}

export function getMaxUploadBytes(): number {
  const mb = Number.parseInt(optional("MAX_UPLOAD_MB") ?? "100", 10);
  return (Number.isFinite(mb) && mb > 0 ? mb : 100) * 1024 * 1024;
}

export function getMaxDurationSeconds(): number {
  const seconds = Number.parseInt(optional("MAX_DURATION_SECONDS") ?? "720", 10);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : 720;
}

export function getTranscriptionProviderName(): string {
  return optional("TRANSCRIPTION_PROVIDER") ?? "whisper_v3";
}

export function getTranscriptionApiKey(): string {
  return required("TRANSCRIPTION_API_KEY");
}

export function getTranscriptionApiBaseUrl(): string {
  return (optional("TRANSCRIPTION_API_BASE_URL") ?? "https://api.openai.com/v1").replace(/\/$/, "");
}

export function getTranscriptionModel(): string {
  return optional("TRANSCRIPTION_MODEL") ?? "whisper-1";
}

export function getTranscriptionCentsPerMinute(): number {
  const raw = optional("TRANSCRIPTION_CENTS_PER_MINUTE") ?? "0.6";
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("TRANSCRIPTION_CENTS_PER_MINUTE must be a non-negative number (OpenAI Whisper = 0.6).");
  }
  return value;
}

export function getLanguageProviderName(): string {
  return optional("LANGUAGE_PROVIDER") ?? "whisper";
}

export function getAlignmentProviderName(): string | undefined {
  return optional("ALIGNMENT_PROVIDER");
}

export function optionalApiKey(name: string): string | undefined {
  return optional(name);
}
