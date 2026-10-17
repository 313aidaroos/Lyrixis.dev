import Link from "next/link";
import { ApiSection } from "@/components/ApiSection";
import { BeforeAfter } from "@/components/BeforeAfter";
import { CapabilityStrip } from "@/components/CapabilityStrip";
import { CatalogHealth } from "@/components/CatalogHealth";
import { Pipeline } from "@/components/Pipeline";
import { PricingPlans } from "@/components/PricingPlans";
import { Reveal } from "@/components/Motion";
import { ScaleSection } from "@/components/ScaleSection";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";
import { SongDemo } from "@/components/SongDemo";
import { SoundField } from "@/components/SoundField";
import { WaitlistForm } from "@/components/WaitlistForm";

export const dynamic = "force-dynamic";

const EXAMPLES = [
  { label: "Kendrick Lamar", q: "Kendrick Lamar" },
  { label: "Starboy", q: "Starboy" },
  { label: "Amazing Grace", q: "Amazing Grace" },
  { label: "USRC12401824", q: "USRC12401824" },
  { label: "Yemeni Arabic", q: "Arabic" },
  { label: "French Dialect", q: "French" },
];

const RIGHT_FLOW = [
  "AUDIO",
  "LYRICS",
  "SYNC",
  "LANGUAGE",
  "TRANSLATION",
  "STRUCTURE",
  "METADATA",
  "VALIDATION",
  "EXPORT",
];

export default async function HomePage() {
  return (
    <div className="relative overflow-x-hidden">
      <SiteNav />

      {/* =========================================================================
          HERO — Exact split layout from mockup
         ========================================================================= */}
      <section className="relative min-h-[88vh] flex items-center justify-center overflow-hidden pt-6 pb-16 lg:pb-24">
        {/* Animated sound field canvas reacting to mouse movement */}
        <SoundField />

        <div className="relative mx-auto w-full max-w-7xl px-6">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
            {/* LEFT COLUMN */}
            <div>
              <Reveal>
                <div className="inline-flex items-center gap-2 rounded-full border border-violet/30 bg-violet/10 px-3.5 py-1 text-xs font-mono uppercase tracking-[0.22em] text-cyan">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan animate-pulse" />
                  The intelligence layer for music catalogs
                </div>
              </Reveal>

              <Reveal delay={80}>
                <h1 className="mt-6 font-marquee text-[clamp(2.25rem,10.4vw,3rem)] sm:text-7xl lg:text-8xl leading-[1.02]">
                  Music. <br />
                  <span className="grad-text">Understood.</span>
                </h1>
              </Reveal>

              <Reveal delay={140}>
                <p className="mt-6 max-w-xl text-lg sm:text-xl text-ink-2 leading-relaxed">
                  Turn any recording into synchronized lyrics, metadata, and structured music intelligence.
                </p>
              </Reveal>

              {/* Search input matching mockup */}
              <Reveal delay={200} className="mt-8">
                <form
                  action="/catalog"
                  method="get"
                  className="glass flex flex-col gap-2 rounded-2xl p-2 sm:flex-row sm:items-center sm:gap-3"
                >
                  <div className="relative flex-1">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-mono text-sm text-cyan">
                      ⌕
                    </span>
                    <input
                      className="w-full bg-transparent py-3 pl-10 pr-4 text-sm sm:text-base text-ink outline-none placeholder:text-ink-3"
                      type="search"
                      name="q"
                      placeholder="Try a song, artist, or ISRC..."
                      aria-label="Try a song, artist, or ISRC"
                    />
                  </div>
                  <button className="btn-primary px-6 py-3 text-sm font-semibold whitespace-nowrap" type="submit">
                    Search the catalog <span className="arrow">→</span>
                  </button>
                </form>

                {/* Examples row */}
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-ink-3">
                  <span className="font-mono uppercase tracking-wider text-[11px] text-ink-2">Examples:</span>
                  {EXAMPLES.map((ex) => (
                    <Link
                      key={ex.label}
                      href={`/catalog?q=${encodeURIComponent(ex.q)}`}
                      className="rounded-lg border border-line bg-white/[0.03] px-2.5 py-1 text-ink-2 transition hover:border-violet hover:text-ink"
                    >
                      {ex.label}
                    </Link>
                  ))}
                </div>
              </Reveal>
            </div>

            {/* RIGHT COLUMN: Free-floating Lyrixis mark with vinyl rings + vertical pipeline flow */}
            <div className="relative flex items-center justify-center lg:justify-end">
              <Reveal delay={120} className="relative flex items-center justify-center">
                {/* Vinyl rings & subtle glowing spectrum backdrop */}
                <div className="vinyl-ring h-80 w-80 sm:h-96 sm:w-96" />
                <div className="vinyl-ring h-64 w-64 sm:h-80 sm:w-80" style={{ animationDuration: "55s", animationDirection: "reverse" }} />
                <div className="vinyl-ring h-48 w-48 sm:h-60 sm:w-60" style={{ animationDuration: "35s" }} />

                <div className="absolute inset-0 m-auto h-72 w-72 rounded-full bg-gradient-to-tr from-violet/30 via-magenta/25 to-cyan/30 blur-2xl" />

                {/* The free-floating Lyrixis L musical-note symbol */}
                <div className="hero-mark relative z-10 flex h-72 w-72 sm:h-88 sm:w-88 items-center justify-center">
                  <img
                    src="/brand/mark.png"
                    alt="Lyrixis musical intelligence mark"
                    className="h-full w-full object-contain pointer-events-none select-none"
                  />
                </div>

                {/* Right vertical transformation pills (matching mockup) */}
                <div className="hidden xl:flex absolute -right-6 top-1/2 -translate-y-1/2 flex-col items-center gap-1.5 font-mono text-[9px] font-semibold tracking-widest text-ink-3">
                  {RIGHT_FLOW.map((step, i) => (
                    <div key={step} className="flex flex-col items-center gap-1.5">
                      <span className="rounded border border-line bg-white/[0.02] px-2 py-0.5 text-cyan/80">
                        {step}
                      </span>
                      {i < RIGHT_FLOW.length - 1 && <span className="text-[8px] text-ink-3">↓</span>}
                    </div>
                  ))}
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          CAPABILITY STRIP — 7 horizontal cards right below hero
         ========================================================================= */}
      <section className="relative py-8">
        <CapabilityStrip />
      </section>

      {/* =========================================================================
          LIVE SONG DEMO — Premium glass panel with Midnight Echoes
         ========================================================================= */}
      <section id="demo" className="relative mx-auto max-w-7xl px-6 py-16 sm:py-24">
        <Reveal className="mb-10 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-cyan">Interactive Intelligence Preview</p>
          <h2 className="mt-3 font-display text-3xl font-bold sm:font-marquee sm:text-5xl">
            See Lyrixis <span className="grad-text">in real time.</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-ink-2">
            Every audio file is enriched with word-level timecodes, structural cues, dialect confidence, and clean/explicit verification.
          </p>
        </Reveal>

        <Reveal delay={100}>
          <SongDemo />
        </Reveal>
      </section>

      {/* =========================================================================
          FROM AUDIO TO INTELLIGENCE — Animated pipeline
         ========================================================================= */}
      <section className="relative py-16 sm:py-24">
        <div className="seam mb-16" />
        <Pipeline />
      </section>

      {/* =========================================================================
          BEFORE / AFTER CATALOG TRANSFORMATION
         ========================================================================= */}
      <section className="relative py-16 sm:py-24">
        <BeforeAfter />
      </section>

      {/* =========================================================================
          SCALE SECTION — 1 to 1,000,000+ tracks
         ========================================================================= */}
      <section className="relative py-16 sm:py-24">
        <div className="seam mb-16" />
        <ScaleSection />
      </section>

      {/* =========================================================================
          CATALOG HEALTH — Enterprise Demo
         ========================================================================= */}
      <section className="relative py-16 sm:py-24">
        <div className="seam mb-16" />
        <CatalogHealth />
      </section>

      {/* =========================================================================
          API SECTION — Developer first
         ========================================================================= */}
      <section className="relative py-16 sm:py-24">
        <div className="seam mb-16" />
        <ApiSection />
      </section>

      {/* =========================================================================
          PRICING CALCULATOR — Dynamic tiers from database
         ========================================================================= */}
      <section id="pricing" className="relative py-16 sm:py-24">
        <div className="seam mb-16" />
        <Reveal className="mb-10 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-cyan">Pricing</p>
          <h2 className="mt-3 font-display text-3xl font-bold sm:font-marquee sm:text-5xl">
            $30 a month, $3 a song, <span className="grad-text">or contact sales.</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-ink-2">
            All-Access is $30 a month (3,000 Ixis). One song is $3 (300 Ixis). Labels and companies use Contact sales.
          </p>
        </Reveal>
        <Reveal delay={120}>
          <PricingPlans contactHref="/pricing#contact-sales" />
        </Reveal>
      </section>

      {/* =========================================================================
          FINAL WAITLIST / EARLY ACCESS BANNER
         ========================================================================= */}
      <section className="relative mx-auto max-w-4xl px-6 py-20">
        <div className="glass relative overflow-hidden rounded-3xl p-8 sm:p-12 text-center">
          <div className="absolute inset-0 bg-gradient-to-r from-violet/20 via-transparent to-cyan/20 pointer-events-none" />
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-cyan">Ready to modernize your catalog?</p>
            <h2 className="mt-3 font-display text-3xl font-bold sm:font-marquee sm:text-5xl">
              Get in touch with the <span className="grad-text">Lyrixis team.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-ink-2">
              Join the waitlist for private pilot access, or connect directly to discuss batch hydration for label catalogs.
            </p>
          </Reveal>
          <Reveal delay={100} className="mt-8 mx-auto max-w-md">
            <WaitlistForm compact />
          </Reveal>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
