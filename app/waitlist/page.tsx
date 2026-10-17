import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";
import { WaitlistForm } from "@/components/WaitlistForm";

export const dynamic = "force-dynamic";

async function waitlistCount(): Promise<number | null> {
  try {
    const res = await fetch(`${process.env.APP_URL ?? "https://lyrixis.apixis.dev"}/api/waitlist`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { count?: number };
    return typeof json.count === "number" ? json.count : null;
  } catch {
    return null;
  }
}

export default async function WaitlistPage() {
  const count = await waitlistCount();
  return (
    <div>
      <SiteNav />
      <main className="mx-auto max-w-lg px-6 py-16">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-violet">Early access</p>
        <h1 className="mt-3 font-display text-4xl font-bold">Be first in line for music intelligence</h1>
        <p className="mt-3 text-ink-2">
          Work email required. We onboard catalogs — not scraped lyric sites.
        </p>
        {count != null && count > 0 && (
          <p className="mt-4 text-sm text-ink-3">{count} people already joined</p>
        )}
        <div className="mt-8">
          <WaitlistForm />
        </div>
        <p className="mt-8 text-sm text-ink-3">
          Already have access?{" "}
          <Link href="/login" className="text-violet hover:underline">
            Sign in
          </Link>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
