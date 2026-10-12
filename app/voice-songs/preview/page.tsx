import { VoiceStudio } from "@/components/voice-songs/VoiceStudio";

export const dynamic = "force-dynamic";

export const metadata = { title: "Your voice song — Lyrixis" };

export default async function PreviewPage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const params = await searchParams;
  return <VoiceStudio step="preview" demo={params.demo === "1"} />;
}
