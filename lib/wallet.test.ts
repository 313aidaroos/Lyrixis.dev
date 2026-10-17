import { describe, expect, it } from "vitest";
import {
  DEFAULT_WALLET_RETURN_URL,
  WALLET_APP_URL,
  WALLET_BUY_URL,
  WALLET_ORIGIN,
  WALLET_RETURN_URLS,
  walletBuyUrl,
} from "@/lib/wallet";

describe("walletBuyUrl", () => {
  it("builds the Wallet buy link with origin and the dashboard return", () => {
    const url = new URL(walletBuyUrl());

    expect(url.origin).toBe(WALLET_APP_URL);
    expect(url.pathname).toBe("/");
    expect(url.searchParams.get("origin")).toBe(WALLET_ORIGIN);
    expect(url.searchParams.get("origin")).toBe("lyrixis");
    expect(url.searchParams.get("return_url")).toBe(WALLET_RETURN_URLS.dashboard);
    expect(url.searchParams.get("return_url")).toBe(DEFAULT_WALLET_RETURN_URL);
    expect(WALLET_BUY_URL).toBe(url.toString());
  });

  it("accepts the pricing return and rejects anything else", () => {
    const pricing = new URL(walletBuyUrl(WALLET_RETURN_URLS.pricing));
    expect(pricing.searchParams.get("return_url")).toBe("https://lyrixis.apixis.dev/pricing");

    expect(() => walletBuyUrl("https://evil.example/steal" as never)).toThrow(/allowlist/);
  });
});
