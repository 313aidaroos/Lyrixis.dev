import { VoiceStudioShell } from "@/components/voice-songs/VoiceStudioShell";

export const dynamic = "force-dynamic";

export const metadata = { title: "Your voice song — Lyrixis" };

export default async function PreviewPage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const params = await searchParams;
  return <VoiceStudioShell step="preview" demo={params.demo === "1"} />;
}
