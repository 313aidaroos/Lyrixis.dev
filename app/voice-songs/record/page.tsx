import { VoiceStudio } from "@/components/voice-songs/VoiceStudio";

export const dynamic = "force-dynamic";

export const metadata = { title: "Record your voice — Lyrixis" };

export default async function RecordVoicePage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const params = await searchParams;
  return <VoiceStudio step="record" demo={params.demo === "1"} />;
}
