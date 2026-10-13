import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";
import { AdminQueue } from "@/components/voice-songs/AdminQueue";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Voice release queue — Lyrixis",
  description: "Owner review queue for voice song releases.",
};

export default async function AdminVoiceSongsPage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const params = await searchParams;
  return (
    <div>
      <SiteNav />
      <main className="mx-auto max-w-5xl px-6 py-16">
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-cyan">Owner</p>
        <h1 className="mt-3 font-display text-4xl font-bold sm:font-marquee sm:text-5xl">Release queue</h1>
        <p className="mt-4 max-w-2xl text-ink-2">
          Review a voice song before it can go to stores. AI vocals, AI music, and AI-assisted lyrics stay disclosed. You keep the 90 / 10 royalty split.
        </p>
        <AdminQueue demo={params.demo === "1"} />
      </main>
      <SiteFooter />
    </div>
  );
}
