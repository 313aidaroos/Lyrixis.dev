import { VoiceStudioShell } from "@/components/voice-songs/VoiceStudioShell";

export const dynamic = "force-dynamic";

export const metadata = { title: "Voice song — Lyrixis" };

export default async function VoiceSongPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ demo?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  return <VoiceStudioShell step="preview" demo={query.demo === "1"} songId={id} />;
}
