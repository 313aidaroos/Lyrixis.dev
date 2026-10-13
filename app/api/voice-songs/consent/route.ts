import { jsonError } from "@/lib/errors";
import { acceptConsent, voiceSession } from "@/lib/voice-songs/service";
import { VOICE_CONSENT_TEXT, VOICE_CONSENT_VERSION } from "@/lib/voice-songs/consent";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await voiceSession();
    const body = (await request.json()) as { accept?: boolean };
    if (body.accept !== true) {
      return Response.json({ error: { code: "consent", message: "Tick the consent box to continue." } }, { status: 400 });
    }
    const profile = await acceptConsent(session.user.id);
    return Response.json({
      ok: true,
      phrase: profile.liveness_phrase,
      version: VOICE_CONSENT_VERSION,
      text: VOICE_CONSENT_TEXT,
    });
  } catch (error) {
    return jsonError(error);
  }
}
