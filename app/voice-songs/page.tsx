import { VoiceStudioShell } from "@/components/voice-songs/VoiceStudioShell";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Voice songs — Lyrixis",
  description: "Record your own voice, write lyrics with Cixy, and preview a song sung in that voice.",
};

export default async function VoiceSongsPage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const params = await searchParams;
  return <VoiceStudioShell step="overview" demo={params.demo === "1"} />;
}
