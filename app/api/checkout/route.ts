import { jsonError, HttpError } from "@/lib/errors";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { CARD_COMING_SOON, cardCheckoutReady, createCardCheckout } from "@/lib/card-checkout";

export const dynamic = "force-dynamic";

const UNLOCKABLE = new Set(["completed", "manual_review"]);

export async function GET() {
  return Response.json({ card: cardCheckoutReady() });
}

export async function POST(request: Request) {
  try {
    if (!cardCheckoutReady()) {
      throw new HttpError(503, "card_coming_soon", `${CARD_COMING_SOON}. You can pay with Ixis.`);
    }
    const user = await requireUser();
    const body = (await request.json().catch(() => null)) as {
      product?: string;
      trackId?: string;
      kind?: string;
    } | null;
    if (body?.product === "all_access") {
      const session = await createCardCheckout({ userId: user.id, email: user.email, product: "all_access" });
      return Response.json({ url: session.url });
    }
    if (body?.product !== "track" || !body.trackId) {
      throw new HttpError(400, "product", "Choose a song or All-Access.");
    }
    const kind = body.kind === "upload" || body.trackId.startsWith("trx_") ? "upload" : "catalog";
    const admin = createAdminClient();
    if (kind === "upload") {
      const { data } = await admin
        .from("tracks")
        .select("status, paid")
        .eq("public_id", body.trackId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!data) throw new HttpError(404, "track_not_found", "That song is not on your account.");
      if (data.paid) return Response.json({ already: true, message: "Already unlocked for your account." });
      if (!UNLOCKABLE.has(String(data.status))) {
        throw new HttpError(409, "not_ready", "Lyrics are still processing. Pay when they are ready.");
      }
    } else {
      const { data: rec } = await admin.from("catalog_recordings").select("public_id").eq("public_id", body.trackId).maybeSingle();
      if (!rec) throw new HttpError(404, "track_not_found", "Track not found");
      const { data: existing } = await admin
        .from("track_unlocks")
        .select("receipt_id")
        .eq("user_id", user.id)
        .eq("recording_public_id", body.trackId)
        .maybeSingle();
      if (existing) return Response.json({ already: true, message: "Already unlocked for your account." });
    }
    const session = await createCardCheckout({
      userId: user.id,
      email: user.email,
      product: "track",
      trackId: body.trackId,
      kind,
    });
    return Response.json({ url: session.url });
  } catch (error) {
    return jsonError(error);
  }
}
