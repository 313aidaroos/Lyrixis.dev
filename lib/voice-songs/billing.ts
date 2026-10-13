import { createAdminClient } from "@/lib/supabase/admin";
import { redeem, buyIxisUrl, isWalletConfigured, entitlements, WalletError } from "@/lib/apixis-wallet";
import { apixisOwner } from "@/lib/apixis-login";
import { HttpError } from "@/lib/errors";
import { getAppUrl } from "@/lib/env";
import {
  VOICE_RELEASE_SKU,
  VOICE_SETUP_SKU,
  VOICE_SONG_SKU,
  VOICE_SONG_SKUS,
  VOICE_TAKE_SKU,
  TAKES_INCLUDED,
  type VoiceSongSku,
  ixisForSku,
} from "./pricing";
import { allAccessProductMatch, cardCents, checkoutAction } from "./checkout";
import { songForUser, updateSong } from "./repo";

export type PurchaseRow = {
  id: string;
  user_id: string;
  sku: string;
  price_ixis: number;
  method: string;
  status: string;
  song_id: string | null;
  created_at: string;
};

function db() {
  return createAdminClient();
}

function monthStart(): string {
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  return start.toISOString();
}

export function isVoiceSku(value: string): value is VoiceSongSku {
  return (VOICE_SONG_SKUS as readonly string[]).includes(value);
}

function raiseDb(error: { message: string }): never {
  if (/voice_purchases|voice_releases|schema cache|does not exist/i.test(error.message)) {
    throw new HttpError(503, "database", "Apply database/migrations/0008_voice_song_releases.sql on Supabase, then reload.");
  }
  throw new Error(error.message);
}

export async function usageThisMonth(userId: string) {
  const start = monthStart();
  const [monthResult, setupResult] = await Promise.all([
    db().from("voice_purchases").select("sku, method").eq("user_id", userId).eq("status", "captured").gte("created_at", start),
    db().from("voice_purchases").select("id").eq("user_id", userId).eq("status", "captured").eq("sku", VOICE_SETUP_SKU).limit(1),
  ]);
  if (monthResult.error) raiseDb(monthResult.error);
  if (setupResult.error) raiseDb(setupResult.error);
  const rows = monthResult.data ?? [];
  const count = (sku: string, method?: string) =>
    rows.filter((row) => row.sku === sku && (!method || row.method === method)).length;
  return {
    setups: count(VOICE_SETUP_SKU),
    songs: count(VOICE_SONG_SKU),
    releases: count(VOICE_RELEASE_SKU),
    allAccessSongs: count(VOICE_SONG_SKU, "all_access"),
    allAccessReleases: count(VOICE_RELEASE_SKU, "all_access"),
    allAccessSetups: count(VOICE_SETUP_SKU, "all_access"),
    setupPaid: (setupResult.data ?? []).length > 0,
  };
}

export async function hasAllAccess(email: string): Promise<boolean> {
  if (!isWalletConfigured()) return false;
  try {
    const owner = (await apixisOwner(email)) ?? email;
    const list = await entitlements(owner, "lyrixis");
    return list.some((item) => item.status === "active" && allAccessProductMatch(item.product_key));
  } catch {
    return false;
  }
}

async function insertPurchase(row: Record<string, unknown>): Promise<{ id: string; created: boolean }> {
  const { data, error } = await db().from("voice_purchases").insert(row).select("id").single();
  if (error) {
    const duplicate = error.code === "23505" || /duplicate|unique/i.test(error.message);
    if (duplicate && typeof row.idempotency_key === "string") {
      const existing = await db().from("voice_purchases").select("id").eq("idempotency_key", row.idempotency_key).maybeSingle();
      if (existing.data?.id) return { id: existing.data.id as string, created: false };
    }
    raiseDb(error);
  }
  if (!data) throw new Error("Could not record the purchase.");
  return { id: data.id as string, created: true };
}

function allowanceKey(kind: "owner" | "included", userId: string, sku: VoiceSongSku, songId?: string | null) {
  if (sku === VOICE_SETUP_SKU) return `${kind}-${userId}-setup`;
  return `${kind}-${userId}-${sku}-${songId || "open"}`;
}

async function grantExtraTake(userId: string, songId: string | null | undefined) {
  if (!songId) return;
  const song = await songForUser(songId, userId);
  if (!song) return;
  await updateSong(songId, userId, { takes_allowed: (song.takes_allowed || TAKES_INCLUDED) + 1 });
}

async function markSong(userId: string, songId: string | null | undefined, funding: string) {
  if (!songId) return;
  await updateSong(songId, userId, { funding });
}

const NAMES: Record<VoiceSongSku, string> = {
  [VOICE_SETUP_SKU]: "Lyrixis voice setup",
  [VOICE_SONG_SKU]: "Lyrixis voice song",
  [VOICE_TAKE_SKU]: "Lyrixis extra take",
  [VOICE_RELEASE_SKU]: "Lyrixis voice release",
};

export async function startCheckout(input: {
  userId: string;
  email: string;
  owner: boolean;
  sku: VoiceSongSku;
  method: "ixis" | "card";
  songId?: string | null;
}) {
  const usage = await usageThisMonth(input.userId);
  const included = await hasAllAccess(input.email);
  const action = checkoutAction({
    owner: input.owner,
    sku: input.sku,
    hasAllAccess: included,
    setupsThisMonth: usage.allAccessSetups,
    songsThisMonth: usage.allAccessSongs,
    releasesThisMonth: usage.allAccessReleases,
    method: input.method,
  });
  if (action.action === "blocked") throw new HttpError(400, "checkout", action.reason);

  const price = ixisForSku(input.sku);
  const funding = action.action === "owner_bypass" ? "owner_bypass" : action.action === "included" ? "all_access" : input.method === "card" ? "card" : "wallet";
  const method = action.action === "owner_bypass" ? "owner_bypass" : action.action === "included" ? "all_access" : input.method === "card" ? "card" : "ixis";

  if (action.action === "owner_bypass" || action.action === "included") {
    const kind = action.action === "owner_bypass" ? "owner" : "included";
    const { id, created } = await insertPurchase({
      user_id: input.userId,
      sku: input.sku,
      price_ixis: action.action === "owner_bypass" ? 0 : price,
      method,
      status: "captured",
      song_id: input.songId ?? null,
      idempotency_key: allowanceKey(kind, input.userId, input.sku, input.songId),
    });
    if (input.sku === VOICE_TAKE_SKU) {
      if (created) await grantExtraTake(input.userId, input.songId);
    } else {
      await markSong(input.userId, input.songId, funding);
    }
    return { ok: true as const, funding, purchaseId: id };
  }

  if (input.method === "card") {
    const cents = cardCents(input.sku);
    const key = process.env.STRIPE_SECRET_KEY?.trim();
    if (!cents || !key) {
      throw new HttpError(503, "not_configured", "Card checkout is not configured. Missing STRIPE_SECRET_KEY. You can pay with Ixis instead.");
    }
    const { id: purchaseId } = await insertPurchase({
      user_id: input.userId,
      sku: input.sku,
      price_ixis: price,
      method: "card",
      status: "pending",
      song_id: input.songId ?? null,
      idempotency_key: `card-${crypto.randomUUID()}`,
    });
    const origin = getAppUrl().replace(/\/$/, "");
    const params = new URLSearchParams();
    params.set("mode", "payment");
    params.set("success_url", `${origin}/voice-songs/checkout?paid=${purchaseId}&session_id={CHECKOUT_SESSION_ID}`);
    params.set("cancel_url", `${origin}/voice-songs/checkout?cancelled=1`);
    params.set("client_reference_id", purchaseId);
    params.set("line_items[0][quantity]", "1");
    params.set("line_items[0][price_data][currency]", "usd");
    params.set("line_items[0][price_data][unit_amount]", String(cents));
    params.set("line_items[0][price_data][product_data][name]", NAMES[input.sku]);
    params.set("metadata[purchase_id]", purchaseId);
    params.set("metadata[user_id]", input.userId);
    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/x-www-form-urlencoded" },
      body: params,
    });
    const json = (await response.json().catch(() => ({}))) as { id?: string; url?: string; error?: { message?: string } };
    if (!response.ok || !json.url || !json.id) {
      throw new HttpError(502, "card_failed", json.error?.message || "Card checkout could not start.");
    }
    await db().from("voice_purchases").update({ stripe_session_id: json.id }).eq("id", purchaseId).eq("user_id", input.userId);
    return { ok: true as const, url: json.url, purchaseId };
  }

  const owner = (await apixisOwner(input.email)) ?? input.email;
  const idempotencyKey = `vs-${input.userId.slice(0, 8)}-${input.sku}-${(input.songId ?? "setup").slice(0, 8)}-${crypto.randomUUID().slice(0, 8)}`;
  const { id: purchaseId } = await insertPurchase({
    user_id: input.userId,
    sku: input.sku,
    price_ixis: price,
    method: "ixis",
    status: "pending",
    song_id: input.songId ?? null,
    idempotency_key: idempotencyKey,
  });
  try {
    const result = await redeem({
      owner,
      productKey: input.sku,
      idempotencyKey,
      provision: async (reservation) => {
        await db()
          .from("voice_purchases")
          .update({ status: "captured", wallet_reservation_id: reservation.reservationId })
          .eq("id", purchaseId)
          .eq("user_id", input.userId);
        if (input.sku === VOICE_TAKE_SKU) await grantExtraTake(input.userId, input.songId);
        else await markSong(input.userId, input.songId, "wallet");
        return { purchaseId };
      },
      unprovision: async () => {
        await db().from("voice_purchases").update({ status: "released" }).eq("id", purchaseId).eq("user_id", input.userId);
        await markSong(input.userId, input.songId, "unpaid");
      },
    });
    if (!result.ok) {
      const returnUrl = `${getAppUrl().replace(/\/$/, "")}/voice-songs/checkout`;
      throw new HttpError(402, "insufficient_ixis", `Not enough Ixis. This is ${price} Ixis. Buy Ixis, then come back. ${buyIxisUrl("lyrixis", returnUrl)}`);
    }
    if (result.receiptId) {
      await db().from("voice_purchases").update({ wallet_receipt_id: result.receiptId }).eq("id", purchaseId);
    }
    return { ok: true as const, funding: "wallet" as const, purchaseId };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (error instanceof WalletError) throw new HttpError(502, "wallet", error.message);
    throw error;
  }
}

export async function confirmCard(input: { userId: string; sessionId: string }) {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new HttpError(503, "not_configured", "Card checkout is not configured. Missing STRIPE_SECRET_KEY.");
  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(input.sessionId)}`, {
    headers: { authorization: `Bearer ${key}` },
  });
  const json = (await response.json().catch(() => ({}))) as {
    payment_status?: string;
    metadata?: { purchase_id?: string; user_id?: string };
    client_reference_id?: string;
  };
  if (!response.ok) throw new HttpError(502, "card_failed", "Could not confirm the card payment.");
  const purchaseId = json.metadata?.purchase_id || json.client_reference_id;
  if (!purchaseId || (json.metadata?.user_id && json.metadata.user_id !== input.userId)) {
    throw new HttpError(403, "forbidden", "That payment is not on your account.");
  }
  if (json.payment_status !== "paid") throw new HttpError(402, "unpaid", "The card payment is not complete.");
  const { data } = await db()
    .from("voice_purchases")
    .select("song_id, sku, status")
    .eq("id", purchaseId)
    .eq("user_id", input.userId)
    .maybeSingle();
  if (!data) throw new HttpError(404, "not_found", "That payment is not on your account.");
  const already = data.status === "captured";
  await db().from("voice_purchases").update({ status: "captured", stripe_session_id: input.sessionId }).eq("id", purchaseId).eq("user_id", input.userId);
  if (!already && data.sku === VOICE_TAKE_SKU) await grantExtraTake(input.userId, data.song_id as string | null);
  else if (data.song_id && data.sku !== VOICE_TAKE_SKU) await markSong(input.userId, data.song_id as string, "card");
  return { ok: true, purchaseId };
}
