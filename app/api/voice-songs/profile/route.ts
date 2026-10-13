import { jsonError } from "@/lib/errors";
import { eraseVoice, voiceSession } from "@/lib/voice-songs/service";

export const dynamic = "force-dynamic";

export async function DELETE() {
  try {
    const session = await voiceSession();
    await eraseVoice(session.user.id);
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
