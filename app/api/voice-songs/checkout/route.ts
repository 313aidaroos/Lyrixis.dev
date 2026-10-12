import { jsonError } from "@/lib/errors";
import { confirmCard, isVoiceSku, startCheckout } from "@/lib/voice-songs/billing";
import { voiceSession } from "@/lib/voice-songs/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await voiceSession();
    const body = (await request.json()) as { sku?: string; method?: string; songId?: string };
    if (!body.sku || !isVoiceSku(body.sku)) {
      return Response.json({ error: { code: "sku", message: "Unknown voice song product." } }, { status: 400 });
    }
    const method = body.method === "card" ? "card" : "ixis";
    const result = await startCheckout({
      userId: session.user.id,
      email: session.user.email,
      owner: session.owner,
      sku: body.sku,
      method,
      songId: body.songId,
    });
    return Response.json(result);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const session = await voiceSession();
    const body = (await request.json()) as { sessionId?: string };
    const result = await confirmCard({ userId: session.user.id, sessionId: String(body.sessionId || "") });
    return Response.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
