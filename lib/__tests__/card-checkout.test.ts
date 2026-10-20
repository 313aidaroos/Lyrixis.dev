import { describe, expect, it } from "vitest";
import { allAccessCardCents, cardCheckoutReady, checkoutForm, publicCardMessage, sessionIsPaid, trackCardCents } from "../card-checkout";
import { CARD_COMING_SOON } from "../card-copy";
import { PRICE_LIST } from "../price-list";

describe("card checkout gate", () => {
  it("stays closed without a secret key and opens when one is set", () => {
    expect(cardCheckoutReady({})).toBe(false);
    expect(cardCheckoutReady({ STRIPE_SECRET_KEY: "   " })).toBe(false);
    expect(cardCheckoutReady({ STRIPE_WEBHOOK_SECRET: "whsec_x" })).toBe(false);
    expect(cardCheckoutReady({ STRIPE_SECRET_KEY: "sk_test_example" })).toBe(true);
  });

  it("prices a song at $3 and All-Access at $30, and never echoes a secret", () => {
    expect(trackCardCents()).toBe(300);
    expect(allAccessCardCents()).toBe(3000);
    expect(CARD_COMING_SOON).toBe("Card coming soon");
    expect(publicCardMessage("refused sk_live_secret")).toBe(CARD_COMING_SOON);
    const song = checkoutForm({ userId: "user-1", product: "track", trackId: "rec_1", kind: "catalog", origin: "https://lyrixis.apixis.dev" });
    expect(song.get("mode")).toBe("payment");
    expect(song.get("line_items[0][price_data][unit_amount]")).toBe("300");
    expect(song.get("metadata[user_id]")).toBe("user-1");
    expect(song.get("metadata[track_id]")).toBe("rec_1");
    const plan = checkoutForm({ userId: "user-1", product: "all_access", origin: "https://lyrixis.apixis.dev" });
    expect(plan.get("mode")).toBe("subscription");
    expect(plan.get("line_items[0][price_data][unit_amount]")).toBe("3000");
    expect(plan.get("subscription_data[metadata][product]")).toBe("all_access");
    expect(song.toString()).not.toMatch(/sk_live|sk_test/);
  });

  it("treats a paid song session and a complete subscription as paid", () => {
    expect(sessionIsPaid({ mode: "payment", payment_status: "paid" })).toBe(true);
    expect(sessionIsPaid({ mode: "payment", payment_status: "unpaid" })).toBe(false);
    expect(sessionIsPaid({ mode: "subscription", status: "complete", payment_status: "paid" })).toBe(true);
    expect(sessionIsPaid({ mode: "subscription", status: "open", payment_status: "unpaid" })).toBe(false);
  });
});

describe("public price list", () => {
  it("matches the locked song, voice, plan, and sales prices", () => {
    const byId = Object.fromEntries(PRICE_LIST.map((row) => [row.id, row]));
    expect(byId.song.price).toBe("$3");
    expect(byId.song.ixis).toBe("300 Ixis");
    expect(byId["voice-setup"].price).toBe("$5");
    expect(byId["voice-setup"].ixis).toBe("500 Ixis");
    expect(byId["voice-song"].price).toBe("$6");
    expect(byId["voice-song"].ixis).toBe("600 Ixis");
    expect(byId["extra-take"].price).toBe("100 Ixis");
    expect(byId["extra-take"].card).toEqual({ kind: "none", reason: "ixis_only" });
    expect(byId.release.price).toBe("$9");
    expect(byId.release.ixis).toBe("900 Ixis");
    expect(byId.release.detail).toMatch(/pending distributor/);
    expect(byId.release.detail).not.toMatch(/now live|available on Spotify|on Apple Music now/i);
    expect(byId["all-access"].price).toBe("$30/month");
    expect(byId["all-access"].ixis).toBe("3,000 Ixis / month");
    expect(byId["all-access"].detail).toMatch(/voice model/);
    expect(byId["all-access"].detail).toMatch(/4 voice songs/);
    expect(byId["all-access"].detail).toMatch(/1 release/);
    expect(byId.enterprise.price).toBe("Contact sales");
  });
});
