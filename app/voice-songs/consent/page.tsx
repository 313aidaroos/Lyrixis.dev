import { VoiceStudioShell } from "@/components/voice-songs/VoiceStudioShell";

export const dynamic = "force-dynamic";

export const metadata = { title: "Voice consent — Lyrixis" };

export default async function ConsentPage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const params = await searchParams;
  return <VoiceStudioShell step="consent" demo={params.demo === "1"} />;
}
