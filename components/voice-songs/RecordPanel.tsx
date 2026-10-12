"use client";

import { useEffect, useRef, useState } from "react";
import { SignInPrompt } from "./bits";
import { uploadToSignedUrl } from "./upload";
import type { StudioPayload } from "./types";

type Level = { peak: number; rms: number };

export function RecordPanel({ data, demo, onChanged }: { data: StudioPayload; demo: boolean; onChanged: () => Promise<void> }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(demo ? 192 : 0);
  const [level, setLevel] = useState(demo ? 0.42 : 0);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(demo);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const started = useRef(0);
  const levels = useRef<Level>({ peak: 0, rms: 0 });
  const timer = useRef<number | null>(null);

  useEffect(() => () => stopTracks(), []);

  function stopTracks() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (timer.current) window.clearInterval(timer.current);
  }

  async function start() {
    setError(null);
    setSaved(false);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    const audio = new AudioContext();
    const source = audio.createMediaStreamSource(stream);
    const analyser = audio.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    const bins = new Uint8Array(analyser.fftSize);
    const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    chunks.current = [];
    levels.current = { peak: 0, rms: 0 };
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.current.push(event.data);
    };
    recorder.start(200);
    recRef.current = recorder;
    started.current = Date.now();
    setRecording(true);
    setSeconds(0);
    timer.current = window.setInterval(() => {
      analyser.getByteTimeDomainData(bins);
      let peak = 0;
      let sum = 0;
      for (const value of bins) {
        const sample = Math.abs(value - 128) / 128;
        peak = Math.max(peak, sample);
        sum += sample * sample;
      }
      const rms = Math.sqrt(sum / bins.length);
      levels.current = { peak: Math.max(levels.current.peak, peak), rms: Math.max(levels.current.rms, rms) };
      setLevel(rms);
      setSeconds(Math.floor((Date.now() - started.current) / 1000));
    }, 200);
  }

  async function finish(blob: Blob, mime: string, durationSeconds: number, peak?: number, rms?: number) {
    setBusy(true);
    setError(null);
    try {
      const prepared = await fetch("/api/voice-songs/sample", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mime, bytes: blob.size, durationSeconds, peak, rms }),
      });
      const json = (await prepared.json()) as { error?: { message?: string }; upload?: { signedUrl: string; path: string }; warnings?: string[] };
      if (!prepared.ok || !json.upload) throw new Error(json.error?.message || "Could not start the upload.");
      setWarnings(json.warnings ?? []);
      await uploadToSignedUrl(json.upload.signedUrl, blob, "sample.webm");
      const done = await fetch("/api/voice-songs/sample", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: json.upload.path, mime, bytes: blob.size, durationSeconds, peak, rms }),
      });
      const finished = (await done.json()) as { error?: { message?: string } };
      if (!done.ok) throw new Error(finished.error?.message || "Could not save the sample.");
      setSaved(true);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function stop() {
    const recorder = recRef.current;
    if (!recorder) return;
    const durationSeconds = Math.max(1, (Date.now() - started.current) / 1000);
    const mime = recorder.mimeType || "audio/webm";
    const blob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks.current, { type: mime }));
      recorder.stop();
    });
    setRecording(false);
    stopTracks();
    await finish(blob, mime, durationSeconds, levels.current.peak, levels.current.rms);
  }

  async function onFile(file: File) {
    const url = URL.createObjectURL(file);
    const audio = document.createElement("audio");
    audio.src = url;
    const durationSeconds = await new Promise<number>((resolve) => {
      audio.onloadedmetadata = () => resolve(Number.isFinite(audio.duration) ? audio.duration : 0);
      audio.onerror = () => resolve(0);
    });
    URL.revokeObjectURL(url);
    setSeconds(Math.round(durationSeconds));
    await finish(file, file.type || "audio/webm", durationSeconds);
  }

  async function erase() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/voice-songs/profile", { method: "DELETE" });
      if (!response.ok) {
        const json = (await response.json()) as { error?: { message?: string } };
        throw new Error(json.error?.message || "Could not delete the voice.");
      }
      setSaved(false);
      setSeconds(0);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  if (!data.signedIn && !demo) return <SignInPrompt next="/voice-songs/record" />;

  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
      <section className="card">
        <p className="font-mono text-[11px] uppercase tracking-widest text-ink-3">Sample</p>
        <h2 className="mt-2 font-display text-3xl font-bold">Record your voice</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-2">
          Talk for a minute, then sing a little. Three minutes is the aim. Use a quiet room and stay a hand&apos;s width from the mic.
        </p>
        <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-ink-2">
          <li>Say your name and what the song is about.</li>
          <li>Read two sentences at a normal pace.</li>
          <li>Hum a melody, then sing a few lines you just wrote.</li>
        </ol>
        <div className="mt-6 flex items-end justify-between gap-4">
          <p className="font-body text-5xl font-extrabold tabular-nums">{clock}</p>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
            <div className="h-full rounded-full bg-gradient-to-r from-violet to-cyan" style={{ width: `${Math.min(100, Math.round(level * 220))}%` }} />
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          {!recording ? (
            <button type="button" className="btn-primary" disabled={busy || demo} onClick={() => void start().catch((err) => setError(err instanceof Error ? err.message : "Mic blocked."))}>
              {busy ? "Saving…" : "Start recording"}
            </button>
          ) : (
            <button type="button" className="btn-secondary" onClick={() => void stop()}>
              Stop and save
            </button>
          )}
          <label className="btn-secondary cursor-pointer">
            Use a saved file
            <input
              className="sr-only"
              type="file"
              accept="audio/*"
              disabled={busy || demo}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void onFile(file);
              }}
            />
          </label>
        </div>
        {saved && <p className="mt-4 text-sm text-cyan">{demo ? "Demo sample, 3:12, level looks steady." : "Sample saved on your account."}</p>}
        {warnings.map((warning) => (
          <p key={warning} className="mt-2 text-sm text-gold">{warning}</p>
        ))}
        {error && <p className="mt-3 text-sm text-magenta">{error}</p>}
      </section>
      <aside className="card">
        <h3 className="font-display text-xl font-bold">This account</h3>
        <p className="mt-3 text-sm text-ink-2">{data.email || (demo ? "you@apixis.dev" : "Signed in")}</p>
        <p className="mt-2 text-sm text-ink-3">
          {data.profile?.sampleSeconds ? `${Math.round(data.profile.sampleSeconds)} seconds on file.` : demo ? "192 seconds on file." : "No sample yet."}
        </p>
        <button type="button" className="btn-secondary mt-6 px-4 py-2 text-sm" disabled={busy || (!data.profile && !demo)} onClick={() => void erase()}>
          Delete my voice
        </button>
        <p className="mt-3 text-xs leading-relaxed text-ink-3">Deletes the sample, the model, and the songs tied to this voice. This cannot be undone.</p>
      </aside>
    </div>
  );
}
