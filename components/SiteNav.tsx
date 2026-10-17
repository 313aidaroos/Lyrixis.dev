"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { WALLET_BUY_URL } from "@/lib/wallet";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { ApixisWalletChip } from "@/components/ApixisWalletChip";

const MENUS: Record<string, { label: string; href: string; hint: string }[]> = {
  Product: [
    { label: "How to use Lyrixis", href: "/how-to", hint: "Account, upload, lyrics, and plans" },
    { label: "Catalog", href: "/catalog", hint: "Search recordings, lyrics, IDs" },
    { label: "Live demo", href: "/#demo", hint: "Watch a track become intelligence" },
    { label: "Add a recording", href: "/add", hint: "Single or bulk CSV ingest" },
    { label: "Cixy", href: "/cixy", hint: "Native music-intelligence AI" },
    { label: "Voice songs", href: "/voice-songs", hint: "Record your voice and sing a song" },
    // Lyrixis Voices: shown on previews, or in production once NEXT_PUBLIC_VOICES_NAV=true (with VOICES_LIVE).
    ...(process.env.NEXT_PUBLIC_VOICES_NAV === "true" || (process.env.NEXT_PUBLIC_VERCEL_ENV && process.env.NEXT_PUBLIC_VERCEL_ENV !== "production")
      ? [{ label: "Voices", href: "/voices", hint: "License Arabic & bilingual voices" }]
      : []),
  ],
  "Use Cases": [
    { label: "Independent artists", href: "/#scale", hint: "Release one song, ready for every DSP" },
    { label: "Labels & distributors", href: "/#catalog-health", hint: "Enrich and validate entire catalogs" },
    { label: "Developers", href: "/#api", hint: "One API for music intelligence" },
  ],
  Company: [
    { label: "Vision & FAQ", href: "/vision", hint: "Why Lyrixis exists" },
    { label: "Updates", href: "/updates", hint: "What shipped" },
    { label: "Contact", href: "mailto:lyrixis@apixis.dev", hint: "lyrixis@apixis.dev" },
  ],
};

export function SiteNav() {
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const closeTimer = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    try {
      const supabase = createBrowserSupabaseClient();
      void supabase.auth.getUser().then(({ data }) => {
        if (!cancelled) setEmail(data.user?.email ?? null);
      });
    } catch {
      /* marketing renders without auth env */
    }
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelled = true;
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const active = (href: string) =>
    pathname === href || (href !== "/" && !href.startsWith("/#") && pathname.startsWith(href));

  async function signOut() {
    try {
      const supabase = createBrowserSupabaseClient();
      await supabase.auth.signOut();
    } finally {
      window.location.href = "/";
    }
  }

  function openMenu(name: string) {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setMenu(name);
  }
  function scheduleClose() {
    closeTimer.current = window.setTimeout(() => setMenu(null), 140);
  }

  return (
    <header
      className={`sticky top-0 z-40 transition-colors duration-300 ${
        scrolled ? "border-b border-line bg-[#07061a]/80 backdrop-blur-xl" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Lyrixis home">
          <img src="/lyrixis-mark.png" alt="" className="mark-glow h-9 w-9 object-contain" />
          <span className="font-display text-sm font-semibold tracking-[0.24em]">LYRIXIS</span>
        </Link>

        <nav className="hidden items-center gap-5 whitespace-nowrap text-sm lg:flex xl:gap-6" onMouseLeave={scheduleClose}>
          {Object.keys(MENUS).map((name) => (
            <div key={name} className="relative" onMouseEnter={() => openMenu(name)}>
              <button
                type="button"
                className="nav-link text-ink-2 hover:text-ink"
                aria-haspopup="menu"
                aria-expanded={menu === name}
                onClick={() => setMenu(menu === name ? null : name)}
              >
                {name}
              </button>
              {menu === name && (
                <div
                  role="menu"
                  className="glass absolute left-1/2 top-full mt-4 w-72 -translate-x-1/2 rounded-2xl p-2"
                  onMouseEnter={() => openMenu(name)}
                >
                  {MENUS[name].map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      role="menuitem"
                      onClick={() => setMenu(null)}
                      className="block rounded-xl px-3 py-2.5 transition hover:bg-white/5"
                    >
                      <p className="text-sm font-medium text-ink">{item.label}</p>
                      <p className="text-xs text-ink-3">{item.hint}</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
          <Link href="/#api" className="nav-link text-ink-2 hover:text-ink">
            API
          </Link>
          {/* 1024–1279px: Apixis Companies, Feed and Wallet move into the Menu panel so the bar never overflows. */}
          <Link href="/companies" className="nav-link hidden text-ink-2 hover:text-ink xl:inline" data-active={active("/companies")}>Apixis Companies</Link>
          <Link href="/feed" className="nav-link hidden text-ink-2 hover:text-ink xl:inline" data-active={active("/feed")}>Feed</Link>
          {/* Same mid-width rule as Companies and Feed: the Product menu and the Menu panel still list it. */}
          <Link href="/how-to" className="nav-link hidden text-ink-2 hover:text-ink xl:inline" data-active={active("/how-to")}>
            How to use
          </Link>
          <Link href="/pricing" className="nav-link text-ink-2 hover:text-ink" data-active={active("/pricing")}>
            Pricing
          </Link>
          <a href={WALLET_BUY_URL} className="nav-link hidden text-ink-2 hover:text-ink xl:inline">
            Wallet
          </a>
        </nav>

        <div className="hidden shrink-0 items-center gap-3 whitespace-nowrap text-sm lg:flex xl:gap-4">
          <a href={WALLET_BUY_URL} className={`btn-secondary px-4 py-2 text-sm ${email ? "hidden xl:inline-flex" : ""}`}>
            Buy Ixis
          </a>
          {email ? (
            <>
              <ApixisWalletChip className="text-ink-2" />
              <Link href="/dashboard" className="nav-link text-ink-2 hover:text-ink" data-active={active("/dashboard")}>
                Dashboard
              </Link>
              <Link href="/login?mode=forgot" className="nav-link hidden text-ink-2 hover:text-ink xl:inline">
                Forgot password
              </Link>
              <button type="button" onClick={() => void signOut()} className="text-ink-2 hover:text-ink">
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login?mode=forgot" className="nav-link hidden text-ink-2 hover:text-ink xl:inline">
                Forgot password
              </Link>
              <Link href="/login" className="nav-link text-ink-2 hover:text-ink" data-active={active("/login")}>
                Sign in
              </Link>
              <Link href="/waitlist" className="btn-primary px-4 py-2 text-sm">
                Get early access <span className="arrow">→</span>
              </Link>
            </>
          )}
        </div>

        {email && (
          <span className="ml-auto text-sm text-ink-2 lg:hidden">
            <ApixisWalletChip />
          </span>
        )}
        <button
          type="button"
          className="btn-secondary shrink-0 px-3 py-1.5 text-sm xl:hidden"
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      {open && (
        <div className="glass mx-4 mb-4 rounded-2xl p-4 xl:hidden">
          {Object.entries(MENUS).map(([name, items]) => (
            <div key={name} className="mb-3">
              <p className="mb-1 font-mono text-[11px] uppercase tracking-widest text-ink-3">{name}</p>
              {items.map((item) => (
                <Link key={item.label} href={item.href} onClick={() => setOpen(false)} className="block py-1.5 text-sm">
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
          <div className="mb-3 flex flex-col gap-1.5 text-sm">
            <Link href="/#api" onClick={() => setOpen(false)}>
              API
            </Link>
            <Link href="/companies" onClick={() => setOpen(false)}>Apixis Companies</Link>
            <Link href="/feed" onClick={() => setOpen(false)}>Feed</Link>
            <Link href="/how-to" onClick={() => setOpen(false)}>
              How to use
            </Link>
            <Link href="/pricing" onClick={() => setOpen(false)}>
              Pricing
            </Link>
            <Link href="/login?mode=forgot" onClick={() => setOpen(false)}>
              Forgot password
            </Link>
            <a href={WALLET_BUY_URL} onClick={() => setOpen(false)}>
              Wallet
            </a>
          </div>
          <a href={WALLET_BUY_URL} className="btn-secondary mb-2 block py-2 text-center text-sm" onClick={() => setOpen(false)}>
            Buy Ixis
          </a>
          <div className="flex gap-2">
            <Link href="/login" className="btn-secondary flex-1 py-2 text-sm" onClick={() => setOpen(false)}>
              Sign in
            </Link>
            <Link href="/waitlist" className="btn-primary flex-1 py-2 text-sm" onClick={() => setOpen(false)}>
              Get early access
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
