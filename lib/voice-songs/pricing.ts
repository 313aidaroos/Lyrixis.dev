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
