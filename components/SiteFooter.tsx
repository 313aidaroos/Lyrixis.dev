import Link from "next/link";
import { WALLET_BUY_URL } from "@/lib/wallet";
import { OTHER_IXIS_COMPANIES } from "@/lib/ixis-companies";

const INSTAGRAM_URL = "https://www.instagram.com/lyrixis.dev/";

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
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Lyrixis on Instagram"
            className="mt-5 inline-flex text-ink-2 hover:text-ink"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="currentColor">
              <path d="M12 2.16c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.64.07 4.85s-.01 3.58-.07 4.85c-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.64.07-4.85.07s-3.58-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92-.06-1.27-.07-1.64-.07-4.85s.01-3.58.07-4.85C2.38 3.92 3.9 2.38 7.15 2.23 8.42 2.17 8.8 2.16 12 2.16zM12 0C8.74 0 8.33.01 7.05.07 2.7.27.27 2.69.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.2 4.36 2.62 6.78 6.98 6.98C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c4.35-.2 6.78-2.62 6.98-6.98.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.2-4.35-2.62-6.78-6.98-6.98C15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.41-11.85a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88z" />
            </svg>
          </a>
        </div>
        <div className="flex flex-col gap-2 text-sm text-ink-2">
          <p className="mb-1 font-mono text-[11px] uppercase tracking-widest text-ink-3">Product</p>
          <Link href="/catalog" className="hover:text-ink">Catalog</Link>
          <Link href="/#demo" className="hover:text-ink">Live demo</Link>
          <Link href="/#api" className="hover:text-ink">API</Link>
          <Link href="/how-to" className="hover:text-ink">How to use</Link>
          <Link href="/pricing" className="hover:text-ink">Pricing</Link>
          <Link href="/team" className="hover:text-ink">Team</Link>
          <a href={WALLET_BUY_URL} className="hover:text-ink">Buy Ixis</a>
          <Link href="/cixy" className="hover:text-ink">◈ Cixy</Link>
          <Link href="/voice-songs" className="hover:text-ink">Voice songs</Link>
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
