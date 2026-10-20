/**
 * Canonical Lyrixis prices (Awad, 2026-10-06). 100 Ixis = $1.
 *
 * What is charged today: Wallet SKU `lyrixis.track.unlock` = 300 Ixis ($3) per song.
 * The 1–99 row in `pricing_tiers` must show the same number. Prod was fixed to 300 by
 * migration 20261005_track_unlock_price_300.sql; the display code still pins the 1-song
 * tier to the SKU price so an old seed can never show 299.
 *
 * All-Access is $30/month (3,000 Ixis). Card checkout runs only when STRIPE_SECRET_KEY
 * is set; otherwise the site says card coming soon. This file does not start a charge.
 * Label / Enterprise has no fixed price. Ixis balances stay in the Apixis Wallet.
 */
export const IXIS_PER_DOLLAR = 100;
export const TRACK_UNLOCK_SKU = "lyrixis.track.unlock";
export const TRACK_UNLOCK_IXIS = 300;
export const TRACK_UNLOCK_USD = TRACK_UNLOCK_IXIS / IXIS_PER_DOLLAR;
export const ALL_ACCESS_MONTHLY_USD = 30;
export const ALL_ACCESS_MONTHLY_IXIS = ALL_ACCESS_MONTHLY_USD * IXIS_PER_DOLLAR;
export const SALES_EMAIL = "awad@apixis.dev";

export type PlanFeatureStatus = "included" | "coming_soon";

/**
 * Honest plan list. Synced lyrics, playback, corrections, and TXT/SRT/LRC/JSON exports exist.
 * Lyric video: no video export in services/exports.ts.
 * Translations: README marks them deferred; the pipeline only writes translation_cost_cents: 0.
 * Voices: production stays closed unless VOICES_LIVE=true (lib/voices/context.ts).
 */
export const ALL_ACCESS_FEATURES: { name: string; status: PlanFeatureStatus; detail: string }[] = [
  {
    name: "Unlimited song lyrics",
    status: "included",
    detail: "Synced lyrics, playback, line corrections, and TXT, SRT, LRC, and JSON downloads.",
  },
  {
    name: "Voice songs",
    status: "included",
    detail: "Your own voice model, 4 voice songs, and 1 release each month. The Voices marketplace stays separate.",
  },
  {
    name: "Lyric video downloads",
    status: "coming_soon",
    detail: "A video of your lyrics is not available yet.",
  },
  {
    name: "Translations",
    status: "coming_soon",
    detail: "Line-by-line translation is not available yet.",
  },
  {
    name: "Voices",
    status: "coming_soon",
    detail: "The Voices marketplace stays off until it opens. Your own voice is Voice songs, not this.",
  },
];

export const ALL_ACCESS_TERMS =
  "Renews automatically every month. Cancel anytime. It stays active until the end of the month you already paid for.";

export const PAYMENT_CHOICE =
  "Pay by card or with Ixis (100 Ixis = $1). Add Ixis in the Apixis Wallet.";

export const PLAN_FAQ: { q: string; a: string }[] = [
  {
    q: "What do I get for $30?",
    a: "Lyrixis All-Access is $30 a month (3,000 Ixis). It renews every month. Cancel anytime and it stays active until the end of the month you already paid for. It includes unlimited song lyrics, plus your own voice model, 4 voice songs, and 1 release each month. Lyric video downloads, translations, and the Voices marketplace are coming soon.",
  },
  {
    q: "Can I pay with a card?",
    a: "You can pay by card or with Ixis. 100 Ixis equals $1. Card coming soon until card checkout is turned on. Ixis works today: one song is 300 Ixis ($3) through the Apixis Wallet. Voice songs can take a card or Ixis once that checkout is open.",
  },
  {
    q: "How do I cancel?",
    a: "Cancel anytime. All-Access stays active until the end of the month you already paid for. Email awad@apixis.dev to cancel the renewal.",
  },
  {
    q: "What is Ixis?",
    a: "Ixis is the balance in the Apixis Wallet, shared across Apixis sites. 100 Ixis equals $1. One song on Lyrixis is 300 Ixis ($3). All-Access is 3,000 Ixis ($30) a month. New Apixis IDs get 1,000 free Ixis once.",
  },
  {
    q: "What if I am a label or a company?",
    a: "Choose Label / Enterprise. There is no fixed price. Fill in Contact sales with your company, your name, work email, phone if you want, about how many songs per month, how many team seats, and a message. It is saved and emailed to awad@apixis.dev. After Awad marks the company as Enterprise, the owner invites the team. Everyone on that company account gets All-Access for the company's songs.",
  },
];

/** Per-song Ixis for a tier row: the 1-song tier always equals the Wallet SKU price. */
export function tierRateIxis(tier: { min_songs: number; rate_cents: number }): number {
  return tier.min_songs <= 1 ? TRACK_UNLOCK_IXIS : tier.rate_cents;
}
