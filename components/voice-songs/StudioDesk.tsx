"use client";

import Link from "next/link";
import { VOICE_SONG_PRICES } from "@/lib/voice-songs/pricing";
import { AuthGate, DemoBanner, ProviderLine, StepNav, useSession } from "./client";

export function StudioDesk() {
  const state = useSession();
  const session = state.session;
  const voice = session?.voice;
  return (
    <AuthGate {...state}>
      {session && (
        <>
          <DemoBanner session={session} />
          <p className="font-mono text-xs uppercase tracking-widest text-ink-2">Sing it yourself</p>
          <h1 className="mt-2 font-display text-4xl font-bold sm:font-marquee sm:text-5xl">Voice Songs</h1>
          <p className="mt-3 max-w-2xl text-ink-2">
            Record your voice, let Cixy co-write the lyric, and hear the song in your own model. A release is queued for review before any store sees it. You own the master. Lyrixis keeps 10% of reported master royalties.
          </p>
          <StepNav current="/voice-songs/desk" />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="card md:col-span-2">
              <p className="font-mono text-xs uppercase tracking-widest text-ink-3">Your model</p>
              <p className="mt-2 font-display text-2xl font-bold">{voice ? voice.status.replaceAll("_", " ") : "Not started"}</p>
              <p className="mt-2 text-sm text-ink-2">
                {voice?.status === "ready"
                  ? `Private model (${voice.provider ?? "pending"}). It is not shared and it is not used to train anyone else.`
                  : "One voice per Apixis ID. Delete it any time and the recording goes with it."}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/voice-songs/desk/record" className="btn-primary">{voice ? "Re-record" : "Record a sample"}</Link>
                {voice?.status === "ready" && <Link href="/voice-songs/desk/write" className="btn-secondary">Write with Cixy</Link>}
                <Link href="/voice-songs/desk/admin" className="btn-secondary">Review queue</Link>
              </div>
            </div>
            <div className="card">
              <p className="font-mono text-xs uppercase tracking-widest text-ink-3">This month · {session.period}</p>
              <p className="mt-3 text-sm text-ink-2">Songs used {session.usage.songsUsed} / 4 included</p>
              <p className="text-sm text-ink-2">Releases {session.usage.releasesUsed} / 4 cap (1 included)</p>
              <p className="mt-2 text-sm text-ink">{session.allAccess ? "All-Access allowances are on." : "All-Access is not active on this account."}</p>
              <ProviderLine session={session} />
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.values(VOICE_SONG_PRICES).map((price) => (
              <div key={price.sku} className="card">
                <p className="text-sm text-ink-2">{price.label}</p>
                <p className="mt-1 font-display text-3xl font-extrabold">${price.usd}</p>
                <p className="text-sm text-ink-3">{price.ixis} Ixis</p>
                <p className="mt-2 text-xs text-ink-3">{price.productKey}</p>
              </div>
            ))}
          </div>
          {session.songs.length > 0 && (
            <div className="mt-8">
              <h2 className="font-display text-2xl font-bold">Your songs</h2>
              <ul className="mt-4 space-y-3">
                {session.songs.map((song) => (
                  <li key={song.id} className="card flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{song.title}</p>
                      <p className="text-sm text-ink-3">{song.genre} · {song.mood} · {song.status}</p>
                    </div>
                    <Link href={`/voice-songs/desk/song/${song.id}`} className="btn-secondary">Open</Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </AuthGate>
  );
}
