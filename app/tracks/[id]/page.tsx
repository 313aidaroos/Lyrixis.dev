import { requireUser } from "@/lib/auth";
import { AppNav } from "@/components/AppNav";
import { SiteFooter } from "@/components/SiteFooter";
import { TrackView } from "@/components/TrackView";
import { DEMO_LYRIC_LINES } from "@/lib/demo-lyrics";

export const dynamic = "force-dynamic";

export default async function TrackPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ demo?: string; title?: string; artist?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  if (id === "demo" && query.demo === "1") {
    const title = (query.title || "Untitled").slice(0, 120);
    const artist = (query.artist || "Demo artist").slice(0, 120);
    return (
      <div>
        <AppNav email="demo@lyrixis.test" />
        <main className="mx-auto max-w-4xl px-6 py-10">
          <p className="font-mono text-xs uppercase tracking-widest text-gold">Demo mode</p>
          <h1 className="mt-2 font-display text-4xl font-bold sm:text-5xl">{title}</h1>
          <p className="mt-2 text-ink-2">{artist}</p>
          <p className="mt-4 text-sm text-ink-3">
            Sample lyrics for this demo. The audio was not uploaded, and these lines were not transcribed from a file.
          </p>
          <ol className="mt-8 space-y-4" data-testid="demo-lyrics">
            {DEMO_LYRIC_LINES.map((line) => (
              <li key={line.at} className="card flex gap-4">
                <span className="font-mono text-xs text-cyan">{line.at}</span>
                <span className="text-ink">{line.text}</span>
              </li>
            ))}
          </ol>
        </main>
        <SiteFooter />
      </div>
    );
  }
  const user = await requireUser();
  return (
    <div>
      <AppNav email={user.email} />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <TrackView publicId={id} />
      </main>
      <SiteFooter />
    </div>
  );
}
