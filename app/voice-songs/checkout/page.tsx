import { VoiceStudioShell } from "@/components/voice-songs/VoiceStudioShell";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Voice songs checkout — Lyrixis",
  description: "Pay for a voice setup, voice song, extra take, or release with Ixis or by card.",
};

export default async function VoiceCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string; sku?: string; songId?: string; paid?: string; session_id?: string; cancelled?: string }>;
}) {
  const params = await searchParams;
  return (
    <VoiceStudioShell
      step="checkout"
      demo={params.demo === "1"}
      query={{
        sku: params.sku,
        songId: params.songId,
        paid: params.paid,
        sessionId: params.session_id,
        cancelled: params.cancelled === "1",
      }}
    />
  );
}
