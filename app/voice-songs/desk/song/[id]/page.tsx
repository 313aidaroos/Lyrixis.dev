import { SongDesk } from "@/components/voice-songs/SongDesk";

export const dynamic = "force-dynamic";

export const metadata = { title: "Voice sample song — Lyrixis" };

export default async function DeskSongPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SongDesk songId={id} />;
}
