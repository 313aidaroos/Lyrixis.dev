"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  RECORDING_SCRIPT,
  RETAKE_TIPS,
  cuesForSample,
  scriptProgress,
  type ScriptCue,
} from "@/lib/voice-songs/recording-script";
import { SignInPrompt } from "./bits";
import { stitchTakes } from "./stitch-takes";
import { uploadToSignedUrl } from "./upload";
import type { StudioPayload } from "./types";

type Level = { peak: number; rms: number };
type Take = { seconds: number; peak: number; rms: number; blob: Blob | null };

export function RecordPanel({ data, demo, onChanged }: { data: StudioPayload; demo: boolean; onChanged: () => Promise<void> }) {
  const [index, setIndex] = useState(0);
  const [takes, setTakes] = useState<Record<string, Take>>({});
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [tip, setTip] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const started = useRef(0);
  const levels = useRef<Level>({ peak: 0, rms: 0 });
  const timer = useRef<number | null>(null);

  const cue = RECORDING_SCRIPT[index] ?? RECORDING_SCRIPT[0];
  const progress = scriptProgress(Object.keys(takes));

  useEffect(() => () => stopTracks(), []);

  function stopTracks() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
  }

  function levelTip(current: ScriptCue, peak: number, rms: number): string | null {
    if (current.kind === "room" && (rms > 0.08 || peak > 0.35)) {
      return "The room is noisy. Close a window or step away from the fan, then re-record this check.";
    }
    if (current.kind !== "room" && peak >= 0.98) {
      return "That take clipped. Move back a little and re-record this line.";
    }
    if (current.kind !== "room" && peak > 0 && peak < 0.04) {
      return "That take is very quiet. Check the mic is selected, then re-record this line.";
    }
    return null;
  }

  async function start() {
    setError(null);
    setTip(null);
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

  async function stop() {
    const recorder = recRef.current;
    const current = cue;
    if (!recorder) return;
    const durationSeconds = Math.max(1, (Date.now() - started.current) / 1000);
    const mime = recorder.mimeType || "audio/webm";
    const blob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks.current, { type: mime }));
      recorder.stop();
    });
    setRecording(false);
    stopTracks();
    const take = { seconds: durationSeconds, peak: levels.current.peak, rms: levels.current.rms, blob };
    setTakes((prev) => ({ ...prev, [current.id]: take }));
    setTip(levelTip(current, take.peak, take.rms));
    setSaved(false);
    const at = RECORDING_SCRIPT.findIndex((item) => item.id === current.id);
    if (at >= 0 && at < RECORDING_SCRIPT.length - 1) setIndex(at + 1);
  }

  function markDemo() {
    const current = cue;
    setTakes((prev) => ({ ...prev, [current.id]: { seconds: current.seconds, peak: 0.4, rms: current.kind === "room" ? 0.01 : 0.2, blob: null } }));
    setTip(null);
    setSaved(false);
    const at = RECORDING_SCRIPT.findIndex((item) => item.id === current.id);
    if (at >= 0 && at < RECORDING_SCRIPT.length - 1) setIndex(at + 1);
  }

  function retake(id: string) {
    setTakes((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    const at = RECORDING_SCRIPT.findIndex((item) => item.id === id);
    if (at >= 0) setIndex(at);
    setSaved(false);
    setTip("Re-record this line. The others stay as they are.");
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
      await uploadToSignedUrl(json.upload.signedUrl, blob, mime.includes("wav") ? "sample.wav" : "sample.webm");
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

  async function saveScript() {
    if (demo) {
      setSaved(true);
      return;
    }
    const blobs = cuesForSample()
      .map((item) => takes[item.id]?.blob)
      .filter((blob): blob is Blob => blob instanceof Blob);
    if (blobs.length < cuesForSample().length) {
      setError("Record every line, including the consent line, before you save.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const wav = await stitchTakes(blobs);
      const duration = cuesForSample().reduce((sum, item) => sum + (takes[item.id]?.seconds || 0), 0);
      const peak = Math.max(...cuesForSample().map((item) => takes[item.id]?.peak || 0));
      await finish(wav, "audio/wav", duration, peak, 0.2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join the lines.");
      setBusy(false);
    }
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
      setTakes({});
      setIndex(0);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  if (!data.signedIn && !demo) return <SignInPrompt next="/voice-songs/record" />;

  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  const elevenDemo = demo || !data.providers?.elevenlabs;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
      <section className="card">
        <p className="font-mono text-[11px] uppercase tracking-widest text-ink-3">Voice setup script</p>
        <h2 className="mt-2 font-display text-3xl font-bold">Read it line by line</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-2">
          A quiet room, then the consent line, then a short phonetically balanced script. About three minutes in all.
        </p>
        {elevenDemo && (
          <p data-testid="elevenlabs-demo" className="mt-4 rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-gold">
            Demo mode. ElevenLabs has no key on this server, so this does not train a live cloned voice.
          </p>
        )}

        <div className="mt-6">
          <div className="flex items-center justify-between gap-3 text-sm">
            <p className="font-mono text-[11px] uppercase tracking-widest text-cyan" data-testid="script-progress">
              {progress.label}
            </p>
            <p className="text-ink-3">{cue.title}</p>
          </div>
          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-label="Script progress"
            aria-valuemin={0}
            aria-valuemax={progress.total}
            aria-valuenow={progress.done}
          >
            <div className="h-full rounded-full bg-gradient-to-r from-violet to-cyan" style={{ width: `${Math.round(progress.ratio * 100)}%` }} />
          </div>
        </div>

        <p className="mt-6 text-sm text-ink-3">{cue.pace}</p>
        <p data-testid="script-line" className="mt-3 rounded-2xl border border-line bg-black/20 p-4 text-lg leading-relaxed text-ink">
          {cue.text}
        </p>

        <div className="mt-6 flex items-end justify-between gap-4">
          <p className="font-body text-5xl font-extrabold tabular-nums">{recording ? clock : `${cue.seconds}s`}</p>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
            <div className="h-full rounded-full bg-gradient-to-r from-violet to-cyan" style={{ width: `${Math.min(100, Math.round(level * 220))}%` }} />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {demo ? (
            <button type="button" className="btn-primary" data-testid="record-line" disabled={busy} onClick={markDemo}>
              {takes[cue.id] ? "Mark this line again" : "Mark this line"}
            </button>
          ) : !recording ? (
            <button
              type="button"
              className="btn-primary"
              data-testid="record-line"
              disabled={busy}
              onClick={() => void start().catch((err) => setError(err instanceof Error ? err.message : "Mic blocked."))}
            >
              {takes[cue.id] ? "Re-record this line" : "Record this line"}
            </button>
          ) : (
            <button type="button" className="btn-secondary" onClick={() => void stop()}>
              Stop
            </button>
          )}
          {progress.complete && (
            <button type="button" className="btn-primary" data-testid="save-sample" disabled={busy} onClick={() => void saveScript()}>
              {busy ? "Saving…" : "Save sample"}
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

        {tip && <p className="mt-4 text-sm text-gold">{tip}</p>}
        {!data.owner && !demo && (
          <p className="mt-4 text-sm text-ink-2">
            Voice setup is $5 (500 Ixis).{" "}
            <Link className="font-semibold text-cyan" href="/voice-songs/checkout?sku=lyrixis.voice.setup">
              Pay for setup
            </Link>
          </p>
        )}
        {saved && (
          <p className="mt-4 text-sm text-cyan" data-testid="sample-saved">
            {demo ? "Demo sample marked. Nothing was uploaded and no voice was cloned." : "Sample saved on your account."}
          </p>
        )}
        {warnings.map((warning) => (
          <p key={warning} className="mt-2 text-sm text-gold">{warning}</p>
        ))}
        {error && <p className="mt-3 text-sm text-magenta">{error}</p>}
      </section>

      <aside className="space-y-4">
        <article className="card">
          <h3 className="font-display text-xl font-bold">Lines</h3>
          <ol className="mt-4 space-y-2">
            {RECORDING_SCRIPT.map((item, itemIndex) => {
              const done = Boolean(takes[item.id]);
              return (
                <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
                  <button type="button" className={`text-left ${itemIndex === index ? "text-ink" : "text-ink-2"}`} onClick={() => setIndex(itemIndex)}>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-ink-3">{done ? "Done" : "Open"}</span>
                    <span className="mt-0.5 block">{item.title}</span>
                  </button>
                  {done && (
                    <button type="button" className="text-sm font-semibold text-cyan" data-testid={`rerecord-${item.id}`} onClick={() => retake(item.id)}>
                      Re-record
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
        </article>
        <article className="card">
          <h3 className="font-display text-xl font-bold">Retake tips</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink-2">
            {RETAKE_TIPS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <article className="card">
          <h3 className="font-display text-xl font-bold">This account</h3>
          <p className="mt-3 text-sm text-ink-2">{data.email || (demo ? "you@apixis.dev" : "Signed in")}</p>
          <p className="mt-2 text-sm text-ink-3">
            {data.profile?.sampleSeconds ? `${Math.round(data.profile.sampleSeconds)} seconds on file.` : "No sample yet."}
          </p>
          <button type="button" className="btn-secondary mt-6 px-4 py-2 text-sm" disabled={busy || (!data.profile && !demo)} onClick={() => void erase()}>
            Delete my voice
          </button>
          <p className="mt-3 text-xs leading-relaxed text-ink-3">Deletes the sample, the model, and the songs tied to this voice. This cannot be undone.</p>
        </article>
      </aside>
    </div>
  );
}
