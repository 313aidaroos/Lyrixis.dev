"use client";

import { useRef, useState } from "react";
import { SignInPrompt } from "./bits";
import { uploadToSignedUrl } from "./upload";
import type { StudioPayload } from "./types";

const DEMO_PHRASE = "My voice is my own and I am recording it for my song.";

export function ConsentPanel({ data, demo, onChanged }: { data: StudioPayload; demo: boolean; onChanged: () => Promise<void> }) {
  const [accepted, setAccepted] = useState(demo || Boolean(data.profile?.consentAccepted));
  const [phrase, setPhrase] = useState<string | null>(demo ? DEMO_PHRASE : data.profile?.phrase ?? null);
  const [passed, setPassed] = useState(demo || Boolean(data.profile?.livenessPassed));
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  if (!data.signedIn && !demo) return <SignInPrompt next="/voice-songs/consent" />;

  async function sign() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/voice-songs/consent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accept: true }),
      });
      const json = (await response.json()) as { error?: { message?: string }; phrase?: string };
      if (!response.ok) throw new Error(json.error?.message || "Could not save consent.");
      setPhrase(json.phrase ?? null);
      setAccepted(true);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Consent failed.");
    } finally {
      setBusy(false);
    }
  }

  async function readAloud() {
    setError(null);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
    const media = new MediaRecorder(stream, { mimeType: mime });
    chunks.current = [];
    const started = Date.now();
    media.ondataavailable = (event) => {
      if (event.data.size) chunks.current.push(event.data);
    };
    media.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      const blob = new Blob(chunks.current, { type: media.mimeType || "audio/webm" });
      void submitPhrase(blob, media.mimeType || "audio/webm", Math.max(1, (Date.now() - started) / 1000));
    };
    media.start();
    setRecorder(media);
    setRecording(true);
  }

  async function submitPhrase(blob: Blob, mime: string, durationSeconds: number) {
    setBusy(true);
    try {
      const prepared = await fetch("/api/voice-songs/liveness", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mime, bytes: blob.size, durationSeconds }),
      });
      const json = (await prepared.json()) as { error?: { message?: string }; upload?: { signedUrl: string; path: string }; phrase?: string };
      if (!prepared.ok || !json.upload) throw new Error(json.error?.message || "Could not start the phrase upload.");
      if (json.phrase) setPhrase(json.phrase);
      await uploadToSignedUrl(json.upload.signedUrl, blob, "phrase.webm");
      const done = await fetch("/api/voice-songs/liveness", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: json.upload.path, mime, bytes: blob.size, durationSeconds }),
      });
      const finished = (await done.json()) as { error?: { message?: string } };
      if (!done.ok) throw new Error(finished.error?.message || "The phrase did not match.");
      setPassed(true);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Phrase check failed.");
    } finally {
      setBusy(false);
      setRecording(false);
    }
  }

  const text = data.consent || "I am recording my own voice. Lyrixis uses it only for my Apixis ID, and I can delete it.";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="card">
        <p className="font-mono text-[11px] uppercase tracking-widest text-ink-3">Consent</p>
        <h2 className="mt-2 font-display text-3xl font-bold">Your voice, your say</h2>
        <p className="mt-4 text-sm leading-relaxed text-ink-2">{text}</p>
        <label className="mt-5 flex items-start gap-3 text-sm text-ink">
          <input type="checkbox" className="mt-1" checked={accepted} disabled={demo} onChange={(event) => setAccepted(event.target.checked)} />
          I agree. This is my own voice, and I am not imitating anyone else.
        </label>
        <button type="button" className="btn-primary mt-5" disabled={!accepted || busy || demo || Boolean(data.profile?.consentAccepted)} onClick={() => void sign()}>
          {data.profile?.consentAccepted || demo ? "Consent saved" : "Sign consent"}
        </button>
      </section>
      <section className="card">
        <p className="font-mono text-[11px] uppercase tracking-widest text-ink-3">Read aloud</p>
        <h2 className="mt-2 font-display text-3xl font-bold">Say this phrase</h2>
        <p className="mt-4 rounded-2xl border border-line bg-black/20 p-4 text-lg leading-relaxed text-ink">
          {phrase || "Sign the consent and the phrase appears here. It changes each time."}
        </p>
        <p className="mt-3 text-sm text-ink-3">Read it in the same voice as the sample. We check the words. We do not clone anyone else.</p>
        {!recording ? (
          <button type="button" className="btn-primary mt-5" disabled={busy || demo || (!phrase && !data.profile?.consentAccepted)} onClick={() => void readAloud().catch((err) => setError(err instanceof Error ? err.message : "Mic blocked."))}>
            {busy ? "Checking…" : "Record the phrase"}
          </button>
        ) : (
          <button type="button" className="btn-secondary mt-5" onClick={() => recorder?.stop()}>
            Stop
          </button>
        )}
        {passed && <p className="mt-4 text-sm text-cyan">{demo ? "Demo check passed." : "Phrase matched. This voice is cleared for your songs."}</p>}
        {error && <p className="mt-3 text-sm text-magenta">{error}</p>}
      </section>
    </div>
  );
}
