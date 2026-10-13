import { VoiceStudioShell } from "@/components/voice-songs/VoiceStudioShell";

export const dynamic = "force-dynamic";

export const metadata = { title: "Write lyrics — Lyrixis" };

export default async function LyricsPage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const params = await searchParams;
  return <VoiceStudioShell step="lyrics" demo={params.demo === "1"} />;
}
