"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGate, DemoBanner, StepNav, api, useSession } from "./client";

export function TrainDesk() {
  const router = useRouter();
  const state = useSession();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function run() {
    setBusy(true);
    setNote("");
    try {
      await api("/api/voice-songs/train", { method: "POST" });
      await state.reload();
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Training failed.");
      await state.reload();
    } finally {
      setBusy(false);
    }
  }

  async function erase() {
    setBusy(true);
    try {
      await api("/api/voice-songs/voice", { method: "DELETE" });
      router.push("/voice-songs");
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Could not delete the voice.");
      setBusy(false);
    }
  }

  const voice = state.session?.voice;
  return (
    <AuthGate {...state}>
      {state.session && (
        <>
          <DemoBanner session={state.session} />
          <p className="font-mono text-xs uppercase tracking-widest text-ink-2">Private model</p>
          <h1 className="mt-2 font-display text-4xl font-bold sm:font-marquee sm:text-5xl">Train your voice</h1>
          <p className="mt-3 max-w-2xl text-ink-2">Training stays on your Apixis ID. Live training uses Replicate RVC when REPLICATE_API_TOKEN is set. Without it, this page says not configured unless you are in the demo.</p>
          <StepNav current="/voice-songs/train" />
          <div className="card mt-8 max-w-2xl">
            <p className="text-sm text-ink-2">Status: <span className="text-ink">{voice?.status ?? "no sample"}</span></p>
            {voice?.provider && <p className="mt-2 text-sm text-ink-2">Provider: {voice.provider}</p>}
            {voice?.trainError && <p className="mt-3 text-sm text-magenta">{voice.trainError}</p>}
            {note && <p className="mt-3 text-sm text-magenta">{note}</p>}
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" className="btn-primary" disabled={busy || !voice?.livenessPassed} onClick={() => void run()}>
                {busy ? "Training…" : voice?.status === "ready" ? "Train again" : "Train model"}
              </button>
              {voice?.status === "ready" && (
                <button type="button" className="btn-secondary" onClick={() => router.push("/voice-songs/write")}>Write lyrics</button>
              )}
              <button type="button" className="btn-secondary" disabled={busy || !voice} onClick={() => void erase()}>Delete my voice</button>
            </div>
          </div>
        </>
      )}
    </AuthGate>
  );
}
