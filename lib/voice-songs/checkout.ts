import { createHmac, timingSafeEqual } from "crypto";
import {
  VOICE_RELEASE_SKU,
  VOICE_SETUP_SKU,
  VOICE_SONG_SKU,
  VOICE_TAKE_SKU,
  type VoiceSongSku,
  allAccessCovers,
  ixisForSku,
} from "./pricing";

/**
 * Live charges stay off until the Wallet SKUs and card checkout are registered.
 * Set VOICE_SONGS_PAYMENTS=live to open them. Owners still skip the charge.
 */
export function voicePaymentsLive(env: Record<string, string | undefined> = process.env): boolean {
  const flag = (env.VOICE_SONGS_PAYMENTS ?? "").trim().toLowerCase();
  return flag === "live";
}

export const PAYMENTS_CLOSED_REASON =
  "Payments are not open yet. The Wallet products lyrixis.voice.setup, lyrixis.voice.song, lyrixis.voice.take, and lyrixis.voice.release are not registered, and card checkout is off. Nothing was charged.";

export function cardAllowed(sku: VoiceSongSku): boolean {
  return sku !== VOICE_TAKE_SKU;
}

/** 100 Ixis = $1, so the Ixis price is also the card amount in cents. */
export function cardCents(sku: VoiceSongSku): number | null {
  if (!cardAllowed(sku)) return null;
  return ixisForSku(sku);
}

export type CheckoutAction =
  | { action: "owner_bypass" }
  | { action: "included" }
  | { action: "pay" }
  | { action: "blocked"; reason: string };

export function checkoutAction(input: {
  owner: boolean;
  sku: VoiceSongSku;
  hasAllAccess: boolean;
  setupsThisMonth: number;
  songsThisMonth: number;
  releasesThisMonth: number;
  method?: "ixis" | "card";
}): CheckoutAction {
  if (input.method === "card" && !cardAllowed(input.sku)) {
    return { action: "blocked", reason: "An extra take is 100 Ixis only." };
  }
  if (input.owner) return { action: "owner_bypass" };
  const kind = input.sku === VOICE_SETUP_SKU ? "setup" : input.sku === VOICE_SONG_SKU ? "song" : input.sku === VOICE_RELEASE_SKU ? "release" : null;
  if (
    kind &&
    allAccessCovers({
      hasAllAccess: input.hasAllAccess,
      kind,
      setupsThisMonth: input.setupsThisMonth,
      songsThisMonth: input.songsThisMonth,
      releasesThisMonth: input.releasesThisMonth,
    })
  ) {
    return { action: "included" };
  }
  if (input.sku === VOICE_TAKE_SKU) return { action: "pay" };
  return { action: "pay" };
}

export function stripeSignatureOk(payload: string, header: string | null, secret: string, nowSeconds = Math.floor(Date.now() / 1000)): boolean {
  if (!header || !secret) return false;
  const parts = new Map(header.split(",").map((part) => {
    const index = part.indexOf("=");
    return [part.slice(0, index), part.slice(index + 1)] as [string, string];
  }));
  const timestamp = Number(parts.get("t"));
  const given = parts.get("v1");
  if (!Number.isFinite(timestamp) || !given) return false;
  if (Math.abs(nowSeconds - timestamp) > 5 * 60) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function allAccessProductMatch(productKey: string): boolean {
  return /all[_-]?access/i.test(productKey);
}
