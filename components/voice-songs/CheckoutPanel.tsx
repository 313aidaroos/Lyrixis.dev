"use client";

import { useEffect, useState } from "react";
import { SignInPrompt } from "./bits";
import {
  VOICE_RELEASE_IXIS,
  VOICE_RELEASE_SKU,
  VOICE_RELEASE_USD,
  VOICE_SETUP_IXIS,
  VOICE_SETUP_SKU,
  VOICE_SETUP_USD,
  VOICE_SONG_IXIS,
  VOICE_SONG_SKU,
  VOICE_SONG_USD,
  VOICE_TAKE_IXIS,
  VOICE_TAKE_SKU,
  type VoiceSongSku,
} from "@/lib/voice-songs/pricing";
import type { StudioPayload, StudioSong } from "./types";

const PRODUCTS: { sku: VoiceSongSku; name: string; price: string; ixis: string; card: boolean; note: string }[] = [
  { sku: VOICE_SETUP_SKU, name: "Voice setup", price: `$${VOICE_SETUP_USD}`, ixis: `${VOICE_SETUP_IXIS} Ixis`, card: true, note: "One-time private model." },
  { sku: VOICE_SONG_SKU, name: "Voice song", price: `$${VOICE_SONG_USD}`, ixis: `${VOICE_SONG_IXIS} Ixis`, card: true, note: "Three takes and a watermarked preview." },
  { sku: VOICE_TAKE_SKU, name: "Extra take", price: "Ixis only", ixis: `${VOICE_TAKE_IXIS} Ixis`, card: false, note: "One more full take. No card price." },
  { sku: VOICE_RELEASE_SKU, name: "Release", price: `$${VOICE_RELEASE_USD}`, ixis: `${VOICE_RELEASE_IXIS} Ixis`, card: true, note: "One single, after review." },
];

const DEMO_SONG: StudioSong = {
  id: "demo",
  title: "Window Down",
  theme: "a night drive home",
  mood: "Hopeful",
  genre: "Pop",
  lyrics: "",
  status: "draft",
  funding: "unpaid",
  takesAllowed: 3,
  takesUsed: 0,
  watermarked: true,
  providerMusic: null,
  providerVoice: null,
  error: null,
  hasAudio: false,
  createdAt: "2026-10-12T00:00:00.000Z",
};

export function CheckoutPanel({
  data,
  demo,
  sku,
  songId,
  paid,
  sessionId,
  cancelled,
}: {
  data: StudioPayload;
  demo: boolean;
  sku?: string;
  songId?: string;
  paid?: string;
  sessionId?: string;
  cancelled?: boolean;
}) {
  const songs = demo ? [DEMO_SONG] : data.songs;
  const initial = PRODUCTS.some((item) => item.sku === sku) ? (sku as VoiceSongSku) : VOICE_SONG_SKU;
  const [selected, setSelected] = useState<VoiceSongSku>(initial);
  const [chosenSong, setChosenSong] = useState(songId || songs[0]?.id || "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(cancelled ? "Checkout cancelled. Nothing was charged." : null);
  const [error, setError] = useState<string | null>(null);
  const product = PRODUCTS.find((item) => item.sku === selected) ?? PRODUCTS[1];
  const needsSong = selected !== VOICE_SETUP_SKU;

  useEffect(() => {
    if (demo || !sessionId || !paid) return;
    let cancel = false;
    void (async () => {
      setBusy(true);
      try {
        const response = await fetch("/api/voice-songs/checkout", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const json = (await response.json()) as { error?: { message?: string } };
        if (cancel) return;
        if (!response.ok) setError(json.error?.message || "Could not confirm the card payment.");
        else setMessage("Card payment confirmed. You can generate or submit the release.");
      } finally {
        if (!cancel) setBusy(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [demo, paid, sessionId]);

  if (!data.signedIn && !demo) return <SignInPrompt next="/voice-songs/checkout" />;

  async function pay(method: "ixis" | "card") {
    if (demo) {
      setMessage("Demo preview. No charge is sent.");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/voice-songs/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sku: selected, method, songId: needsSong ? chosenSong : undefined }),
      });
      const json = (await response.json()) as { error?: { message?: string }; url?: string; funding?: string };
      if (!response.ok) throw new Error(json.error?.message || "Checkout failed.");
      if (json.url) {
        window.location.href = json.url;
        return;
      }
      if (json.funding === "owner_bypass") setMessage("Owner test pass. No charge.");
      else if (json.funding === "all_access") setMessage("Included with All-Access this month.");
      else setMessage("Paid with Ixis.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PRODUCTS.map((item) => (
          <button
            key={item.sku}
            type="button"
            onClick={() => setSelected(item.sku)}
            className={`glass rounded-3xl p-5 text-left ${selected === item.sku ? "ring-1 ring-cyan/50" : ""}`}
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3">{item.name}</p>
            <p className="mt-3 font-body text-4xl font-extrabold tabular-nums">{item.price}</p>
            <p className="mt-1 text-sm text-ink-2">{item.ixis}</p>
            <p className="mt-3 text-sm text-ink-3">{item.note}</p>
          </button>
        ))}
      </div>

      <section className="card">
        <h2 className="font-display text-2xl font-bold">Pay for {product.name.toLowerCase()}</h2>
        <p className="mt-2 text-sm text-ink-2">
          {product.ixis}
          {product.card ? ` or ${product.price} by card.` : ". An extra take is Ixis only."} 100 Ixis equals $1. You keep 90% of master royalties.
        </p>
        {needsSong && (
          <label className="mt-5 block">
            <span className="label">Song</span>
            <select className="input mt-2" value={chosenSong} onChange={(event) => setChosenSong(event.target.value)}>
              {songs.length === 0 && <option value="">Write a lyric first</option>}
              {songs.map((song) => (
                <option key={song.id} value={song.id}>
                  {song.title}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" className="btn-primary" disabled={busy || (needsSong && !chosenSong)} onClick={() => void pay("ixis")}>
            {busy ? "Working…" : `Pay ${product.ixis}`}
          </button>
          {product.card && (
            <button type="button" className="btn-secondary" disabled={busy || (needsSong && !chosenSong)} onClick={() => void pay("card")}>
              Pay {product.price} by card
            </button>
          )}
        </div>
        {data.owner && <p className="mt-4 text-sm text-cyan">Owner test pass. This account skips the charge.</p>}
        {!data.payments?.card && (
          <p className="mt-4 text-sm text-gold">Card checkout is not configured. Missing STRIPE_SECRET_KEY. You can still pay with Ixis.</p>
        )}
        {!data.payments?.wallet && !demo && (
          <p className="mt-2 text-sm text-gold">Ixis checkout needs WALLET_API_KEY, and these products in the Apixis Wallet catalog: lyrixis.voice.setup, lyrixis.voice.song, lyrixis.voice.take, lyrixis.voice.release.</p>
        )}
        {message && <p className="mt-4 text-sm text-cyan">{message}</p>}
        {error && <p className="mt-4 text-sm text-magenta">{error}</p>}
      </section>
    </div>
  );
}
