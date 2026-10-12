"use client";

import { useEffect, useState } from "react";
import type { ReleaseRow } from "@/lib/voice-songs/types";
import { AuthGate, DemoBanner, api, useSession } from "./client";
import type { ProviderFlags } from "./client";

export function AdminDesk() {
  const state = useSession();
  const [queue, setQueue] = useState<ReleaseRow[]>([]);
  const [providers, setProviders] = useState<ProviderFlags | null>(null);
  const [note, setNote] = useState("");

  async function load() {
    const data = await api<{ queue: ReleaseRow[]; providers: ProviderFlags }>("/api/voice-songs/admin");
    setQueue(data.queue);
    setProviders(data.providers);
  }

  useEffect(() => {
    if (state.session) void load().catch((error: unknown) => setNote(error instanceof Error ? error.message : "Could not load the queue."));
  }, [state.session]);

  async function decide(releaseId: string, decision: "approve" | "reject") {
    setNote("");
    try {
      await api("/api/voice-songs/admin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ releaseId, decision, note: decision === "approve" ? "Approved in review." : "Needs a change." }),
      });
      await load();
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Decision failed.");
    }
  }

  return (
    <AuthGate {...state}>
      {state.session && (
        <>
          <DemoBanner session={state.session} />
          <p className="font-mono text-xs uppercase tracking-widest text-ink-2">Review</p>
          <h1 className="mt-2 font-display text-4xl font-bold sm:font-marquee sm:text-5xl">Release queue</h1>
          <p className="mt-3 max-w-2xl text-ink-2">
            {state.session.actor.demo
              ? "Demo shows your own queued releases. A signed-in reviewer (Awad) sees every queued release."
              : "Approve to call the distributor. If the distributor key is missing, the release is approved and marked not configured."}
          </p>
          {providers && (
            <p className="mt-3 text-sm text-ink-3">
              Too Lost {providers.toolost ? "ready" : "not configured"} · Revelator {providers.revelator ? "ready" : "not configured"}
            </p>
          )}
          {note && <p className="mt-3 text-sm text-magenta">{note}</p>}
          <ul className="mt-6 space-y-3">
            {queue.length === 0 && <li className="card text-sm text-ink-2">Nothing is waiting.</li>}
            {queue.map((release) => (
              <li key={release.id} className="card">
                <p className="font-semibold">{release.title}</p>
                <p className="text-sm text-ink-2">{release.artistName} · {release.status} · split {release.royaltyUserBps / 100}% / {release.royaltyLyrixisBps / 100}%</p>
                <p className="mt-2 text-xs text-ink-3">{release.aiDisclosure?.notice}</p>
                <div className="mt-4 flex gap-3">
                  <button type="button" className="btn-primary" onClick={() => void decide(release.id, "approve")}>Approve</button>
                  <button type="button" className="btn-secondary" onClick={() => void decide(release.id, "reject")}>Reject</button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </AuthGate>
  );
}
