import { HttpError } from "@/lib/errors";
import { stripeSignatureOk } from "@/lib/voice-songs/checkout";
import { cardCheckoutReady, fulfillCheckoutSession, publicCardMessage, stripeSecret, type CheckoutSession } from "@/lib/card-checkout";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!cardCheckoutReady() || !stripeSecret() || !secret) {
    return Response.json({ error: { code: "card_coming_soon", message: "Card coming soon." } }, { status: 503 });
  }
  const payload = await request.text();
  if (!stripeSignatureOk(payload, request.headers.get("stripe-signature"), secret)) {
    return Response.json({ error: { code: "signature", message: "The card notice could not be verified." } }, { status: 400 });
  }
  let event: { type?: string; data?: { object?: CheckoutSession } };
  try {
    event = JSON.parse(payload) as { type?: string; data?: { object?: CheckoutSession } };
  } catch {
    return Response.json({ error: { code: "payload", message: "The card notice could not be read." } }, { status: 400 });
  }
  if (event.type === "checkout.session.completed" && event.data?.object) {
    try {
      await fulfillCheckoutSession(event.data.object);
    } catch (error) {
      if (error instanceof HttpError && (error.status === 402 || error.status === 403 || error.status === 404)) {
        return Response.json({ received: true });
      }
      const message = error instanceof Error ? publicCardMessage(error.message, "The card payment could not be applied.") : "The card payment could not be applied.";
      return Response.json({ error: { code: "fulfill", message } }, { status: 500 });
    }
  }
  return Response.json({ received: true });
}
