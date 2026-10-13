import { VoiceStudioShell } from "@/components/voice-songs/VoiceStudioShell";

export const dynamic = "force-dynamic";

export const metadata = { title: "Record your voice — Lyrixis" };

export default async function RecordVoicePage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const params = await searchParams;
  return <VoiceStudioShell step="record" demo={params.demo === "1"} />;
}
