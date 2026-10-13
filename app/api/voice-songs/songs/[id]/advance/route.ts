import { jsonError } from "@/lib/errors";
import { advanceSong, publicSong, voiceSession } from "@/lib/voice-songs/service";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await voiceSession();
    const { id } = await context.params;
    const song = await advanceSong({ userId: session.user.id, owner: session.owner, songId: id });
    return Response.json({ song: publicSong(song) });
  } catch (error) {
    return jsonError(error);
  }
}
