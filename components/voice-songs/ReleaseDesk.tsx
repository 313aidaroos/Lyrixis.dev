"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AI_DISCLOSURE_NOTICE } from "@/lib/voice-songs/types";
import { AuthGate, DemoBanner, PayChoice, StepNav, api, useSession } from "./client";

export function ReleaseDesk() {
  const params = useSearchParams();
  const state = useSession();
  const songId = params.get("song") || state.session?.songs[0]?.id || "";
  const song = state.session?.songs.find((item) => item.id === songId);
  const takes = state.session?.takes.filter((item) => item.songId === songId && item.status === "ready") ?? [];
  const [takeId, setTakeId] = useState(params.get("take") || "");
  const [artistName, setArtistName] = useState("");
  const [title, setTitle] = useState(song?.title || "");
  const [credits, setCredits] = useState("Lead vocal: the artist, using their own consented voice model. Music: generated. Lyrics: written with Cixy.");
  const [rights, setRights] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [payKey, setPayKey] = useState("");
  const chosenTake = takeId || takes[0]?.id || "";
  const allowance = Boolean(state.session?.allAccess && (state.session.usage.releasesUsed ?? 0) < 1);

  const summary = useMemo(() => AI_DISCLOSURE_NOTICE, []);

  async function submit(idempotencyKey: string, artwork?: File | null) {
    setBusy(true);
    setError("");
    const form = new FormData();
    form.set("songId", songId);
    form.set("takeId", chosenTake);
    form.set("artistName", artistName);
    form.set("title", title || song?.title || "");
    form.set("credits", credits);
    form.set("rights", rights ? "true" : "false");
    form.set("idempotencyKey", idempotencyKey);
    if (artwork) form.set("artwork", artwork);
    try {
      const result = await api<{ release: { id: string; status: string; distributorMessage: string | null } }>("/api/voice-songs/releases", { method: "POST", body: form });
      setDone(`Release ${result.release.id.slice(0, 8)} is ${result.release.status}. ${result.release.distributorMessage ?? ""}`);
      await state.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not queue the release.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthGate {...state}>
      {state.session && (
        <>
          <DemoBanner session={state.session} />
          <p className="font-mono text-xs uppercase tracking-widest text-ink-2">Stores</p>
          <h1 className="mt-2 font-display text-4xl font-bold sm:font-marquee sm:text-5xl">Request a release</h1>
          <p className="mt-3 max-w-2xl text-ink-2">Metadata, cover, credits, and the AI disclosure are stored with a 90% / 10% royalty split. A person reviews it before a distributor is called. Without distributor keys, it stays queued and the page says not configured.</p>
          <StepNav current="/voice-songs/release" />
          <div className="card mt-8 max-w-3xl">
            <label className="label">Artist name</label>
            <input className="input" value={artistName} onChange={(event) => setArtistName(event.target.value)} placeholder="Your name, not another artist" />
            <label className="label mt-4">Title</label>
            <input className="input" value={title || song?.title || ""} onChange={(event) => setTitle(event.target.value)} />
            <label className="label mt-4">Take</label>
            <select className="input" value={chosenTake} onChange={(event) => setTakeId(event.target.value)}>
              {takes.map((take) => <option key={take.id} value={take.id}>Take {take.takeNumber}</option>)}
            </select>
            <label className="label mt-4">Credits</label>
            <textarea className="input min-h-24" value={credits} onChange={(event) => setCredits(event.target.value)} />
            <label className="label mt-4">Cover art</label>
            <input id="artwork" className="text-sm text-ink-2" type="file" accept="image/png,image/jpeg,image/webp" />
            <div className="mt-4 rounded-xl border border-line bg-black/20 p-4 text-sm leading-relaxed text-ink-2">{summary}</div>
            <p className="mt-3 text-sm text-ink">Royalty split on this release: you 90%, Lyrixis 10%.</p>
            <label className="mt-4 flex items-start gap-3 text-sm">
              <input type="checkbox" className="mt-1" checked={rights} onChange={(event) => setRights(event.target.checked)} />
              I have the rights to this lyric and this is my own voice. I understand the AI disclosure and the split.
            </label>
            {!payKey && (
              <div className="mt-4">
                <PayChoice
                  sku="release"
                  allowance={allowance}
                  onPaid={(key) => {
                    setPayKey(key);
                    const file = (document.getElementById("artwork") as HTMLInputElement | null)?.files?.[0];
                    void submit(key, file);
                  }}
                />
              </div>
            )}
            {busy && <p className="mt-3 text-sm text-ink-2">Queueing the release…</p>}
            {error && <p className="mt-3 text-sm text-magenta">{error}</p>}
            {done && <p className="mt-3 text-sm text-cyan">{done}</p>}
          </div>
          {state.session.releases.length > 0 && (
            <ul className="mt-6 space-y-3">
              {state.session.releases.map((release) => (
                <li key={release.id} className="card text-sm">
                  <p className="font-semibold">{release.title} · {release.artistName}</p>
                  <p className="text-ink-3">{release.status} · distributor {release.distributorStatus} · {release.royaltyUserBps / 100}% / {release.royaltyLyrixisBps / 100}%</p>
                  {release.distributorMessage && <p className="mt-1 text-ink-2">{release.distributorMessage}</p>}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </AuthGate>
  );
}
