import { VoiceStudioShell } from "@/components/voice-songs/VoiceStudioShell";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Release a voice song — Lyrixis",
  description: "Submit your own-voice song for review with artwork, credits, and AI disclosure.",
};

export default async function VoiceReleasePage({ searchParams }: { searchParams: Promise<{ demo?: string; songId?: string }> }) {
  const params = await searchParams;
  return <VoiceStudioShell step="release" demo={params.demo === "1"} songId={params.songId} />;
}
