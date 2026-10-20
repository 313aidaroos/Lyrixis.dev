import { jsonError } from "@/lib/errors";
import { loadSongAudio, voiceSession } from "@/lib/voice-songs/service";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await voiceSession();
    const { id } = await context.params;
    const audio = await loadSongAudio(session.user.id, id);
    return new Response(new Uint8Array(audio.body), {
      headers: {
        "content-type": audio.mime,
        "content-disposition": `attachment; filename="${audio.filename}"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
