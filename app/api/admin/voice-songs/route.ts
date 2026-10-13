import { jsonError, HttpError } from "@/lib/errors";
import { decideRelease, publicRelease, queueForReview } from "@/lib/voice-songs/releases";
import { voiceSession } from "@/lib/voice-songs/service";

export const dynamic = "force-dynamic";

async function ownerEmail() {
  const session = await voiceSession();
  if (!session.ownerEmail) throw new HttpError(403, "forbidden", "This queue is only for the Lyrixis owner.");
  return session;
}

export async function GET() {
  try {
    await ownerEmail();
    const rows = await queueForReview();
    return Response.json({ releases: rows.map(publicRelease) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    await ownerEmail();
    const body = (await request.json()) as { id?: string; decision?: string; note?: string };
    const decision = body.decision === "reject" ? "reject" : "approve";
    const result = await decideRelease({ id: String(body.id || ""), decision, note: String(body.note || "") });
    return Response.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
