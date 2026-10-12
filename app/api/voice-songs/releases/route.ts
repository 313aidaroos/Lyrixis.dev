import { jsonError } from "@/lib/errors";
import { attachCover, beginCover, publicRelease, releasesForUser, submitVoiceRelease } from "@/lib/voice-songs/releases";
import { voiceSession } from "@/lib/voice-songs/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await voiceSession();
    const rows = await releasesForUser(session.user.id);
    return Response.json({ releases: rows.map(publicRelease) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await voiceSession();
    const body = (await request.json()) as {
      action?: string;
      songId?: string;
      artistName?: string;
      title?: string;
      writer?: string;
      producer?: string;
      rightsAccepted?: boolean;
      funding?: string;
      releaseId?: string;
      mime?: string;
      path?: string;
    };
    if (body.action === "cover") {
      const upload = await beginCover(session.user.id, String(body.releaseId || ""), String(body.mime || "image/jpeg"));
      return Response.json({ upload });
    }
    if (body.action === "cover-done") {
      await attachCover(session.user.id, String(body.releaseId || ""), String(body.path || ""));
      return Response.json({ ok: true });
    }
    const row = await submitVoiceRelease({
      userId: session.user.id,
      owner: session.owner,
      songId: String(body.songId || ""),
      funding: String(body.funding || "unpaid"),
      draft: {
        artistName: String(body.artistName || ""),
        title: String(body.title || ""),
        writer: String(body.writer || ""),
        producer: String(body.producer || ""),
        aiVocals: true,
        aiMusic: true,
        aiLyrics: true,
        rightsAccepted: body.rightsAccepted === true,
        releasesThisMonth: 0,
      },
    });
    return Response.json({ release: publicRelease(row) });
  } catch (error) {
    return jsonError(error);
  }
}
