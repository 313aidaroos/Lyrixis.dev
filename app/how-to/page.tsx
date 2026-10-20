import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";
import { PlanFaq } from "@/components/PlanFaq";
import { ALL_ACCESS_FEATURES, ALL_ACCESS_MONTHLY_IXIS, ALL_ACCESS_MONTHLY_USD, ALL_ACCESS_TERMS, SALES_EMAIL, TRACK_UNLOCK_IXIS } from "@/lib/ixis-pricing";

export const metadata = {
  title: "How to use Lyrixis",
  description: "Make an Apixis ID, upload a song, play synced lyrics, pay $3 a song or $30 a month, or ask about Label / Enterprise.",
};

const STEPS: { id: string; title: string; body: string[]; image?: { src: string; alt: string; caption: string } }[] = [
  {
    id: "account",
    title: "Make an account",
    body: [
      "Open Sign in and press Log in with Apixis ID. One Apixis ID works on Lyrixis and the other Apixis sites.",
      "New accounts are created there. You come back to Lyrixis signed in. A new Apixis ID gets 1,000 free Ixis once, in the Apixis Wallet.",
    ],
    image: {
      src: "/how-to/account.webp",
      alt: "Lyrixis sign-in page with Log in with Apixis ID",
      caption: "The sign-in page on lyrixis.vercel.app.",
    },
  },
  {
    id: "upload",
    title: "Upload a song",
    body: [
      "Open Upload. Choose an audio file: MP3, WAV, FLAC, M4A, or OGG, up to 100 MB and 12 minutes.",
      "Title and artist are optional. If you leave them empty, Lyrixis reads them from the file.",
      "Tick the box that you have the rights to the recording, then press Upload and process.",
    ],
  },
  {
    id: "processing",
    title: "Wait for processing",
    body: [
      "You land on the song page. The status moves on its own from queued to completed. It usually takes about a minute.",
      "Leave the page open or come back from your dashboard. You do not pay while it is still working.",
    ],
    image: {
      src: "/how-to/processing.webp",
      alt: "Lyrixis live demo showing a song moving through ingest, transcription, and alignment",
      caption: "The live demo on the home page shows the same steps a song goes through.",
    },
  },
  {
    id: "play",
    title: "View and play synced lyrics",
    body: [
      "Press play. The current line highlights, and you can click a word to jump the audio there.",
      "Before you pay, you see the first 30 seconds. Amber marks are lines the transcription is less sure about.",
    ],
    image: {
      src: "/how-to/play.webp",
      alt: "Synced lyrics playing in the Lyrixis demo, with the current line highlighted",
      caption: "Playback on the live demo. Your own song works the same way after it finishes.",
    },
  },
  {
    id: "retry",
    title: "Retry if something fails",
    body: [
      "If the status says failed, or it stops and asks you to retry, press Retry processing on the song page.",
      "It starts again from the step that stopped. Retry does not cost Ixis. You only pay when you unlock a finished song.",
    ],
  },
  {
    id: "pay",
    title: "Pay for one song, or use All-Access",
    body: [
      `Without a plan, press Unlock full lyrics · ${TRACK_UNLOCK_IXIS} Ixis. That is $3, paid from your Apixis Wallet. This unlock works today.`,
      `Lyrixis All-Access is $${ALL_ACCESS_MONTHLY_USD} a month (${ALL_ACCESS_MONTHLY_IXIS.toLocaleString()} Ixis). ${ALL_ACCESS_TERMS}`,
      "You can pay by card or with Ixis. 100 Ixis equals $1. Card coming soon until card checkout is turned on. Add Ixis in the Apixis Wallet.",
      "After a song is unlocked you can correct a line and download TXT, SRT, LRC, or JSON.",
    ],
    image: {
      src: "/how-to/unlock.webp",
      alt: "A catalog song with a Redeem 300 Ixis button",
      caption: "The $3 unlock on a real catalog page. Your uploaded song uses the same 300 Ixis price.",
    },
  },
  {
    id: "features",
    title: "What the plan includes",
    body: ALL_ACCESS_FEATURES.map((feature) =>
      feature.status === "included"
        ? `${feature.name}: this works today. ${feature.detail}`
        : `${feature.name}: Coming soon. ${feature.detail}`
    ),
  },
  {
    id: "enterprise",
    title: "Label / Enterprise",
    body: [
      "On Pricing, choose Label / Enterprise and press Contact sales. There is no fixed price.",
      "Enter the company name, your name, work email, phone if you want, about how many songs per month, how many team seats, and a message.",
      `The request is saved and emailed to ${SALES_EMAIL}. The page then shows a thank-you screen.`,
      "Awad reviews it and marks the company as Enterprise. Sign in with the work email on the request and open Team.",
      "The company owner invites teammates by email. When they sign in with that email, they join the company.",
      "People on the company get All-Access for the company's songs, including unlimited song lyrics and the own-voice allowance (voice model, 4 voice songs, and 1 release a month). They cannot see another company's songs. Lyric video downloads, translations, and the Voices marketplace stay coming soon until those features exist.",
    ],
  },
];

export default function HowToPage() {
  return (
    <div>
      <SiteNav />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-cyan">Guide</p>
        <h1 className="mt-3 font-display text-4xl font-extrabold sm:font-marquee sm:text-5xl">How to use Lyrixis</h1>
        <p className="mt-4 text-lg text-ink-2">
          Eight short steps. The pictures are from the live site at lyrixis.vercel.app.
        </p>
        <ol className="mt-12 space-y-12">
          {STEPS.map((step, index) => (
            <li key={step.id} id={step.id} className="scroll-mt-24">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-cyan">Step {index + 1}</p>
              <h2 className="mt-2 font-display text-2xl font-bold">{step.title}</h2>
              <div className="mt-3 space-y-2 text-ink-2">
                {step.body.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
              {step.image && (
                <figure className="mt-5">
                  {/* Real site screenshots, already optimized webp. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={step.image.src}
                    alt={step.image.alt}
                    className="w-full rounded-2xl border border-line"
                  />
                  <figcaption className="mt-2 text-xs text-ink-3">{step.image.caption}</figcaption>
                </figure>
              )}
            </li>
          ))}
        </ol>
        <div className="mt-12 flex flex-wrap gap-3">
          <Link href="/pricing" className="btn-primary px-5 py-2.5 text-sm">
            See pricing
          </Link>
          <Link href="/login" className="btn-secondary px-5 py-2.5 text-sm">
            Sign in
          </Link>
        </div>
        <div className="mt-16">
          <PlanFaq title="Plan questions" />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
