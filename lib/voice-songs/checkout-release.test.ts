import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { cardCents, checkoutAction, stripeSignatureOk } from "./checkout";
import { submitRelease } from "./distributors";
import { reviewRelease } from "./release";
import { VOICE_RELEASE_SKU, VOICE_SETUP_SKU, VOICE_SONG_SKU, VOICE_TAKE_SKU } from "./pricing";

const base = {
  owner: false,
  hasAllAccess: false,
  setupsThisMonth: 0,
  songsThisMonth: 0,
  releasesThisMonth: 0,
};

function signature(payload: string, secret: string, timestamp: number) {
  const digest = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  return `t=${timestamp},v1=${digest}`;
}

const release = {
  id: "rel_1",
  artistName: "Awad Alaidaroos",
  title: "Window Down",
  credits: { writer: "Awad Alaidaroos", producer: "Awad Alaidaroos" },
  ai: { vocals: true, music: true, lyrics: true },
  royaltyUserBps: 9000,
  royaltyLyrixisBps: 1000,
  audioUrl: null,
  coverUrl: null,
};

describe("voice song checkout", () => {
  it("blocks a card charge for an extra take and lets the owner skip payment", () => {
    expect(cardCents(VOICE_TAKE_SKU)).toBeNull();
    expect(cardCents(VOICE_SONG_SKU)).toBe(600);
    expect(checkoutAction({ ...base, sku: VOICE_TAKE_SKU, method: "card" })).toEqual({
      action: "blocked",
      reason: "An extra take is 100 Ixis only.",
    });
    expect(checkoutAction({ ...base, owner: true, sku: VOICE_SONG_SKU })).toEqual({ action: "owner_bypass" });
    expect(checkoutAction({ ...base, sku: VOICE_TAKE_SKU, method: "ixis" })).toEqual({ action: "pay" });
  });

  it("covers setup, songs, and one release inside All-Access", () => {
    expect(checkoutAction({ ...base, hasAllAccess: true, sku: VOICE_SETUP_SKU }).action).toBe("included");
    expect(checkoutAction({ ...base, hasAllAccess: true, sku: VOICE_SONG_SKU, songsThisMonth: 3 }).action).toBe("included");
    expect(checkoutAction({ ...base, hasAllAccess: true, sku: VOICE_SONG_SKU, songsThisMonth: 4 }).action).toBe("pay");
    expect(checkoutAction({ ...base, hasAllAccess: true, sku: VOICE_RELEASE_SKU, releasesThisMonth: 1 }).action).toBe("pay");
  });

  it("accepts a fresh card signature and rejects a stale one", () => {
    const now = 1_700_000_000;
    const payload = '{"ok":true}';
    expect(stripeSignatureOk(payload, signature(payload, "whsec", now), "whsec", now)).toBe(true);
    expect(stripeSignatureOk(payload, signature(payload, "whsec", now - 600), "whsec", now)).toBe(false);
    expect(stripeSignatureOk(payload, signature(payload, "other", now), "whsec", now)).toBe(false);
    expect(stripeSignatureOk(payload, null, "whsec", now)).toBe(false);
  });
});

describe("voice song release review", () => {
  const draft = {
    artistName: "Awad Alaidaroos",
    title: "Window Down",
    writer: "Awad Alaidaroos",
    producer: "",
    aiVocals: true,
    aiMusic: true,
    aiLyrics: true,
    rightsAccepted: true,
    releasesThisMonth: 0,
  };

  it("accepts a complete own-voice release and refuses imitation", () => {
    const ok = reviewRelease(draft);
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.royaltyUserBps).toBe(9000);
    expect(reviewRelease({ ...draft, artistName: "Drake" }).ok).toBe(false);
    expect(reviewRelease({ ...draft, writer: "" }).ok).toBe(false);
    expect(reviewRelease({ ...draft, aiLyrics: false }).ok).toBe(false);
    expect(reviewRelease({ ...draft, rightsAccepted: false }).ok).toBe(false);
    expect(reviewRelease({ ...draft, releasesThisMonth: 4 }).ok).toBe(false);
  });
});

describe("distributor adapter", () => {
  it("holds a release when no distributor is selected", async () => {
    const sent = await submitRelease(release, {}, async () => {
      throw new Error("stub must not call the network");
    });
    expect(sent).toEqual({ ok: true, distributor: "stub", ref: "stub-rel_1", status: "held" });
  });

  it("names the missing vendor key and posts when the key exists", async () => {
    const missing = await submitRelease(release, { VOICE_SONGS_DISTRIBUTOR: "too_lost" });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.missing).toBe("TOO_LOST_API_KEY");
    const calls: string[] = [];
    const sent = await submitRelease(release, { VOICE_SONGS_DISTRIBUTOR: "revelator", REVELATOR_API_KEY: "key" }, async (url) => {
      calls.push(url);
      return { ok: true, id: "rev_1" };
    });
    expect(calls).toEqual(["https://api.revelator.com/v1/releases"]);
    expect(sent).toEqual({ ok: true, distributor: "revelator", ref: "rev_1", status: "submitted" });
  });
});

describe("checkout and release pages", () => {
  const root = path.resolve(__dirname, "../..");
  it("keeps the Lyrixis chrome and owner-only release rows", () => {
    const studio = readFileSync(path.join(root, "components/voice-songs/VoiceStudio.tsx"), "utf8");
    expect(studio).toContain('href: "/voice-songs/checkout"');
    expect(studio).toContain('href: "/voice-songs/release"');
    const admin = readFileSync(path.join(root, "app/admin/voice-songs/page.tsx"), "utf8");
    expect(admin).toContain("SiteNav");
    expect(admin).toContain("font-marquee");
    const sql = readFileSync(path.join(root, "database/migrations/0008_voice_song_releases.sql"), "utf8");
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("voice_purchases_select");
    expect(sql).toContain("voice_releases_select");
    expect(sql).not.toMatch(/for insert/i);
    expect(sql).toContain("grant select, insert, update, delete on public.voice_releases to service_role");
  });
});
