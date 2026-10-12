import Link from "next/link";
import { WALLET_BUY_URL } from "@/lib/wallet";
import { OTHER_IXIS_COMPANIES } from "@/lib/ixis-companies";

export function SiteFooter() {
  return (
    <footer className="mt-24">
      <div className="seam" />
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 sm:grid-cols-5">
        <div className="sm:col-span-2">
          <div className="flex items-center gap-2.5">
            <img src="/lyrixis-mark.png" alt="" className="mark-glow h-8 w-8 object-contain" />
            <p className="font-display text-sm tracking-[0.24em]">LYRIXIS</p>
          </div>
          <p className="mt-4 max-w-sm text-sm text-ink-3">
            The intelligence layer for music catalogs. Music. Understood. All-Access is $30 a month, or $3 a song.
            Labels and companies: contact sales.
          </p>
        </div>
        <div className="flex flex-col gap-2 text-sm text-ink-2">
          <p className="mb-1 font-mono text-[11px] uppercase tracking-widest text-ink-3">Product</p>
          <Link href="/catalog" className="hover:text-ink">Catalog</Link>
          <Link href="/#demo" className="hover:text-ink">Live demo</Link>
          <Link href="/#api" className="hover:text-ink">API</Link>
          <Link href="/how-to" className="hover:text-ink">How to use</Link>
          <Link href="/pricing" className="hover:text-ink">Pricing</Link>
          <Link href="/voice-songs" className="hover:text-ink">Voice Songs</Link>
          <Link href="/team" className="hover:text-ink">Team</Link>
          <a href={WALLET_BUY_URL} className="hover:text-ink">Buy Ixis</a>
          <Link href="/cixy" className="hover:text-ink">◈ Cixy</Link>
        </div>
        <div className="flex flex-col gap-2 text-sm text-ink-2">
          <p className="mb-1 font-mono text-[11px] uppercase tracking-widest text-ink-3">Company</p>
          <Link href="/vision" className="hover:text-ink">Vision & FAQ</Link>
          <Link href="/updates" className="hover:text-ink">Updates</Link>
          <Link href="/waitlist" className="hover:text-ink">Early access</Link>
          <a href="mailto:lyrixis@apixis.dev?subject=Terms%20request" className="hover:text-ink">Terms</a>
          <a href="mailto:lyrixis@apixis.dev?subject=Privacy%20request" className="hover:text-ink">Privacy</a>
          <a href="mailto:lyrixis@apixis.dev?subject=DMCA%20notice" className="hover:text-ink">Copyright / DMCA</a>
        </div>
        <div className="flex flex-col gap-2 text-sm text-ink-2">
          <p className="mb-1 font-mono text-[11px] uppercase tracking-widest text-ink-3">Other Ixis companies</p>
          {OTHER_IXIS_COMPANIES.map((c) => (
            <a key={c.url} href={c.url} target="_blank" rel="noopener noreferrer" className="hover:text-ink">
              {c.name}
            </a>
          ))}
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-6 py-5 text-sm sm:flex-row">
          <p className="text-ink-3">
            Contact:{" "}
            <a href="mailto:lyrixis@apixis.dev" className="font-medium text-cyan hover:underline">
              lyrixis@apixis.dev
            </a>
          </p>
          <p className="text-xs uppercase tracking-[0.22em] text-ink-3">
            <span className="grad-text">◈</span> An Apixis Company
          </p>
        </div>
      </div>
    </footer>
  );
}
