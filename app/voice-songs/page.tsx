import { VoiceStudio } from "@/components/voice-songs/VoiceStudio";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Voice songs — Lyrixis",
  description: "Record your own voice, write lyrics with Cixy, and preview a song sung in that voice.",
};

export default async function VoiceSongsPage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const params = await searchParams;
  return <VoiceStudio step="overview" demo={params.demo === "1"} />;
}
