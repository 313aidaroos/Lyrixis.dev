/**
 * Voice Songs prices locked by Awad (plan dated 2026-10-12). 100 Ixis = $1.
 * Wallet product keys use the family dot form. Card checkout uses the shared
 * Stripe account; Ixis checkout redeems these keys from Apixis Wallet.
 */
export const IXIS_PER_USD = 100;

export const VOICE_SETUP_SKU = "lyrixis.voice.setup";
export const VOICE_SONG_SKU = "lyrixis.voice.song";
export const VOICE_TAKE_SKU = "lyrixis.voice.take";
export const VOICE_RELEASE_SKU = "lyrixis.voice.release";

export const VOICE_SETUP_USD = 5;
export const VOICE_SETUP_IXIS = 500;
export const VOICE_SONG_USD = 6;
export const VOICE_SONG_IXIS = 600;
export const VOICE_TAKE_IXIS = 100;
export const VOICE_RELEASE_USD = 9;
export const VOICE_RELEASE_IXIS = 900;

/** Master royalties the distributor reports. */
export const ROYALTY_USER_BPS = 9000;
export const ROYALTY_LYRIXIS_BPS = 1000;

/** Included with Lyrixis All-Access ($30 / month). */
export const ALL_ACCESS_VOICE_SONGS_PER_MONTH = 4;
export const ALL_ACCESS_RELEASES_PER_MONTH = 1;

export const TAKES_INCLUDED = 3;
/** Spam cap from the plan: no bulk uploads. */
export const MAX_RELEASES_PER_MONTH = 4;

export const VOICE_SONG_SKUS = [
  VOICE_SETUP_SKU,
  VOICE_SONG_SKU,
  VOICE_TAKE_SKU,
  VOICE_RELEASE_SKU,
] as const;

export type VoiceSongSku = (typeof VOICE_SONG_SKUS)[number];

export type VoiceFunding = "unpaid" | "owner_bypass" | "wallet" | "card" | "all_access" | "mock";

const PAID: ReadonlySet<string> = new Set(["owner_bypass", "wallet", "card", "all_access", "mock"]);

export function ixisForSku(sku: VoiceSongSku): number {
  switch (sku) {
    case VOICE_SETUP_SKU:
      return VOICE_SETUP_IXIS;
    case VOICE_SONG_SKU:
      return VOICE_SONG_IXIS;
    case VOICE_TAKE_SKU:
      return VOICE_TAKE_IXIS;
    case VOICE_RELEASE_SKU:
      return VOICE_RELEASE_IXIS;
    default: {
      const never: never = sku;
      return never;
    }
  }
}

/** Owner sessions skip the charge. Everyone else needs a captured funding source. */
export function mayGenerate(input: { owner: boolean; funding: string }): boolean {
  if (input.owner) return true;
  return PAID.has(input.funding);
}

/** 90 / 10 of a reported master-royalty amount, in cents. Nothing here is a store payout. */
export function splitReportedRoyalties(reportedCents: number): {
  artistCents: number;
  lyrixisCents: number;
  status: "pending distributor";
} {
  const cents = Math.max(0, Math.round(reportedCents));
  const artistCents = Math.round((cents * ROYALTY_USER_BPS) / 10000);
  return { artistCents, lyrixisCents: cents - artistCents, status: "pending distributor" };
}

export function mayRelease(input: { owner: boolean; funding: string; releasesThisMonth: number }): boolean {
  if (input.releasesThisMonth >= MAX_RELEASES_PER_MONTH) return false;
  if (input.owner) return true;
  return input.funding === "wallet" || input.funding === "card" || input.funding === "all_access" || input.funding === "owner_bypass";
}

/**
 * All-Access covers the voice model, 4 songs, and 1 release each month.
 * Counts are songs/releases already funded by all_access in the current month.
 */
export function allAccessCovers(input: {
  hasAllAccess: boolean;
  kind: "setup" | "song" | "release";
  setupsThisMonth: number;
  songsThisMonth: number;
  releasesThisMonth: number;
}): boolean {
  if (!input.hasAllAccess) return false;
  if (input.kind === "setup") return input.setupsThisMonth < 1;
  if (input.kind === "song") return input.songsThisMonth < ALL_ACCESS_VOICE_SONGS_PER_MONTH;
  return input.releasesThisMonth < ALL_ACCESS_RELEASES_PER_MONTH;
}

/** Desk-flow aliases. The live studio uses the product-key exports above. */
export const IXIS_PER_DOLLAR = IXIS_PER_USD;
export const INCLUDED_TAKES = TAKES_INCLUDED;
export const ALL_ACCESS_SONGS_PER_MONTH = ALL_ACCESS_VOICE_SONGS_PER_MONTH;
export const SAMPLE_MIN_SECONDS = 180;
export const SAMPLE_MAX_SECONDS = 300;

export const VOICE_PRICE_KEYS = {
  setup: VOICE_SETUP_SKU,
  song: VOICE_SONG_SKU,
  take: VOICE_TAKE_SKU,
  release: VOICE_RELEASE_SKU,
} as const;

export type VoicePriceKey = keyof typeof VOICE_PRICE_KEYS;

export type VoiceSongPrice = {
  sku: VoicePriceKey;
  productKey: string;
  usd: number;
  ixis: number;
  label: string;
  detail: string;
};

export const VOICE_SONG_PRICES: Record<VoicePriceKey, VoiceSongPrice> = {
  setup: {
    sku: "setup",
    productKey: VOICE_SETUP_SKU,
    usd: VOICE_SETUP_USD,
    ixis: VOICE_SETUP_IXIS,
    label: "Voice setup",
    detail: "One-time private voice model, including a re-record.",
  },
  song: {
    sku: "song",
    productKey: VOICE_SONG_SKU,
    usd: VOICE_SONG_USD,
    ixis: VOICE_SONG_IXIS,
    label: "Voice song",
    detail: "Three full takes, lyric edits, and two vocal re-sings.",
  },
  take: {
    sku: "take",
    productKey: VOICE_TAKE_SKU,
    usd: 1,
    ixis: VOICE_TAKE_IXIS,
    label: "Extra take",
    detail: "One more full take after the three included.",
  },
  release: {
    sku: "release",
    productKey: VOICE_RELEASE_SKU,
    usd: VOICE_RELEASE_USD,
    ixis: VOICE_RELEASE_IXIS,
    label: "Release",
    detail: "One single, queued for review, then sent to the distributor.",
  },
};

export function priceFor(sku: VoicePriceKey): VoiceSongPrice {
  return VOICE_SONG_PRICES[sku];
}

export function periodKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}
