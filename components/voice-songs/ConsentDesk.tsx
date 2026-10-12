"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGate, DemoBanner, PayChoice, StepNav, api, useSession } from "./client";

export function ConsentDesk() {
  const router = useRouter();
  const state = useSession();
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [paid, setPaid] = useState(false);
  const voice = state.session?.voice;

  async function consent() {
    setBusy(true);
    setNote("");
    try {
      await api("/api/voice-songs/consent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accepted: true }),
      });
      await state.reload();
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Could not save consent.");
    } finally {
      setBusy(false);
    }
  }

  async function livenessDemo() {
    setBusy(true);
    setNote("");
    try {
      await api("/api/voice-songs/liveness", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ transcript: voice?.livenessPhrase || "", bytes: 1600 }),
      });
      setPaid(true);
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Liveness check failed.");
    } finally {
      setBusy(false);
    }
  }

  async function recordPhrase() {
    setBusy(true);
    setNote("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      rec.ondataavailable = (event) => chunks.push(event.data);
      const done = new Promise<Blob>((resolve) => {
        rec.onstop = () => resolve(new Blob(chunks, { type: rec.mimeType || "audio/webm" }));
      });
      rec.start();
      await new Promise((resolve) => window.setTimeout(resolve, 4000));
      rec.stop();
      stream.getTracks().forEach((track) => track.stop());
      const blob = await done;
      const form = new FormData();
      form.set("audio", blob, "liveness.webm");
      form.set("transcript", voice?.livenessPhrase || "");
      await api("/api/voice-songs/liveness", { method: "POST", body: form });
      setPaid(true);
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Could not record the phrase.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthGate {...state}>
      {state.session && (
        <>
          <DemoBanner session={state.session} />
          <p className="font-mono text-xs uppercase tracking-widest text-ink-2">Consent and liveness</p>
          <h1 className="mt-2 font-display text-4xl font-bold sm:font-marquee sm:text-5xl">Your voice, in plain words</h1>
          <StepNav current="/voice-songs/consent" />
          <div className="card mt-8 max-w-3xl">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-2">{state.session.consentText}</p>
            <label className="mt-4 flex items-start gap-3 text-sm">
              <input type="checkbox" className="mt-1" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
              I agree. This is my own voice.
            </label>
            <button type="button" className="btn-primary mt-4" disabled={!accepted || busy || !voice} onClick={() => void consent()}>
              {busy ? "Saving…" : "Sign consent"}
            </button>
          </div>
          {voice?.livenessPhrase && (
            <div className="card mt-4 max-w-3xl">
              <p className="font-mono text-xs uppercase tracking-widest text-ink-3">Read this aloud</p>
              <p className="mt-3 font-display text-2xl font-bold leading-snug">{voice.livenessPhrase}</p>
              <p className="mt-2 text-sm text-ink-2">The phrase is random. A live check matches the words to your sample. Demo mode labels the check as a stand-in and does not claim a real voice match.</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button type="button" className="btn-primary" disabled={busy} onClick={() => void recordPhrase()}>Record 4 seconds</button>
                {state.session.actor.demo && (
                  <button type="button" className="btn-secondary" disabled={busy} onClick={() => void livenessDemo()}>Pass the demo reading</button>
                )}
              </div>
            </div>
          )}
          {(voice?.livenessPassed || paid) && !state.session.allAccess && !state.session.setupPaid && (
            <PayChoice sku="setup" allowance={false} onPaid={() => router.push("/voice-songs/train")} />
          )}
          {(voice?.livenessPassed || paid) && (state.session.allAccess || state.session.setupPaid) && (
            <div className="mt-4">
              <button type="button" className="btn-primary" onClick={() => router.push("/voice-songs/train")}>
                {state.session.setupPaid ? "Continue — setup is already paid" : "Continue — setup is included"}
              </button>
            </div>
          )}
          {note && <p className="mt-3 text-sm text-magenta">{note}</p>}
        </>
      )}
    </AuthGate>
  );
}
