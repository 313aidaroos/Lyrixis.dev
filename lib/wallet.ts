/**
 * Apixis Wallet is the only place cash becomes Ixis (Stripe webhook on Wallet).
 * Lyrixis links out to buy, then spends or redeems Ixis later. No Checkout here.
 *
 * Query shape is origin + return_url. Refine this helper when
 * docs/WALLET_EMBED.md lands in ApixisWallet — callers should not build the URL.
 */

export const WALLET_APP_URL = "https://apixis-wallet.vercel.app";

/** Product slug Wallet allowlists. Host form `lyrixis.vercel.app` is the alternate. */
export const WALLET_ORIGIN = "lyrixis";

/**
 * Allowlisted post-purchase returns. Wallet must accept these exact URLs.
 * Dashboard is the default: it is the logged-in app, where Ixis are spent.
 * Pricing stays a quote page, not the return landing.
 */
export const WALLET_RETURN_URLS = {
  dashboard: "https://lyrixis.apixis.dev/dashboard",
  pricing: "https://lyrixis.apixis.dev/pricing",
} as const;

export type WalletReturnUrl = (typeof WALLET_RETURN_URLS)[keyof typeof WALLET_RETURN_URLS];

export const DEFAULT_WALLET_RETURN_URL: WalletReturnUrl = WALLET_RETURN_URLS.dashboard;

const ALLOWED_RETURN_URLS = new Set<string>(Object.values(WALLET_RETURN_URLS));

/** Buy deep link: Wallet home with origin and an allowlisted return_url. */
export function walletBuyUrl(returnUrl: WalletReturnUrl = DEFAULT_WALLET_RETURN_URL): string {
  if (!ALLOWED_RETURN_URLS.has(returnUrl)) {
    throw new Error("return_url is not on the Lyrixis Wallet allowlist.");
  }

  const url = new URL(WALLET_APP_URL);
  url.searchParams.set("origin", WALLET_ORIGIN);
  url.searchParams.set("return_url", returnUrl);
  return url.toString();
}

export const WALLET_BUY_URL = walletBuyUrl();
