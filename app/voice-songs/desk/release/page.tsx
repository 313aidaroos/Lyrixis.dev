import { Suspense } from "react";
import { ReleaseDesk } from "@/components/voice-songs/ReleaseDesk";

export const dynamic = "force-dynamic";

export const metadata = { title: "Release from the sample desk — Lyrixis" };

export default function DeskReleasePage() {
  return (
    <Suspense fallback={<p className="text-ink-2">Loading the release form…</p>}>
      <ReleaseDesk />
    </Suspense>
  );
}
