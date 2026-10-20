import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listTracks } from "@/services/tracks";
import { AppNav } from "@/components/AppNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ConfidenceBadge, StatusBadge } from "@/components/StatusBadge";
import { ApixisWorldWelcome } from "@/components/ApixisWorldWelcome";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const tracks = await listTracks(user);

  return (
    <div>
      <AppNav email={user.email} />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-ink-2">Dashboard</p>
            <h1 className="mt-2 font-display text-4xl font-bold sm:font-marquee sm:text-5xl">Your tracks</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/voice-songs" className="btn-secondary">
              Voice Songs
            </Link>
            <Link href="/upload" className="btn-primary">
              Upload a track
            </Link>
          </div>
        </div>

        {/* Apixis world: new accounts get their own agent created server-side; one-time welcome card. */}
        <ApixisWorldWelcome />

        {tracks.length === 0 ? (
          <div className="card mt-10">
            <p className="text-ink-2">No tracks yet. Upload one song with rights confirmation to start processing.</p>
          </div>
        ) : (
          <div className="mt-8 overflow-x-auto rounded-2xl border border-line">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface text-ink-3">
                <tr>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Artist</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Language</th>
                  <th className="px-4 py-3 font-medium">Paid</th>
                  <th className="px-4 py-3 font-medium">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {tracks.map((track) => (
                  <tr key={track.id} className="border-t border-line/80">
                    <td className="px-4 py-3">
                      <Link className="text-ink hover:text-violet" href={`/tracks/${track.publicId}`}>
                        {track.title ?? track.publicId}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-2">{track.artist ?? "—"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={track.status} />
                    </td>
                    <td className="px-4 py-3 text-ink-2">{track.language ?? "—"}</td>
                    <td className="px-4 py-3 text-ink-2">{track.paid ? "Unlocked" : "Preview"}</td>
                    <td className="px-4 py-3">
                      <ConfidenceBadge band={track.confidenceBand} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
