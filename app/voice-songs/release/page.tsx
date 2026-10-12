import { Suspense } from "react";
import { ReleaseDesk } from "@/components/voice-songs/ReleaseDesk";

export const dynamic = "force-dynamic";

export default function ReleasePage() {
  return (
    <Suspense fallback={<p className="text-ink-2">Loading the release form…</p>}>
      <ReleaseDesk />
    </Suspense>
  );
}
