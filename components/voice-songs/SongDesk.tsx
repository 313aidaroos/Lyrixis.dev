"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthGate, DemoBanner, PayChoice, StepNav, api, audioUrl, useSession } from "./client";

export function SongDesk({ songId }: { songId: string }) {
  const state = useSession();
  const song = state.session?.songs.find((item) => item.id === songId);
  const takes = state.session?.takes.filter((item) => item.songId === songId) ?? [];
  const [lyrics, setLyrics] = useState("");
  const [mix, setMix] = useState(65);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [needPay, setNeedPay] = useState(false);
  const ready = takes.filter((take) => take.status === "ready");
  const includedLeft = song ? Math.max(0, song.takesIncluded - ready.length) : 0;

  async function retake(idempotencyKey = "") {
    if (!song) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/voice-songs/songs/${song.id}/takes`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idempotencyKey, voiceMix: mix, lyrics: lyrics || song.lyrics }),
      });
      setNeedPay(false);
      await state.reload();
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "payment_required") setNeedPay(true);
      setError(err instanceof Error ? err.message : "Could not make a take.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthGate {...state}>
      {state.session && (
        <>
          <DemoBanner session={state.session} />
          <p className="font-mono text-xs uppercase tracking-widest text-ink-2">Preview</p>
          <h1 className="mt-2 font-display text-4xl font-bold sm:font-marquee sm:text-5xl">{song?.title ?? "Song"}</h1>
          <StepNav current="/voice-songs/song" />
          {!song && !state.loading && <p className="mt-6 text-ink-2">That song is not on this account.</p>}
          {song && (
            <div className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-4">
                {takes.map((take) => (
                  <div key={take.id} className="card">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold">Take {take.takeNumber} · {take.kind}</p>
                      <span className="text-xs text-ink-3">{take.watermarked ? "Watermarked preview" : "Clean"} · {take.musicProvider}/{take.voiceProvider}</span>
                    </div>
                    {take.mixPath && <audio className="mt-3 w-full" controls src={audioUrl(take.mixPath)} />}
                    {take.notes.map((line) => <p key={line} className="mt-2 text-xs text-ink-3">{line}</p>)}
                    {take.error && <p className="mt-2 text-sm text-magenta">{take.error}</p>}
                  </div>
                ))}
              </div>
              <div className="card">
                <label className="label">Edit lyrics</label>
                <textarea className="input min-h-48 font-mono text-sm" defaultValue={song.lyrics} onChange={(event) => setLyrics(event.target.value)} />
                <label className="label mt-4">Voice in the mix · {mix}%</label>
                <input type="range" min={0} max={100} value={mix} onChange={(event) => setMix(Number(event.target.value))} className="w-full" />
                <p className="mt-2 text-xs text-ink-3">{includedLeft > 0 ? `${includedLeft} included take${includedLeft === 1 ? "" : "s"} left.` : "The next take is an extra take: 100 Ixis ($1)."}</p>
                <button type="button" className="btn-primary mt-4" disabled={busy} onClick={() => void retake(includedLeft > 0 ? `incl${song.id.slice(0, 8)}${ready.length}` : "")}>
                  {busy ? "Rendering…" : includedLeft > 0 ? "Re-sing" : "Extra take"}
                </button>
                {ready[0] && (
                  <Link href={`/voice-songs/release?song=${song.id}&take=${ready[ready.length - 1]?.id}`} className="btn-secondary mt-3">Request a release</Link>
                )}
                {error && <p className="mt-3 text-sm text-magenta">{error}</p>}
              </div>
            </div>
          )}
          {needPay && <PayChoice sku="take" allowance={false} onPaid={(key) => void retake(key)} />}
        </>
      )}
    </AuthGate>
  );
}
