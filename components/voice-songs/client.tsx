"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { VOICE_SONG_PRICES, type VoicePriceKey } from "@/lib/voice-songs/pricing";
import type { ReleaseRow, SongRow, TakeRow, UsageRow, VoiceRow } from "@/lib/voice-songs/types";

export type ProviderFlags = {
  elevenlabs: boolean;
  replicate: boolean;
  kits: boolean;
  toolost: boolean;
  revelator: boolean;
  card: boolean;
  cixy: boolean;
  speech: boolean;
};

export type Session = {
  voice: VoiceRow | null;
  songs: SongRow[];
  takes: TakeRow[];
  releases: ReleaseRow[];
  usage: UsageRow;
  allAccess: boolean;
  setupPaid: boolean;
  balance: number | null;
  period: string;
  consentText: string;
  config: { demoAvailable: boolean; store: string; providers: ProviderFlags };
  actor: { demo: boolean; email: string; allowance: boolean };
};

type ErrorBody = { error?: { code?: string; message?: string; buyUrl?: string; needed?: number } };

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, credentials: "same-origin" });
  const data = (await response.json().catch(() => ({}))) as T & ErrorBody;
  if (!response.ok) {
    const error = new Error(data.error?.message || `Request failed (${response.status})`) as Error & ErrorBody["error"];
    error.code = data.error?.code;
    error.buyUrl = data.error?.buyUrl;
    error.needed = data.error?.needed;
    throw error;
  }
  return data;
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [demoAvailable, setDemoAvailable] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api<Session>("/api/voice-desk");
      setSession(data);
      setNeedsAuth(false);
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "unauthorized") {
        setNeedsAuth(true);
        setDemoAvailable(true);
        setSession(null);
      } else {
        setError(err instanceof Error ? err.message : "Could not load Voice Songs.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { session, needsAuth, demoAvailable, error, setError, loading, reload };
}

export async function openDemo(allowance: boolean) {
  await api("/api/voice-desk/demo", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ allowance }),
  });
  window.location.href = "/voice-songs/desk";
}

export function AuthGate({
  needsAuth,
  demoAvailable,
  loading,
  error,
  children,
}: {
  needsAuth: boolean;
  demoAvailable: boolean;
  loading: boolean;
  error: string;
  children: React.ReactNode;
}) {
  if (loading) {
    return <p className="text-ink-2">Loading your studio…</p>;
  }
  if (needsAuth) {
    return (
      <div className="card max-w-xl">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-3">Apixis ID</p>
        <h2 className="mt-2 font-display text-2xl font-bold">Sign in to use your voice</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-2">
          Voice Songs uses your existing Apixis ID. Lyrixis does not create a second account. The model is tied to that ID and only your own voice can be cloned.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/auth/apixis/start?next=/voice-songs/desk" className="btn-primary">Log in with Apixis ID</Link>
          {demoAvailable && (
            <button type="button" className="btn-secondary" onClick={() => void openDemo(false)}>Open the demo</button>
          )}
        </div>
        {demoAvailable && (
          <p className="mt-4 text-xs text-ink-3">The demo walks the whole flow with stand-in audio. It does not call ElevenLabs, Replicate, or charge a card.</p>
        )}
      </div>
    );
  }
  return (
    <>
      {error && <p className="mb-4 rounded-xl border border-magenta/40 bg-magenta/10 px-4 py-3 text-sm text-ink">{error}</p>}
      {children}
    </>
  );
}

const STEPS = [
  { href: "/voice-songs/desk", label: "Studio" },
  { href: "/voice-songs/desk/record", label: "Record" },
  { href: "/voice-songs/desk/consent", label: "Consent" },
  { href: "/voice-songs/desk/train", label: "Train" },
  { href: "/voice-songs/desk/write", label: "Write" },
  { href: "/voice-songs/desk/release", label: "Release" },
];

export function StepNav({ current }: { current: string }) {
  return (
    <nav className="mt-6 flex gap-2 overflow-x-auto pb-1" aria-label="Voice Songs steps">
      {STEPS.map((step) => (
        <Link
          key={step.href}
          href={step.href}
          className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs ${current === step.href ? "bg-white/15 text-ink" : "text-ink-3 hover:text-ink"}`}
          style={{ border: "1px solid rgba(168,150,255,0.2)" }}
        >
          {step.label}
        </Link>
      ))}
    </nav>
  );
}

export function DemoBanner({ session }: { session: Session }) {
  if (!session.actor.demo) return null;
  return (
    <div className="mb-6 rounded-2xl border border-cyan/30 bg-cyan/10 px-4 py-3 text-sm text-ink">
      <strong>Demo mode.</strong> Stand-in audio, demo Ixis ({session.balance?.toLocaleString() ?? "—"} left), and no vendor calls.
      {session.actor.allowance ? " All-Access allowances are on for this preview." : " Pay the locked prices with demo Ixis or the demo card."}
      <button type="button" className="ml-3 underline" onClick={() => void openDemo(!session.actor.allowance)}>
        {session.actor.allowance ? "Turn allowances off" : "Preview All-Access"}
      </button>
    </div>
  );
}

export function ProviderLine({ session }: { session: Session }) {
  const p = session.config.providers;
  const item = (on: boolean, name: string, missing: string) => (
    <li className={on ? "text-ink" : "text-ink-3"}>{on ? `${name} ready` : `${name}: not configured (${missing})`}</li>
  );
  return (
    <ul className="mt-3 space-y-1 text-xs">
      {item(p.elevenlabs, "ElevenLabs Music", "ELEVENLABS_API_KEY")}
      {item(p.replicate, "Replicate voice", "REPLICATE_API_TOKEN")}
      {item(p.kits, "Kits.ai fallback", "KITS_API_KEY")}
      {item(p.card, "Card checkout", "STRIPE_SECRET_KEY")}
      {item(p.toolost || p.revelator, "Distributor", "TOO_LOST_API_KEY or REVELATOR_API_KEY")}
      {item(p.cixy, "Cixy", "ANTHROPIC_API_KEY")}
    </ul>
  );
}

function keyFor(sku: VoicePriceKey) {
  const storageKey = `vs-pay-${sku}`;
  const existing = window.sessionStorage.getItem(storageKey);
  if (existing) return existing;
  const next = `vs${sku.slice(0, 2)}${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
  window.sessionStorage.setItem(storageKey, next);
  return next;
}

export function PayChoice({
  sku,
  allowance,
  onPaid,
}: {
  sku: VoicePriceKey;
  allowance: boolean;
  onPaid: (idempotencyKey: string) => void;
}) {
  const price = VOICE_SONG_PRICES[sku];
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  async function checkout(method: "ixis" | "card" | "allowance") {
    setBusy(method);
    setMessage("");
    const idempotencyKey = keyFor(sku);
    try {
      const result = await api<{ payment: { status: string }; checkoutUrl?: string }>("/api/voice-desk/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sku,
          method,
          idempotencyKey,
          returnUrl: window.location.href.split("#")[0],
        }),
      });
      if (result.checkoutUrl && result.payment.status === "pending") {
        window.location.href = result.checkoutUrl;
        return;
      }
      window.sessionStorage.removeItem(`vs-pay-${sku}`);
      onPaid(idempotencyKey);
    } catch (error) {
      const extra = error as { buyUrl?: string };
      setMessage(error instanceof Error ? error.message : "Checkout failed.");
      if (extra.buyUrl) setMessage(`${error instanceof Error ? error.message : "Not enough Ixis."} Buy Ixis, then come back.`);
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="card mt-4">
      <p className="font-mono text-xs uppercase tracking-widest text-ink-3">Checkout</p>
      <p className="mt-2 font-display text-xl font-bold">{price.label}</p>
      <p className="mt-1 text-sm text-ink-2">{price.detail}</p>
      <p className="mt-3 font-display text-3xl font-extrabold">${price.usd} <span className="text-base font-semibold text-ink-2">or {price.ixis} Ixis</span></p>
      <p className="mt-1 text-xs text-ink-3">100 Ixis = $1. Choose Ixis from the Apixis Wallet, or card when card checkout is configured. Wallet product {price.productKey}.</p>
      {message && <p className="mt-3 text-sm text-magenta">{message}</p>}
      <div className="mt-4 flex flex-wrap gap-3">
        {allowance && (
          <button type="button" className="btn-primary" disabled={Boolean(busy)} onClick={() => void checkout("allowance")}>
            {busy === "allowance" ? "Applying…" : "Use All-Access allowance"}
          </button>
        )}
        <button type="button" className="btn-primary" disabled={Boolean(busy)} onClick={() => void checkout("ixis")}>
          {busy === "ixis" ? "Holding Ixis…" : `Pay ${price.ixis} Ixis`}
        </button>
        <button type="button" className="btn-secondary" disabled={Boolean(busy)} onClick={() => void checkout("card")}>
          {busy === "card" ? "Opening card…" : `Pay $${price.usd} by card`}
        </button>
      </div>
    </div>
  );
}

export function audioUrl(path: string | null) {
  if (!path) return "";
  return `/api/voice-desk/audio?path=${encodeURIComponent(path)}`;
}
