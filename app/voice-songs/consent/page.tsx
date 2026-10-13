import { VoiceStudio } from "@/components/voice-songs/VoiceStudio";

export const dynamic = "force-dynamic";

export const metadata = { title: "Voice consent — Lyrixis" };

export default async function ConsentPage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const params = await searchParams;
  return <VoiceStudio step="consent" demo={params.demo === "1"} />;
}
