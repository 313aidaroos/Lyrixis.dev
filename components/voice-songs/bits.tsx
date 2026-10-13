"use client";

import type { StudioPayload } from "./types";

export function ProviderNote({ data }: { data: StudioPayload }) {
  if (data.providers?.checked === false) return null;
  const missing = data.providers?.missing ?? [];
  if (data.providers?.liveReady && !data.providers.mock) return null;
  return (
    <div className="rounded-2xl border border-line bg-white/[0.03] p-4 text-sm text-ink-2">
      {data.providers?.mock ? (
        <p>Mock audio is on (VOICE_SONGS_MOCK). Previews are a generated tone, not your cloned voice.</p>
      ) : (
        <p>Not configured for a live song. A real song needs {missing.join(" and ") || "the music keys"} on the server.</p>
      )}
      <p className="mt-2 text-ink-3">
        Required: ELEVENLABS_API_KEY, REPLICATE_API_TOKEN. Optional fallback: KITS_API_KEY and KITS_MODEL_ID. Read-aloud check: TRANSCRIPTION_API_KEY.
        Preview without those keys: set VOICE_SONGS_MOCK=1.
      </p>
      {!data.database && data.databaseMessage && <p className="mt-2 text-gold">{data.databaseMessage}</p>}
    </div>
  );
}

export function SignInPrompt({ next }: { next: string }) {
  return (
    <div className="card">
      <p className="text-ink-2">Voice songs use your Apixis ID. One account, the same Wallet as the rest of Lyrixis.</p>
      <a href={`/auth/apixis/start?next=${encodeURIComponent(next)}`} className="btn-primary mt-4">
        Sign in with Apixis ID <span className="arrow">→</span>
      </a>
    </div>
  );
}
