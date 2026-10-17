/**
 * The public price list. Amounts come from the locked pricing modules so the
 * page cannot drift from what checkout charges.
 */
import {
  ALL_ACCESS_MONTHLY_IXIS,
  ALL_ACCESS_MONTHLY_USD,
  ALL_ACCESS_TERMS,
  TRACK_UNLOCK_IXIS,
  TRACK_UNLOCK_USD,
} from "@/lib/ixis-pricing";
import { WALLET_BUY_URL } from "@/lib/wallet";
import {
  VOICE_RELEASE_IXIS,
  VOICE_RELEASE_SKU,
  VOICE_RELEASE_USD,
  VOICE_SETUP_IXIS,
  VOICE_SETUP_SKU,
  VOICE_SETUP_USD,
  VOICE_SONG_IXIS,
  VOICE_SONG_SKU,
  VOICE_SONG_USD,
  VOICE_TAKE_IXIS,
  VOICE_TAKE_SKU,
} from "@/lib/voice-songs/pricing";

export type PriceCard =
  | { kind: "none"; reason: "ixis_only" | "contact" }
  | { kind: "link"; href: string; label: string }
  | { kind: "checkout"; product: "all_access"; label: string };

export type PriceRow = {
  id: string;
  name: string;
  price: string;
  ixis: string | null;
  detail: string;
  ixisHref: string | null;
  ixisLabel: string | null;
  card: PriceCard;
};

const money = (usd: number) => `$${usd}`;

export const PRICE_LIST: PriceRow[] = [
  {
    id: "song",
    name: "One song",
    price: money(TRACK_UNLOCK_USD),
    ixis: `${TRACK_UNLOCK_IXIS} Ixis`,
    detail: "Synced lyrics for that song: playback, corrections, and TXT, SRT, LRC, and JSON. No plan required.",
    ixisHref: "/catalog",
    ixisLabel: `Pay ${TRACK_UNLOCK_IXIS} Ixis`,
    card: { kind: "link", href: "/catalog", label: `Pay ${money(TRACK_UNLOCK_USD)} by card` },
  },
  {
    id: "voice-setup",
    name: "Voice setup",
    price: money(VOICE_SETUP_USD),
    ixis: `${VOICE_SETUP_IXIS} Ixis`,
    detail: "A one-time private model of your own voice.",
    ixisHref: `/voice-songs/checkout?sku=${VOICE_SETUP_SKU}`,
    ixisLabel: `Pay ${VOICE_SETUP_IXIS} Ixis`,
    card: { kind: "link", href: `/voice-songs/checkout?sku=${VOICE_SETUP_SKU}`, label: `Pay ${money(VOICE_SETUP_USD)} by card` },
  },
  {
    id: "voice-song",
    name: "Voice song",
    price: money(VOICE_SONG_USD),
    ixis: `${VOICE_SONG_IXIS} Ixis`,
    detail: "One song in your voice, with 3 takes and a watermarked preview.",
    ixisHref: `/voice-songs/checkout?sku=${VOICE_SONG_SKU}`,
    ixisLabel: `Pay ${VOICE_SONG_IXIS} Ixis`,
    card: { kind: "link", href: `/voice-songs/checkout?sku=${VOICE_SONG_SKU}`, label: `Pay ${money(VOICE_SONG_USD)} by card` },
  },
  {
    id: "extra-take",
    name: "Extra take",
    price: `${VOICE_TAKE_IXIS} Ixis`,
    ixis: `${VOICE_TAKE_IXIS} Ixis`,
    detail: "One more full take of a voice song. Ixis only.",
    ixisHref: `/voice-songs/checkout?sku=${VOICE_TAKE_SKU}`,
    ixisLabel: `Pay ${VOICE_TAKE_IXIS} Ixis`,
    card: { kind: "none", reason: "ixis_only" },
  },
  {
    id: "release",
    name: "Release",
    price: money(VOICE_RELEASE_USD),
    ixis: `${VOICE_RELEASE_IXIS} Ixis`,
    detail:
      "One single after review. Store status is pending distributor. A release is not live on Spotify, Apple Music, Tidal, or any other store.",
    ixisHref: `/voice-songs/checkout?sku=${VOICE_RELEASE_SKU}`,
    ixisLabel: `Pay ${VOICE_RELEASE_IXIS} Ixis`,
    card: { kind: "link", href: `/voice-songs/checkout?sku=${VOICE_RELEASE_SKU}`, label: `Pay ${money(VOICE_RELEASE_USD)} by card` },
  },
  {
    id: "all-access",
    name: "Lyrixis All-Access",
    price: `${money(ALL_ACCESS_MONTHLY_USD)}/month`,
    ixis: `${ALL_ACCESS_MONTHLY_IXIS.toLocaleString()} Ixis / month`,
    detail: `Includes your voice model, 4 voice songs, and 1 release a month, plus unlimited song lyrics. ${ALL_ACCESS_TERMS}`,
    ixisHref: WALLET_BUY_URL,
    ixisLabel: "Pay with Ixis",
    card: { kind: "checkout", product: "all_access", label: `Pay ${money(ALL_ACCESS_MONTHLY_USD)}/month by card` },
  },
  {
    id: "enterprise",
    name: "Label / Enterprise",
    price: "Contact sales",
    ixis: null,
    detail: "No fixed price. For labels and companies. Tell us the company, a contact, songs a month, and seats.",
    ixisHref: "#contact-sales",
    ixisLabel: "Contact sales",
    card: { kind: "none", reason: "contact" },
  },
];
