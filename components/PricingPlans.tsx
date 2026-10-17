import Link from "next/link";
import { CARD_COMING_SOON } from "@/lib/card-copy";
import {
  ALL_ACCESS_FEATURES,
  ALL_ACCESS_MONTHLY_IXIS,
  ALL_ACCESS_MONTHLY_USD,
  ALL_ACCESS_TERMS,
  PAYMENT_CHOICE,
  TRACK_UNLOCK_IXIS,
  TRACK_UNLOCK_USD,
} from "@/lib/ixis-pricing";

export function PricingPlans({ contactHref = "#contact-sales", cardReady = false }: { contactHref?: string; cardReady?: boolean }) {
  const choice = cardReady ? PAYMENT_CHOICE : `${PAYMENT_CHOICE} ${CARD_COMING_SOON}.`;
  return (
    <div className="grid items-stretch gap-5 lg:grid-cols-3">
      <article className="glass flex flex-col rounded-3xl p-6 sm:p-8 ring-1 ring-cyan/40">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-cyan">Lyrixis All-Access</p>
        <p className="mt-4 font-body text-4xl font-extrabold tabular-nums">
          ${ALL_ACCESS_MONTHLY_USD}
          <span className="text-lg font-semibold text-ink-2">/month</span>
        </p>
        <p className="mt-1 text-sm text-ink-2">{ALL_ACCESS_MONTHLY_IXIS.toLocaleString()} Ixis</p>
        <p className="mt-4 text-sm leading-relaxed text-ink-2">{ALL_ACCESS_TERMS}</p>
        <ul className="mt-6 space-y-3">
          {ALL_ACCESS_FEATURES.map((feature) => (
            <li key={feature.name} className="flex items-start justify-between gap-3 text-sm">
              <span>
                <span className="font-medium text-ink">{feature.name}</span>
                <span className="mt-0.5 block text-xs text-ink-3">{feature.detail}</span>
              </span>
              {feature.status === "coming_soon" ? (
                <span className="shrink-0 rounded-full border border-gold/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-gold">
                  Coming soon
                </span>
              ) : (
                <span className="shrink-0 rounded-full border border-cyan/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-cyan">
                  Included
                </span>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-6 text-xs leading-relaxed text-ink-3">{choice}</p>
        <Link href="/how-to#pay" className="btn-secondary mt-6 px-5 py-2.5 text-center text-sm">
          How this plan works
        </Link>
      </article>

      <article className="glass flex flex-col rounded-3xl p-6 sm:p-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-3">One song</p>
        <p className="mt-4 font-body text-4xl font-extrabold tabular-nums">
          ${TRACK_UNLOCK_USD % 1 === 0 ? TRACK_UNLOCK_USD.toFixed(0) : TRACK_UNLOCK_USD.toFixed(2)}
          <span className="text-lg font-semibold text-ink-2">/song</span>
        </p>
        <p className="mt-1 text-sm text-ink-2">{TRACK_UNLOCK_IXIS.toLocaleString()} Ixis</p>
        <p className="mt-4 text-sm leading-relaxed text-ink-2">
          No plan needed. You get synced lyrics for that song: playback, corrections, and TXT, SRT, LRC, and JSON downloads.
          This is the unlock that works today.
        </p>
        <p className="mt-6 text-xs leading-relaxed text-ink-3">{choice}</p>
        <Link href="/upload" className="btn-primary mt-auto px-5 py-2.5 text-center text-sm">
          Unlock a song · {TRACK_UNLOCK_IXIS} Ixis
        </Link>
      </article>

      <article className="glass flex flex-col rounded-3xl p-6 sm:p-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-3">Label / Enterprise</p>
        <p className="mt-4 font-body text-4xl font-extrabold">Contact sales</p>
        <p className="mt-1 text-sm text-ink-2">No fixed price</p>
        <p className="mt-4 text-sm leading-relaxed text-ink-2">
          For record labels, enterprises, and other companies. Tell us the company, a contact, about how many songs a month,
          and how many people need seats. After approval, the company owner invites the team. Everyone on that account gets
          All-Access for the company&apos;s songs.
        </p>
        <a href={contactHref} className="btn-primary mt-auto px-5 py-2.5 text-center text-sm">
          Contact sales
        </a>
      </article>
    </div>
  );
}
