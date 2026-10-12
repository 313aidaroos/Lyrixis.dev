"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";
import {
  ALL_ACCESS_RELEASES_PER_MONTH,
  ALL_ACCESS_VOICE_SONGS_PER_MONTH,
  ROYALTY_LYRIXIS_BPS,
  ROYALTY_USER_BPS,
  TAKES_INCLUDED,
  VOICE_RELEASE_IXIS,
  VOICE_RELEASE_USD,
  VOICE_SETUP_IXIS,
  VOICE_SETUP_SKU,
  VOICE_SETUP_USD,
  VOICE_SONG_IXIS,
  VOICE_SONG_SKU,
  VOICE_SONG_USD,
  VOICE_TAKE_IXIS,
  VOICE_TAKE_SKU,
  VOICE_RELEASE_SKU,
} from "@/lib/voice-songs/pricing";
import { ProviderNote } from "./bits";
import { RecordPanel } from "./RecordPanel";
import { ConsentPanel } from "./ConsentPanel";
import { LyricsPanel } from "./LyricsPanel";
import { PreviewPanel } from "./PreviewPanel";
import type { StudioPayload } from "./types";

const TABS = [
  { href: "/voice-songs", label: "Overview" },
  { href: "/voice-songs/record", label: "Record" },
  { href: "/voice-songs/consent", label: "Consent" },
  { href: "/voice-songs/lyrics", label: "Lyrics" },
  { href: "/voice-songs/preview", label: "Song" },
];

const EMPTY: StudioPayload = {
  signedIn: false,
  owner: false,
  ownerEmail: false,
  providers: {
    elevenlabs: false,
    replicate: false,
    kits: false,
    speech: false,
    mock: false,
    missing: ["ELEVENLABS_API_KEY", "REPLICATE_API_TOKEN"],
    optionalMissing: ["KITS_API_KEY", "TRANSCRIPTION_API_KEY"],
    musicReady: false,
    voiceReady: false,
    liveReady: false,
  },
  consent: "",
  database: true,
  profile: null,
  songs: [],
};

export function VoiceStudio({ step, demo = false, songId }: { step: string; demo?: boolean; songId?: string }) {
  const pathname = usePathname();
  const [data, setData] = useState<StudioPayload>(EMPTY);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/voice-songs/me", { cache: "no-store" });
      if (response.ok) setData((await response.json()) as StudioPayload);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const tabHref = (href: string) => (demo ? `${href}?demo=1` : href);

  return (
    <div>
      <SiteNav />
      <main className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-cyan">Voice songs</p>
        <h1 className="mt-3 max-w-3xl font-display text-4xl font-extrabold sm:font-marquee sm:text-6xl">
          Sing it <span className="grad-text">yourself.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-ink-2">
          Record your own voice, read a phrase so we know it is you, write the lyric with Cixy, then preview a song sung in that voice.
        </p>

        <nav className="mt-8 flex gap-2 overflow-x-auto pb-1" aria-label="Voice song steps">
          {TABS.map((tab) => {
            const active = tab.href === "/voice-songs" ? pathname === "/voice-songs" : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tabHref(tab.href)}
                data-active={active}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${
                  active ? "border-cyan/50 bg-white/10 text-ink" : "border-line text-ink-2 hover:text-ink"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        {demo && (
          <p className="mt-6 rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-gold">
            Demo preview. The player below is a placeholder tone, not a cloned voice. A real song needs your recording and the music keys.
          </p>
        )}

        <div className="mt-8">
          {step === "overview" && <Overview data={data} demo={demo} />}
          {step === "record" && <RecordPanel data={data} demo={demo} onChanged={refresh} />}
          {step === "consent" && <ConsentPanel data={data} demo={demo} onChanged={refresh} />}
          {step === "lyrics" && <LyricsPanel data={data} demo={demo} onChanged={refresh} />}
          {step === "preview" && <PreviewPanel data={data} demo={demo} songId={songId} loading={loading} onChanged={refresh} />}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Overview({ data, demo }: { data: StudioPayload; demo: boolean }) {
  const prices = [
    { name: "Voice setup", price: `$${VOICE_SETUP_USD}`, ixis: `${VOICE_SETUP_IXIS} Ixis`, sku: VOICE_SETUP_SKU, note: "One-time. Your private model, including a re-record." },
    { name: "Voice song", price: `$${VOICE_SONG_USD}`, ixis: `${VOICE_SONG_IXIS} Ixis`, sku: VOICE_SONG_SKU, note: `${TAKES_INCLUDED} takes, lyric edits, and a watermarked preview.` },
    { name: "Extra take", price: "Ixis", ixis: `${VOICE_TAKE_IXIS} Ixis`, sku: VOICE_TAKE_SKU, note: "One more full take after the three included." },
    { name: "Release", price: `$${VOICE_RELEASE_USD}`, ixis: `${VOICE_RELEASE_IXIS} Ixis`, sku: VOICE_RELEASE_SKU, note: "One single, sent after review. You keep 90% of master royalties." },
  ];
  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {prices.map((item) => (
          <article key={item.sku} className="glass rounded-3xl p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3">{item.name}</p>
            <p className="mt-3 font-body text-4xl font-extrabold tabular-nums">{item.price}</p>
            <p className="mt-1 text-sm text-ink-2">{item.ixis}</p>
            <p className="mt-3 text-sm leading-relaxed text-ink-3">{item.note}</p>
            <p className="mt-3 font-mono text-[10px] text-ink-3">{item.sku}</p>
          </article>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <article className="card">
          <h2 className="font-display text-2xl font-bold">What you keep</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-2">
            You own the master, your voice, and the voice model. You are the artist and the songwriter. Lyrixis only runs the model for you.
            Master royalties split {ROYALTY_USER_BPS / 100}% to you and {ROYALTY_LYRIXIS_BPS / 100}% to Lyrixis.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-ink-2">
            All-Access is $30 a month and includes the voice model, {ALL_ACCESS_VOICE_SONGS_PER_MONTH} voice songs, and {ALL_ACCESS_RELEASES_PER_MONTH} release each month.
            Pay by card or with Ixis. 100 Ixis equals $1.
          </p>
        </article>
        <article className="card">
          <h2 className="font-display text-2xl font-bold">Your voice only</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-2">
            One model per Apixis ID. The read-aloud phrase has to match your sample session. Names of other artists are blocked in the lyric, the prompt, and the release name.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-ink-2">You can delete the recording and the model from the Record tab.</p>
        </article>
      </div>
      <ProviderNote data={data} />
      {data.ownerEmail && !data.owner && data.signedIn && (
        <p className="text-sm text-gold">Sign in with Apixis ID to use the owner test pass. A password session does not skip payment.</p>
      )}
      <Link href={demo ? "/voice-songs/record?demo=1" : "/voice-songs/record"} className="btn-primary">
        Record your voice <span className="arrow">→</span>
      </Link>
    </div>
  );
}
