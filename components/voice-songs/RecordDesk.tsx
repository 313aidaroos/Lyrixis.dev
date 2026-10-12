"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SAMPLE_MAX_SECONDS, SAMPLE_MIN_SECONDS } from "@/lib/voice-songs/pricing";
import { AuthGate, DemoBanner, StepNav, api, useSession } from "./client";

const PROMPTS = [
  "Talk for a minute about a place you know well. Keep a steady pace.",
  "Sing a simple melody on “la”, then the same melody with words you make up.",
  "Read this: “The window is open, the street is quiet, and I am the only voice in the room.”",
  "Hum, then speak your name and a sentence you have never sung before.",
];

export function RecordDesk() {
  const router = useRouter();
  const state = useSession();
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [level, setLevel] = useState(0);
  const [peak, setPeak] = useState(0);
  const [clipping, setClipping] = useState(0);
  const [rms, setRms] = useState(0);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<number | null>(null);
  const audioContext = useRef<AudioContext | null>(null);

  useEffect(() => () => {
    if (timer.current) window.clearInterval(timer.current);
    void audioContext.current?.close();
  }, []);

  async function start() {
    setNote("");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const context = new AudioContext();
    audioContext.current = context;
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    const rec = new MediaRecorder(stream);
    chunks.current = [];
    rec.ondataavailable = (event) => {
      if (event.data.size) chunks.current.push(event.data);
    };
    rec.start(250);
    recorder.current = rec;
    setRecording(true);
    setSeconds(0);
    const started = Date.now();
    let clipHits = 0;
    let frames = 0;
    let sumSq = 0;
    let max = 0;
    timer.current = window.setInterval(() => {
      analyser.getByteTimeDomainData(data);
      let framePeak = 0;
      let frameSq = 0;
      for (let i = 0; i < data.length; i += 1) {
        const sample = Math.abs((data[i]! - 128) / 128);
        framePeak = Math.max(framePeak, sample);
        frameSq += sample * sample;
        if (sample > 0.98) clipHits += 1;
      }
      frames += data.length;
      sumSq += frameSq;
      max = Math.max(max, framePeak);
      setLevel(framePeak);
      setPeak(max);
      setRms(Math.sqrt(sumSq / frames));
      setClipping(clipHits / frames);
      setSeconds(Math.floor((Date.now() - started) / 1000));
    }, 200);
  }

  function stop() {
    const rec = recorder.current;
    if (!rec) return;
    rec.onstop = () => {
      rec.stream.getTracks().forEach((track) => track.stop());
    };
    rec.stop();
    if (timer.current) window.clearInterval(timer.current);
    setRecording(false);
  }

  async function upload(blob: Blob, meta: { seconds: number; peak: number; rms: number; clippingRatio: number }) {
    setBusy(true);
    setNote("");
    const form = new FormData();
    form.set("audio", blob, "sample.webm");
    form.set("seconds", String(meta.seconds));
    form.set("peak", String(meta.peak));
    form.set("rms", String(meta.rms));
    form.set("clippingRatio", String(meta.clippingRatio));
    try {
      await api("/api/voice-songs/sample", { method: "POST", body: form });
      router.push("/voice-songs/consent");
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function demoSample() {
    setBusy(true);
    setNote("");
    try {
      await api("/api/voice-songs/sample", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ demoStandIn: true, seconds: 8, peak: 0.4, rms: 0.08, clippingRatio: 0 }),
      });
      router.push("/voice-songs/consent");
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Demo sample failed.");
    } finally {
      setBusy(false);
    }
  }

  const longEnough = seconds >= SAMPLE_MIN_SECONDS && seconds <= SAMPLE_MAX_SECONDS;
  const blob = chunks.current.length ? new Blob(chunks.current, { type: recorder.current?.mimeType || "audio/webm" }) : null;

  return (
    <AuthGate {...state}>
      {state.session && (
        <>
          <DemoBanner session={state.session} />
          <p className="font-mono text-xs uppercase tracking-widest text-ink-2">Your voice</p>
          <h1 className="mt-2 font-display text-4xl font-bold sm:font-marquee sm:text-5xl">Record a sample</h1>
          <p className="mt-3 max-w-2xl text-ink-2">Talk and sing for 3 to 5 minutes. We check length, clipping, and level before anything is stored. Only this Apixis ID can use the model.</p>
          <StepNav current="/voice-songs/record" />
          <ol className="mt-8 grid gap-3 sm:grid-cols-2">
            {PROMPTS.map((prompt, index) => (
              <li key={prompt} className="card text-sm text-ink-2"><span className="font-mono text-xs text-cyan">0{index + 1}</span><p className="mt-2">{prompt}</p></li>
            ))}
          </ol>
          <div className="card mt-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-ink-3">{recording ? "Recording" : "Ready"}</p>
                <p className="font-display text-4xl font-extrabold">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</p>
              </div>
              <div className="h-16 flex-1 overflow-hidden rounded-xl bg-black/30" aria-hidden>
                <div className="h-full bg-gradient-to-r from-violet via-magenta to-cyan" style={{ width: `${Math.min(100, level * 100)}%` }} />
              </div>
            </div>
            <ul className="mt-4 space-y-1 text-sm text-ink-2">
              <li>{longEnough ? "Length is in the 3–5 minute window." : `Aim for ${SAMPLE_MIN_SECONDS / 60}–${SAMPLE_MAX_SECONDS / 60} minutes.`}</li>
              <li>{clipping > 0.02 || peak >= 0.99 ? "Clipping — move back from the mic." : "No heavy clipping."}</li>
              <li>{rms > 0.01 && rms < 0.45 ? "Level looks usable." : "Watch the level: not silent, not slammed."}</li>
            </ul>
            <div className="mt-5 flex flex-wrap gap-3">
              {!recording ? (
                <button type="button" className="btn-primary" onClick={() => void start().catch((error: unknown) => setNote(error instanceof Error ? error.message : "Microphone blocked."))}>Start recording</button>
              ) : (
                <button type="button" className="btn-secondary" onClick={stop}>Stop</button>
              )}
              <button
                type="button"
                className="btn-primary"
                disabled={!blob || recording || busy}
                onClick={() => blob && void upload(blob, { seconds, peak, rms, clippingRatio: clipping })}
              >
                {busy ? "Saving…" : "Save sample"}
              </button>
              {state.session.actor.demo && (
                <button type="button" className="btn-secondary" disabled={busy} onClick={() => void demoSample()}>Use a demo sample</button>
              )}
            </div>
            {note && <p className="mt-3 text-sm text-magenta">{note}</p>}
          </div>
        </>
      )}
    </AuthGate>
  );
}
