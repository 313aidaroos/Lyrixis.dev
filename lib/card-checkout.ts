/**
 * Card checkout for Lyrixis products. Ixis stays in the Apixis Wallet (redeem / buy).
 * This file does not store an Ixis balance. A paid card session only unlocks the
 * same song row the Wallet path already writes, or points All-Access at Stripe.
 * Card checkout stays off until STRIPE_SECRET_KEY is set.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { HttpError } from "@/lib/errors";
import { getAppUrl } from "@/lib/env";
import { ALL_ACCESS_MONTHLY_USD, TRACK_UNLOCK_USD } from "@/lib/ixis-pricing";
import { CARD_COMING_SOON } from "@/lib/card-copy";

export { CARD_COMING_SOON };

const SECRET_LEAK = /sk_(live|test)_|rk_(live|test)_|whsec_|apx_live_/i;

export function stripeSecret(env: Record<string, string | undefined> = process.env): string | undefined {
  const key = env.STRIPE_SECRET_KEY?.trim();
  return key ? key : undefined;
}

/** True only when the server holds a Stripe secret. The browser never receives the key. */
export function cardCheckoutReady(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(stripeSecret(env));
}

export function publicCardMessage(message: string | undefined, fallback = CARD_COMING_SOON): string {
  if (!message) return fallback;
  if (SECRET_LEAK.test(message)) return fallback;
  return message.slice(0, 240);
}

export function trackCardCents(): number {
  return Math.round(TRACK_UNLOCK_USD * 100);
}

export function allAccessCardCents(): number {
  return Math.round(ALL_ACCESS_MONTHLY_USD * 100);
}

export type CardProduct = "track" | "all_access";

export type CheckoutSession = {
  id?: string;
  mode?: string;
  status?: string;
  payment_status?: string;
  customer?: string | { id?: string } | null;
  metadata?: Record<string, string> | null;
  client_reference_id?: string | null;
};

export function sessionIsPaid(session: { mode?: string; status?: string; payment_status?: string }): boolean {
  if (session.mode === "subscription") {
    return session.status === "complete" && (session.payment_status === "paid" || session.payment_status === "no_payment_required");
  }
  return session.payment_status === "paid";
}

export function customerIdFrom(session: CheckoutSession): string | null {
  const customer = session.customer;
  if (typeof customer === "string" && customer.startsWith("cus_")) return customer;
  if (customer && typeof customer === "object" && typeof customer.id === "string" && customer.id.startsWith("cus_")) return customer.id;
  return null;
}

export function checkoutForm(input: {
  userId: string;
  email?: string | null;
  product: CardProduct;
  trackId?: string;
  kind?: "catalog" | "upload";
  origin?: string;
}): URLSearchParams {
  const origin = (input.origin ?? getAppUrl()).replace(/\/$/, "");
  const params = new URLSearchParams();
  const cents = input.product === "all_access" ? allAccessCardCents() : trackCardCents();
  const name = input.product === "all_access" ? "Lyrixis All-Access" : "Lyrixis song unlock";
  params.set("mode", input.product === "all_access" ? "subscription" : "payment");
  params.set("success_url", `${origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`);
  params.set("cancel_url", `${origin}/pricing?cancelled=1`);
  params.set("client_reference_id", input.userId);
  params.set("line_items[0][quantity]", "1");
  params.set("line_items[0][price_data][currency]", "usd");
  params.set("line_items[0][price_data][unit_amount]", String(cents));
  params.set("line_items[0][price_data][product_data][name]", name);
  if (input.product === "all_access") {
    params.set("line_items[0][price_data][recurring][interval]", "month");
    params.set("subscription_data[metadata][user_id]", input.userId);
    params.set("subscription_data[metadata][product]", "all_access");
  }
  params.set("metadata[user_id]", input.userId);
  params.set("metadata[product]", input.product);
  if (input.trackId) params.set("metadata[track_id]", input.trackId);
  if (input.kind) params.set("metadata[kind]", input.kind);
  if (input.email) params.set("customer_email", input.email);
  return params;
}

async function stripeFetch(path: string, init?: RequestInit): Promise<Response> {
  const key = stripeSecret();
  if (!key) throw new HttpError(503, "card_coming_soon", `${CARD_COMING_SOON}. You can pay with Ixis.`);
  return fetch(`https://api.stripe.com${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${key}`,
      ...(init?.body ? { "content-type": "application/x-www-form-urlencoded" } : {}),
      ...init?.headers,
    },
  });
}

export async function createCardCheckout(input: {
  userId: string;
  email?: string | null;
  product: CardProduct;
  trackId?: string;
  kind?: "catalog" | "upload";
}): Promise<{ url: string; id: string }> {
  if (!cardCheckoutReady()) {
    throw new HttpError(503, "card_coming_soon", `${CARD_COMING_SOON}. You can pay with Ixis.`);
  }
  const params = checkoutForm(input);
  const response = await stripeFetch("/v1/checkout/sessions", { method: "POST", body: params });
  const json = (await response.json().catch(() => ({}))) as { id?: string; url?: string; error?: { message?: string } };
  if (!response.ok || !json.url || !json.id) {
    throw new HttpError(502, "card_failed", publicCardMessage(json.error?.message, "Card checkout could not start. You can pay with Ixis."));
  }
  return { url: json.url, id: json.id };
}

export async function retrieveCheckoutSession(sessionId: string): Promise<CheckoutSession> {
  if (!/^cs_(test|live)_/.test(sessionId)) {
    throw new HttpError(400, "session", "That card checkout session is not valid.");
  }
  const response = await stripeFetch(`/v1/checkout/sessions/${encodeURIComponent(sessionId)}`);
  const json = (await response.json().catch(() => ({}))) as CheckoutSession & { error?: { message?: string } };
  if (!response.ok) {
    throw new HttpError(502, "card_failed", publicCardMessage(json.error?.message, "Could not confirm the card payment."));
  }
  return json;
}

function duplicate(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "23505" || /duplicate|unique/i.test(error.message ?? "");
}

/** Grant the product the person already paid for. Does not write an Ixis balance. */
export async function fulfillCheckoutSession(session: CheckoutSession, expectedUserId?: string): Promise<{ product: string }> {
  if (!session.id || !sessionIsPaid(session)) {
    throw new HttpError(402, "unpaid", "The card payment is not complete. Nothing on your account was changed.");
  }
  const userId = session.metadata?.user_id || session.client_reference_id || "";
  if (!userId || (expectedUserId && userId !== expectedUserId)) {
    throw new HttpError(403, "forbidden", "That payment is not on your account.");
  }
  const product = session.metadata?.product === "all_access" ? "all_access" : "track";
  const admin = createAdminClient();
  const customer = customerIdFrom(session);
  if (customer) {
    await admin.from("users").update({ stripe_customer_id: customer }).eq("id", userId);
  }
  if (product === "all_access") return { product };

  const trackId = session.metadata?.track_id;
  const kind = session.metadata?.kind === "upload" || (trackId && trackId.startsWith("trx_")) ? "upload" : "catalog";
  if (!trackId) throw new HttpError(400, "track", "That card payment has no song on it.");

  if (kind === "upload") {
    const { data, error } = await admin
      .from("tracks")
      .update({ paid: true })
      .eq("public_id", trackId)
      .eq("user_id", userId)
      .select("id");
    if (error) throw new HttpError(500, "unlock_failed", "The card payment went through, but the song could not be unlocked. Email lyrixis@apixis.dev.");
    if (!data || data.length === 0) {
      const existing = await admin.from("tracks").select("id").eq("public_id", trackId).eq("user_id", userId).eq("paid", true).maybeSingle();
      if (!existing.data) throw new HttpError(404, "track_not_found", "That song is not on your account.");
    }
    return { product };
  }

  const { error } = await admin.from("track_unlocks").insert({
    user_id: userId,
    recording_public_id: trackId,
    receipt_id: `card:${session.id}`,
  });
  if (error && !duplicate(error)) {
    throw new HttpError(500, "unlock_failed", "The card payment went through, but the song could not be unlocked. Email lyrixis@apixis.dev.");
  }
  return { product };
}

export async function cardAllAccessActive(email: string): Promise<boolean> {
  const key = stripeSecret();
  if (!key || !email) return false;
  const admin = createAdminClient();
  const { data } = await admin.from("users").select("stripe_customer_id").eq("email", email).maybeSingle();
  const customer = typeof data?.stripe_customer_id === "string" ? data.stripe_customer_id : "";
  if (!customer.startsWith("cus_")) return false;
  try {
    const response = await fetch(
      `https://api.stripe.com/v1/subscriptions?customer=${encodeURIComponent(customer)}&status=active&limit=10`,
      { headers: { authorization: `Bearer ${key}` } },
    );
    if (!response.ok) return false;
    const json = (await response.json().catch(() => ({}))) as { data?: { metadata?: { product?: string } }[] };
    return (json.data ?? []).some((item) => item.metadata?.product === "all_access");
  } catch {
    return false;
  }
}
