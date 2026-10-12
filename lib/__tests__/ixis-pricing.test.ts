import { describe, expect, it } from "vitest";
import { ALL_ACCESS_FEATURES, ALL_ACCESS_MONTHLY_IXIS, ALL_ACCESS_MONTHLY_USD, PLAN_FAQ, TRACK_UNLOCK_IXIS, tierRateIxis } from "../ixis-pricing";

describe("Lyrixis pricing (Ixis only, Wallet SKU)", () => {
  it("the 1–99 tier always shows the Wallet SKU price, even with the old 299 seed", () => {
    expect(TRACK_UNLOCK_IXIS).toBe(300);
    expect(tierRateIxis({ min_songs: 1, rate_cents: 299 })).toBe(300);
    expect(tierRateIxis({ min_songs: 1, rate_cents: 300 })).toBe(300);
  });
  it("All-Access is $30 and only working features are marked included", () => {
    expect(ALL_ACCESS_MONTHLY_USD).toBe(30);
    expect(ALL_ACCESS_MONTHLY_IXIS).toBe(3000);
    expect(ALL_ACCESS_FEATURES.filter((feature) => feature.status === "included").map((feature) => feature.name)).toEqual([
      "Unlimited song lyrics",
      "Voice songs",
    ]);
    expect(ALL_ACCESS_FEATURES.filter((feature) => feature.status === "coming_soon").map((feature) => feature.name)).toEqual([
      "Lyric video downloads",
      "Translations",
      "Voices",
    ]);
    expect(PLAN_FAQ.map((item) => item.q)).toEqual([
      "What do I get for $30?",
      "Can I pay with a card?",
      "How do I cancel?",
      "What is Ixis?",
      "What if I am a label or a company?",
    ]);
  });
  it("volume tiers keep the table's rate", () => {
    expect(tierRateIxis({ min_songs: 100, rate_cents: 149 })).toBe(149);
    expect(tierRateIxis({ min_songs: 10000, rate_cents: 40 })).toBe(40);
  });
});
