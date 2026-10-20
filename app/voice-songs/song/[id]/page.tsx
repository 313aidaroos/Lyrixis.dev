import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SongRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/voice-songs/desk/song/${id}`);
}
