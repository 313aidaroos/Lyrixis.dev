import { jsonError } from "@/lib/errors";
import { beginSample, finishSample, voiceSession } from "@/lib/voice-songs/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await voiceSession();
    const body = (await request.json()) as { mime?: string; bytes?: number; durationSeconds?: number; peak?: number; rms?: number };
    const result = await beginSample({
      userId: session.user.id,
      mime: String(body.mime || "audio/webm"),
      bytes: Number(body.bytes || 0),
      durationSeconds: Number(body.durationSeconds || 0),
      peak: body.peak,
      rms: body.rms,
    });
    return Response.json(result);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const session = await voiceSession();
    const body = (await request.json()) as { path?: string; mime?: string; bytes?: number; durationSeconds?: number; peak?: number; rms?: number };
    const profile = await finishSample({
      userId: session.user.id,
      path: String(body.path || ""),
      mime: String(body.mime || "audio/webm"),
      bytes: Number(body.bytes || 0),
      durationSeconds: Number(body.durationSeconds || 0),
      peak: body.peak,
      rms: body.rms,
    });
    return Response.json({ ok: true, status: profile.status, sampleSeconds: profile.sample_seconds });
  } catch (error) {
    return jsonError(error);
  }
}
