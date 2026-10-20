"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { screenVoiceText } from "@/lib/voice-songs/safety";
import { SignInPrompt } from "./bits";
import type { StudioPayload } from "./types";

const GENRES = ["Pop", "R&B", "Indie", "Folk", "Hip-hop", "Electronic", "Rock", "Afrobeats", "Latin", "Country"];
const MOODS = ["Warm", "Hopeful", "Night", "Bright", "Tender", "Fierce", "Melancholy"];

const DEMO_LYRICS = `[Verse]
The city keeps the window down, a night drive in the glass.
I count the lights and leave the old plan in the past.

[Chorus]
This is my voice, hopeful, singing it through.
A pop heartbeat, and the words are new.`;

export function LyricsPanel({ data, demo, onChanged }: { data: StudioPayload; demo: boolean; onChanged: () => Promise<void> }) {
  const router = useRouter();
  const existing = data.songs[0];
  const [title, setTitle] = useState(demo ? "Window Down" : existing?.title && existing.title !== "Untitled" ? existing.title : "");
  const [theme, setTheme] = useState(demo ? "a night drive home" : existing?.theme || "");
  const [mood, setMood] = useState(demo ? "Hopeful" : existing?.mood || "Warm");
  const [genre, setGenre] = useState(demo ? "Pop" : existing?.genre || "Pop");
  const [lyrics, setLyrics] = useState(demo ? DEMO_LYRICS : existing?.lyrics || "");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(demo ? "Demo lyric, not from Cixy live." : null);
  const [busy, setBusy] = useState(false);

  if (!data.signedIn && !demo) return <SignInPrompt next="/voice-songs/lyrics" />;

  function blocked(value: string) {
    const result = screenVoiceText(value, "lyrics");
    if (!result.ok) {
      setError(result.reason);
      return true;
    }
    return false;
  }

  async function writeWithCixy() {
    if (blocked([theme, mood, genre, lyrics, note].join("\n"))) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/voice-songs/lyrics", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "suggest", theme, mood, genre, draft: lyrics, note }),
      });
      const json = (await response.json()) as { error?: { message?: string }; lyrics?: string; source?: string };
      if (!response.ok || !json.lyrics) throw new Error(json.error?.message || "Cixy could not write that.");
      setLyrics(json.lyrics);
      setSource(json.source === "mock" ? "Local draft. Cixy live needs ANTHROPIC_API_KEY." : "Cixy wrote this. Edit any line.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cixy failed.");
    } finally {
      setBusy(false);
    }
  }

  async function save(goNext: boolean) {
    if (blocked([title, theme, mood, genre, lyrics].join("\n"))) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/voice-songs/lyrics", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, theme, mood, genre, lyrics, songId: existing?.id }),
      });
      const json = (await response.json()) as { error?: { message?: string }; song?: { id: string } };
      if (!response.ok || !json.song) throw new Error(json.error?.message || "Could not save the lyric.");
      await onChanged();
      if (goNext) router.push(`/voice-songs/preview`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <p className="font-mono text-[11px] uppercase tracking-widest text-ink-3">Cixy</p>
      <h2 className="mt-2 font-display text-3xl font-bold">Write the lyric</h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-2">
        Pick a theme, mood, and genre. Cixy drafts original lines you can edit. Ask for another artist&apos;s voice or a famous lyric and Cixy refuses.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="label">Title</span>
          <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Window Down" />
        </label>
        <label className="block text-sm">
          <span className="label">Theme</span>
          <input className="input" value={theme} onChange={(event) => setTheme(event.target.value)} placeholder="A night drive home" />
        </label>
        <label className="block text-sm">
          <span className="label">Genre</span>
          <select className="input" value={genre} onChange={(event) => setGenre(event.target.value)}>
            {GENRES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="label">Mood</span>
          <select className="input" value={mood} onChange={(event) => setMood(event.target.value)}>
            {MOODS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="mt-4 block text-sm">
        <span className="label">Note for Cixy</span>
        <input className="input" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Keep the chorus to four short lines" />
      </label>
      <label className="mt-4 block text-sm">
        <span className="label">Lyrics</span>
        <textarea className="input min-h-56 font-body leading-relaxed" value={lyrics} onChange={(event) => setLyrics(event.target.value)} placeholder="[Verse]&#10;Your line" />
      </label>
      {source && <p className="mt-3 text-sm text-cyan">{source}</p>}
      {error && <p className="mt-3 text-sm text-magenta">{error}</p>}
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" className="btn-secondary" disabled={busy || demo} onClick={() => void writeWithCixy()}>
          Write with Cixy
        </button>
        <button type="button" className="btn-primary" disabled={busy || demo} onClick={() => void save(true)}>
          Save and preview <span className="arrow">→</span>
        </button>
      </div>
    </div>
  );
}
