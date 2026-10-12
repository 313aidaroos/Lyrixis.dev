"use client";

import { useState } from "react";
import Link from "next/link";
import { AI_DISCLOSURE, RIGHTS_STATEMENT } from "@/lib/voice-songs/release";
import { VOICE_RELEASE_IXIS, VOICE_RELEASE_SKU, VOICE_RELEASE_USD } from "@/lib/voice-songs/pricing";
import { SignInPrompt } from "./bits";
import { uploadToSignedUrl } from "./upload";
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

type ReleaseView = {
  id: string;
  songId: string;
  artistName: string;
  title: string;
  status: string;
  note: string | null;
  funding: string;
};

export function ReleasePanel({ data, demo, songId }: { data: StudioPayload; demo: boolean; songId?: string }) {
  const songs = (demo ? [DEMO_SONG] : data.songs).filter((song) => song.hasAudio || demo);
  const [chosen, setChosen] = useState(songId || songs[0]?.id || "");
  const song = songs.find((item) => item.id === chosen) ?? songs[0] ?? null;
  const [artistName, setArtistName] = useState(demo ? "Awad Alaidaroos" : "");
  const [title, setTitle] = useState(song?.title || (demo ? "Window Down" : ""));
  const [writer, setWriter] = useState(demo ? "Awad Alaidaroos" : "");
  const [producer, setProducer] = useState(demo ? "Awad Alaidaroos" : "");
  const [rights, setRights] = useState(demo);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [release, setRelease] = useState<ReleaseView | null>(
    demo
      ? {
          id: "demo-release",
          songId: "demo",
          artistName: "Awad Alaidaroos",
          title: "Window Down",
          status: "held",
          note: "Held. Distributor is not configured, so this did not go to stores.",
          funding: "owner_bypass",
        }
      : null,
  );

  if (!data.signedIn && !demo) return <SignInPrompt next="/voice-songs/release" />;

  const paid = data.owner || (song && ["wallet", "card", "all_access", "owner_bypass", "mock"].includes(song.funding));

  async function submit() {
    if (demo) {
      setRelease({
        id: "demo-release",
        songId: chosen || "demo",
        artistName,
        title,
        status: "held",
        note: "Demo preview. Nothing was sent to a distributor.",
        funding: "owner_bypass",
      });
      return;
    }
    if (!song) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/voice-songs/releases", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          songId: song.id,
          artistName,
          title,
          writer,
          producer,
          rightsAccepted: rights,
          funding: song.funding,
        }),
      });
      const json = (await response.json()) as { error?: { message?: string }; release?: ReleaseView };
      if (!response.ok || !json.release) throw new Error(json.error?.message || "Could not submit the release.");
      setRelease(json.release);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit the release.");
    } finally {
      setBusy(false);
    }
  }

  async function onCover(file: File) {
    if (demo || !release) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/voice-songs/releases", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "cover", releaseId: release.id, mime: file.type || "image/jpeg" }),
      });
      const json = (await response.json()) as { error?: { message?: string }; upload?: { signedUrl: string; path: string } };
      if (!response.ok || !json.upload) throw new Error(json.error?.message || "Could not start the cover upload.");
      await uploadToSignedUrl(json.upload.signedUrl, file, file.name);
      const done = await fetch("/api/voice-songs/releases", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "cover-done", releaseId: release.id, path: json.upload.path }),
      });
      if (!done.ok) {
        const body = (await done.json()) as { error?: { message?: string } };
        throw new Error(body.error?.message || "Could not attach the cover.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cover upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="card">
        <p className="font-mono text-[11px] uppercase tracking-widest text-ink-3">Single</p>
        <h2 className="mt-2 font-display text-3xl font-bold">Release request</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-2">
          ${VOICE_RELEASE_USD} ({VOICE_RELEASE_IXIS} Ixis) for one single. You keep 90% of the master royalties the distributor reports.
        </p>
        <label className="mt-5 block">
          <span className="label">Song</span>
          <select
            className="input mt-2"
            value={song?.id || ""}
            onChange={(event) => {
              setChosen(event.target.value);
              const next = songs.find((item) => item.id === event.target.value);
              if (next) setTitle(next.title);
            }}
          >
            {songs.length === 0 && <option value="">Generate a song first</option>}
            {songs.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label>
            <span className="label">Artist name</span>
            <input className="input mt-2" value={artistName} onChange={(event) => setArtistName(event.target.value)} placeholder="The name on the stores" />
          </label>
          <label>
            <span className="label">Title</span>
            <input className="input mt-2" value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label>
            <span className="label">Writer</span>
            <input className="input mt-2" value={writer} onChange={(event) => setWriter(event.target.value)} />
          </label>
          <label>
            <span className="label">Producer</span>
            <input className="input mt-2" value={producer} onChange={(event) => setProducer(event.target.value)} />
          </label>
        </div>
        <fieldset className="mt-5 space-y-2">
          <legend className="label">AI disclosure</legend>
          {Object.values(AI_DISCLOSURE).map((label) => (
            <label key={label} className="flex items-center gap-2 text-sm text-ink-2">
              <input type="checkbox" checked disabled className="accent-cyan" />
              {label}
            </label>
          ))}
        </fieldset>
        <label className="mt-5 flex items-start gap-3 text-sm text-ink-2">
          <input type="checkbox" className="mt-1 accent-cyan" checked={rights} onChange={(event) => setRights(event.target.checked)} />
          <span>{RIGHTS_STATEMENT}</span>
        </label>
        {!paid && !demo && (
          <p className="mt-4 text-sm text-ink-2">
            A release is ${VOICE_RELEASE_USD} ({VOICE_RELEASE_IXIS} Ixis).{" "}
            <Link className="font-semibold text-cyan" href={`/voice-songs/checkout?sku=${VOICE_RELEASE_SKU}${song ? `&songId=${song.id}` : ""}`}>
              Pay on Checkout
            </Link>
          </p>
        )}
        <button type="button" className="btn-primary mt-6" disabled={busy || !rights || !song} onClick={() => void submit()}>
          {busy ? "Sending…" : "Submit for review"}
        </button>
        {error && <p className="mt-3 text-sm text-magenta">{error}</p>}
      </section>
      <aside className="space-y-4">
        <article className="card">
          <h3 className="font-display text-xl font-bold">Cover art</h3>
          <p className="mt-2 text-sm text-ink-3">JPEG, PNG, or WebP. Square art reads best on stores.</p>
          <label className="btn-secondary mt-4 inline-block cursor-pointer px-4 py-2 text-sm">
            {demo ? "Cover stays on this preview" : "Upload cover"}
            <input
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={demo || busy || !release}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void onCover(file);
              }}
            />
          </label>
        </article>
        {release && (
          <article className="card">
            <p className="font-mono text-[11px] uppercase tracking-widest text-cyan">{release.status.replace(/_/g, " ")}</p>
            <h3 className="mt-2 font-display text-xl font-bold">{release.title}</h3>
            <p className="mt-1 text-sm text-ink-2">{release.artistName}</p>
            {release.note && <p className="mt-3 text-sm text-ink-3">{release.note}</p>}
          </article>
        )}
      </aside>
    </div>
  );
}
