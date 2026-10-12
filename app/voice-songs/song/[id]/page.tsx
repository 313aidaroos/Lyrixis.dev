import { SongDesk } from "@/components/voice-songs/SongDesk";

export const dynamic = "force-dynamic";

export default async function SongPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SongDesk songId={id} />;
}
