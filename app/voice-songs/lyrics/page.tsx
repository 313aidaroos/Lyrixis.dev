import { VoiceStudio } from "@/components/voice-songs/VoiceStudio";

export const dynamic = "force-dynamic";

export const metadata = { title: "Write lyrics — Lyrixis" };

export default async function LyricsPage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const params = await searchParams;
  return <VoiceStudio step="lyrics" demo={params.demo === "1"} />;
}
