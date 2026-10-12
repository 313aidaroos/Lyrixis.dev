/**
 * Voice Songs prices locked by Awad (plan approved 2026-10-12). 100 Ixis = $1.
 * Wallet SKUs are the Ixis names. Card amounts are the same dollars, charged only
 * when card checkout is configured. This file does not start a charge.
 */
export const IXIS_PER_DOLLAR = 100;

export const VOICE_SONG_SKUS = {
  setup: "lyrixis.voice.setup",
  song: "lyrixis.voice.song",
  take: "lyrixis.voice.take",
  release: "lyrixis.voice.release",
} as const;

export type VoiceSongSku = keyof typeof VOICE_SONG_SKUS;

export type VoiceSongPrice = {
  sku: VoiceSongSku;
  productKey: string;
  usd: number;
  ixis: number;
  label: string;
  detail: string;
};

export const VOICE_SONG_PRICES: Record<VoiceSongSku, VoiceSongPrice> = {
  setup: {
    sku: "setup",
    productKey: VOICE_SONG_SKUS.setup,
    usd: 5,
    ixis: 500,
    label: "Voice setup",
    detail: "One-time private voice model, including a re-record.",
  },
  song: {
    sku: "song",
    productKey: VOICE_SONG_SKUS.song,
    usd: 6,
    ixis: 600,
    label: "Voice song",
    detail: "Three full takes, lyric edits, and two vocal re-sings.",
  },
  take: {
    sku: "take",
    productKey: VOICE_SONG_SKUS.take,
    usd: 1,
    ixis: 100,
    label: "Extra take",
    detail: "One more full take after the three included.",
  },
  release: {
    sku: "release",
    productKey: VOICE_SONG_SKUS.release,
    usd: 9,
    ixis: 900,
    label: "Release",
    detail: "One single, queued for review, then sent to the distributor.",
  },
};

/** Master royalty split recorded on every release. User owns the master. */
export const ROYALTY_USER_BPS = 9000;
export const ROYALTY_LYRIXIS_BPS = 1000;

export const INCLUDED_TAKES = 3;
/** All-Access $30/mo: voice model + these monthly allowances. */
export const ALL_ACCESS_SONGS_PER_MONTH = 4;
export const ALL_ACCESS_RELEASES_PER_MONTH = 1;
/** Anti-spam cap, even if someone pays. No bulk uploads. */
export const MAX_RELEASES_PER_MONTH = 4;

export const SAMPLE_MIN_SECONDS = 180;
export const SAMPLE_MAX_SECONDS = 300;

export function priceFor(sku: VoiceSongSku): VoiceSongPrice {
  return VOICE_SONG_PRICES[sku];
}

export function periodKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}
