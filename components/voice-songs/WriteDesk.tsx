"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGate, DemoBanner, PayChoice, StepNav, api, useSession } from "./client";

const MOODS = ["warm", "restless", "hopeful", "late-night", "bright"];
const GENRES = ["indie pop", "acoustic", "R&B", "folk", "electronic"];

export function WriteDesk() {
  const router = useRouter();
  const state = useSession();
  const [theme, setTheme] = useState("a kitchen light at midnight");
  const [mood, setMood] = useState(MOODS[0]);
  const [genre, setGenre] = useState(GENRES[0]);
  const [note, setNote] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [payKey, setPayKey] = useState("");

  async function draft() {
    setBusy(true);
    setError("");
    try {
      const result = await api<{ lyrics: string; reply: string; provider: string }>("/api/voice-desk/lyrics", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ theme, mood, genre, note, lyrics }),
      });
      setLyrics(result.lyrics);
      setReply(result.reply);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cixy could not write.");
    } finally {
      setBusy(false);
    }
  }

  async function generate(idempotencyKey: string) {
    setBusy(true);
    setError("");
    try {
      const result = await api<{ song: { id: string } }>("/api/voice-desk/songs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: theme, theme, mood, genre, lyrics, idempotencyKey }),
      });
      router.push(`/voice-songs/desk/song/${result.song.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed.");
      setBusy(false);
    }
  }

  return (
    <AuthGate {...state}>
      {state.session && (
        <>
          <DemoBanner session={state.session} />
          <p className="font-mono text-xs uppercase tracking-widest text-ink-2">Cixy</p>
          <h1 className="mt-2 font-display text-4xl font-bold sm:font-marquee sm:text-5xl">Write the lyric</h1>
          <p className="mt-3 max-w-2xl text-ink-2">Pick a theme, mood, and genre. Cixy drafts original lines. Names of other artists, their songs, and “sing like” requests are blocked.</p>
          <StepNav current="/voice-songs/desk/write" />
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <div className="card">
              <label className="label">Theme</label>
              <input className="input" value={theme} onChange={(event) => setTheme(event.target.value)} />
              <label className="label mt-4">Mood</label>
              <select className="input" value={mood} onChange={(event) => setMood(event.target.value)}>
                {MOODS.map((item) => <option key={item}>{item}</option>)}
              </select>
              <label className="label mt-4">Genre</label>
              <select className="input" value={genre} onChange={(event) => setGenre(event.target.value)}>
                {GENRES.map((item) => <option key={item}>{item}</option>)}
              </select>
              <label className="label mt-4">Note for Cixy</label>
              <textarea className="input min-h-24" value={note} onChange={(event) => setNote(event.target.value)} placeholder="A detail only you would write" />
              <button type="button" className="btn-primary mt-4" disabled={busy || state.session.voice?.status !== "ready"} onClick={() => void draft()}>
                {busy ? "Writing…" : "Ask Cixy"}
              </button>
              {state.session.voice?.status !== "ready" && <p className="mt-3 text-sm text-ink-3">Train your voice first. Cixy will not write a song onto someone else’s model.</p>}
            </div>
            <div className="card">
              <label className="label">Lyrics</label>
              <textarea className="input min-h-72 font-mono text-sm" value={lyrics} onChange={(event) => setLyrics(event.target.value)} />
              {reply && <p className="mt-3 text-sm text-ink-2">{reply}</p>}
            </div>
          </div>
          {error && <p className="mt-4 text-sm text-magenta">{error}</p>}
          {lyrics && !payKey && (
            <PayChoice sku="song" allowance={state.session.allAccess && state.session.usage.songsUsed < 4} onPaid={(key) => { setPayKey(key); void generate(key); }} />
          )}
          {state.session.allAccess && lyrics && state.session.usage.songsUsed < 4 && (
            <p className="mt-3 text-xs text-ink-3">All-Access includes {4 - state.session.usage.songsUsed} voice song{state.session.usage.songsUsed === 3 ? "" : "s"} this month. You can still pay instead.</p>
          )}
        </>
      )}
    </AuthGate>
  );
}
