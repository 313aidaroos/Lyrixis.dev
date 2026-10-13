"use client";

import { useEffect, useState } from "react";

type Row = {
  id: string;
  artistName: string;
  title: string;
  status: string;
  note: string | null;
  funding: string;
  royaltyUserBps: number;
  royaltyLyrixisBps: number;
};

const DEMO_ROWS: Row[] = [
  {
    id: "demo-release",
    artistName: "Awad Alaidaroos",
    title: "Window Down",
    status: "pending distributor",
    note: "Pending distributor. This sample is not on Spotify, Apple Music, Tidal, or any other store.",
    funding: "owner_bypass",
    royaltyUserBps: 9000,
    royaltyLyrixisBps: 1000,
  },
];

export function AdminQueue({ demo }: { demo: boolean }) {
  const [rows, setRows] = useState<Row[]>(demo ? DEMO_ROWS : []);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("Own voice, disclosure is on.");

  useEffect(() => {
    if (demo) return;
    void (async () => {
      const response = await fetch("/api/admin/voice-songs", { cache: "no-store" });
      if (response.status === 401 || response.status === 403) {
        setDenied(true);
        return;
      }
      const json = (await response.json()) as { releases?: Row[]; error?: { message?: string } };
      if (!response.ok) setError(json.error?.message || "Could not load the queue.");
      else setRows(json.releases ?? []);
    })();
  }, [demo]);

  async function decide(id: string, decision: "approve" | "reject") {
    if (demo) {
      setRows((current) =>
        current.map((row) =>
          row.id === id
            ? {
                ...row,
                status: decision === "reject" ? "rejected" : "pending distributor",
                note: decision === "reject" ? note : "Pending distributor. This song is not on Spotify, Apple Music, Tidal, or any other store.",
              }
            : row,
        ),
      );
      return;
    }
    const response = await fetch("/api/admin/voice-songs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, decision, note }),
    });
    const json = (await response.json()) as { status?: string; error?: { message?: string } };
    if (!response.ok) {
      setError(json.error?.message || "Could not update the release.");
      return;
    }
    setRows((current) => current.map((row) => (row.id === id ? { ...row, status: json.status || row.status, note } : row)));
  }

  if (denied) {
    return (
      <div className="card mt-10 text-center">
        <h2 className="font-display text-2xl font-bold">Page not found</h2>
        <p className="mt-3 text-ink-2">This page is only for the Lyrixis owner.</p>
      </div>
    );
  }

  return (
    <div className="mt-10 space-y-4">
      <p className="text-sm text-ink-3">
        Store status stays pending distributor. Approving does not put a song on Spotify, Apple Music, Tidal, or any other store. No distributor is contracted.
      </p>
      {demo && <p className="rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-gold">Demo preview. This queue is sample copy, not a live release.</p>}
      {rows.length === 0 && <p className="card text-ink-2">No releases waiting. If the table is missing, apply database/migrations/0008_voice_song_releases.sql.</p>}
      {rows.map((row) => (
        <article key={row.id} className="card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-bold">{row.title}</h2>
              <p className="mt-1 text-sm text-ink-2">{row.artistName}</p>
            </div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-cyan">{row.status.replace(/_/g, " ")}</p>
          </div>
          <p className="mt-3 text-sm text-ink-3">
            AI vocals, AI music, and AI-assisted lyrics disclosed. Royalties {row.royaltyUserBps / 100}% user / {row.royaltyLyrixisBps / 100}% Lyrixis. Funding {row.funding.replace(/_/g, " ")}.
          </p>
          {row.note && <p className="mt-2 text-sm text-ink-2">{row.note}</p>}
          {(row.status === "submitted" || row.status === "in_review" || row.status === "pending distributor") && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <input className="input max-w-sm" value={note} onChange={(event) => setNote(event.target.value)} aria-label="Reviewer note" />
              <button type="button" className="btn-primary px-4 py-2 text-sm" onClick={() => void decide(row.id, "approve")}>
                Approve
              </button>
              <button type="button" className="btn-secondary px-4 py-2 text-sm" onClick={() => void decide(row.id, "reject")}>
                Reject
              </button>
            </div>
          )}
        </article>
      ))}
      {error && <p className="text-sm text-magenta">{error}</p>}
    </div>
  );
}
