import { requireUser } from "@/lib/auth";
import { AppNav } from "@/components/AppNav";
import { SiteFooter } from "@/components/SiteFooter";
import { UploadForm } from "@/components/UploadForm";

export const dynamic = "force-dynamic";

export default async function UploadPage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const params = await searchParams;
  const demo = params.demo === "1";
  const email = demo ? "demo@lyrixis.test" : (await requireUser()).email;
  return (
    <div>
      <AppNav email={email} />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-2">Single track</p>
        <h1 className="mt-2 font-display text-4xl font-bold sm:font-marquee sm:text-5xl">Upload</h1>
        <p className="mt-3 text-ink-2">
          One file, rights confirmation required. Lyrics start processing as soon as the file is stored, usually in
          about a minute; the track page updates by itself. One song is $3 (300 Ixis). All-Access is $30 a month.
          Card coming soon until card checkout is turned on. Ixis top-ups are in the Apixis Wallet.
        </p>
        {demo && (
          <p className="mt-4 rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-gold">
            Demo mode. The file stays in this browser. No account is created and nothing is stored.
          </p>
        )}
        <div className="mt-8">
          <UploadForm demo={demo} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
