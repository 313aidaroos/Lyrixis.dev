"use client";

import { useState } from "react";
import Link from "next/link";
import { ProviderNote, SignInPrompt } from "./bits";
import type { StudioPayload, StudioSong } from "./types";

const DEMO_SONG: StudioSong = {
  id: "demo",
  title: "Window Down",
  theme: "a night drive home",
  mood: "Hopeful",
  genre: "Pop",
  lyrics: "This is my voice, hopeful, singing it through.",
  status: "ready",
  funding: "owner_bypass",
  takesAllowed: 3,
  takesUsed: 1,
  watermarked: true,
  providerMusic: "mock",
  providerVoice: "mock",
  error: null,
  hasAudio: true,
  createdAt: "2026-10-12T00:00:00.000Z",
};

export function PreviewPanel({
  data,
  demo,
  songId,
  loading,
  onChanged,
}: {
  data: StudioPayload;
  demo: boolean;
  songId?: string;
  loading: boolean;
  onChanged: () => Promise<void>;
}) {
  const songs = demo ? [DEMO_SONG] : data.songs;
  const current = songs.find((song) => song.id === songId) ?? songs[0] ?? null;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  if (!data.signedIn && !demo) return <SignInPrompt next="/voice-songs/preview" />;

  async function generate(id: string) {
    setBusy(true);
    setError(null);
    try {
      let latest = status;
      for (let attempt = 0; attempt < 40; attempt += 1) {
        const response = await fetch(`/api/voice-songs/songs/${id}/advance`, { method: "POST" });
        const json = (await response.json()) as { error?: { message?: string; code?: string }; song?: StudioSong };
        if (!response.ok || !json.song) throw new Error(json.error?.message || "Could not generate the song.");
        latest = json.song.status;
        setStatus(latest);
        if (latest === "ready" || latest === "failed" || latest === "not_configured" || latest === "payment_required") {
          if (json.song.error) setError(json.song.error);
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 2500));
      }
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setBusy(false);
    }
  }

  const missing = !demo && !data.providers?.liveReady;
  return (
    <div className="space-y-6">
      {!demo && <ProviderNote data={data} />}
      {!current && !loading && (
        <div className="card">
          <p className="text-ink-2">No song yet. Write a lyric first, then come back to generate.</p>
        </div>
      )}
      {current && (
        <section className="card">
          <p className="font-mono text-[11px] uppercase tracking-widest text-ink-3">{current.genre || "Song"} · {current.mood || "preview"}</p>
          <h2 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{current.title}</h2>
          <p className="mt-2 text-sm text-ink-3">
            Take {current.takesUsed || (demo ? 1 : 0)} of {current.takesAllowed}. {current.watermarked ? "Preview is watermarked." : ""}
            {data.owner ? " Owner test pass: payment is skipped." : ""}
          </p>
          <pre className="mt-4 whitespace-pre-wrap font-body text-sm leading-relaxed text-ink-2">{current.lyrics}</pre>
          {(current.hasAudio || demo) && (
            <audio className="mt-5 w-full" controls src={demo || current.id === "demo" ? "/api/voice-songs/demo-audio" : `/api/voice-songs/songs/${current.id}/audio`} />
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            {!demo && (
              <button type="button" className="btn-primary" disabled={busy || !current.id} onClick={() => void generate(current.id)}>
                {busy ? "Working…" : current.hasAudio ? "Make another take" : "Generate song"}
              </button>
            )}
            {(current.hasAudio || demo) && (
              <a className="btn-secondary" href={demo || current.id === "demo" ? "/api/voice-songs/demo-audio" : `/api/voice-songs/songs/${current.id}/audio`}>
                Download
              </a>
            )}
          </div>
          {status && <p className="mt-4 text-sm text-ink-2">Status: {status.replace(/_/g, " ")}</p>}
          {missing && !current.hasAudio && (
            <p className="mt-3 text-sm text-gold">Not configured. Generation stays off until the keys above are set, unless VOICE_SONGS_MOCK=1.</p>
          )}
          {error && <p className="mt-3 text-sm text-magenta">{error}</p>}
          {!data.owner && current.funding === "unpaid" && !demo && (
            <p className="mt-3 text-sm text-ink-2">
              A voice song is $6 (600 Ixis).{" "}
              <Link className="font-semibold text-cyan" href={`/voice-songs/checkout?sku=lyrixis.voice.song&songId=${current.id}`}>
                Pay on Checkout
              </Link>
              . An extra take is 100 Ixis only.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
