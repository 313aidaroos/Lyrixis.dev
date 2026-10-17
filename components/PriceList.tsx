import Link from "next/link";
import { CardPayButton } from "@/components/CardPayButton";
import { CARD_COMING_SOON } from "@/lib/card-copy";
import { PRICE_LIST, type PriceCard } from "@/lib/price-list";

function CardChoice({ card, cardReady }: { card: PriceCard; cardReady: boolean }) {
  if (card.kind === "none") {
    if (card.reason === "ixis_only") {
      return <span className="text-xs uppercase tracking-widest text-ink-3">Ixis only</span>;
    }
    return null;
  }
  if (!cardReady) {
    return (
      <span
        data-testid="card-coming-soon"
        className="inline-flex items-center rounded-full border border-gold/40 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-gold"
      >
        {CARD_COMING_SOON}
      </span>
    );
  }
  if (card.kind === "checkout") {
    return <CardPayButton product={card.product} label={card.label} />;
  }
  return (
    <Link href={card.href} className="btn-secondary px-4 py-2 text-center text-sm">
      {card.label}
    </Link>
  );
}

export function PriceList({ cardReady }: { cardReady: boolean }) {
  return (
    <section className="mt-16" aria-labelledby="price-list-heading">
      <p className="font-mono text-xs uppercase tracking-[0.28em] text-cyan">Full price list</p>
      <h2 id="price-list-heading" className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">
        Every price
      </h2>
      <p className="mt-3 max-w-2xl text-sm text-ink-2">
        100 Ixis equals $1. Pay with Ixis, or by card when card checkout is on. {CARD_COMING_SOON} means the card keys are not set. Ixis still works.
      </p>
      <div className="mt-8 grid gap-4">
        {PRICE_LIST.map((row) => (
          <article key={row.id} className="glass flex flex-col gap-4 rounded-3xl p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <h3 className="font-display text-xl font-bold">{row.name}</h3>
              <p className="mt-2 font-body text-2xl font-extrabold tabular-nums">{row.price}</p>
              {row.ixis && row.id !== "extra-take" && <p className="mt-1 text-sm text-ink-2">{row.ixis}</p>}
              <p className="mt-3 text-sm leading-relaxed text-ink-2">{row.detail}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {row.ixisHref && row.ixisLabel && (
                <Link href={row.ixisHref} className="btn-primary px-4 py-2 text-center text-sm">
                  {row.ixisLabel}
                </Link>
              )}
              <CardChoice card={row.card} cardReady={cardReady} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
