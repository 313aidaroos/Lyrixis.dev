import { jsonError } from "@/lib/errors";
import { beginLiveness, finishLiveness, voiceSession } from "@/lib/voice-songs/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await voiceSession();
    const body = (await request.json()) as { mime?: string; bytes?: number; durationSeconds?: number };
    const result = await beginLiveness({
      userId: session.user.id,
      mime: String(body.mime || "audio/webm"),
      bytes: Number(body.bytes || 0),
      durationSeconds: Number(body.durationSeconds || 0),
    });
    return Response.json(result);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const session = await voiceSession();
    const body = (await request.json()) as { path?: string; mime?: string; bytes?: number; durationSeconds?: number };
    const profile = await finishLiveness({
      userId: session.user.id,
      path: String(body.path || ""),
      mime: String(body.mime || "audio/webm"),
      bytes: Number(body.bytes || 0),
      durationSeconds: Number(body.durationSeconds || 0),
    });
    return Response.json({ ok: true, status: profile.status, method: profile.liveness_method });
  } catch (error) {
    return jsonError(error);
  }
}
