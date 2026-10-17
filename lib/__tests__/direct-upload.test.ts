// 2026-10-05 Grok: direct-to-Storage upload checks + own-upload unlock through /api/redeem.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { validateUploadRequest } from "@/lib/audio";

describe("validateUploadRequest (before the browser uploads to Storage)", () => {
  it("accepts supported audio under the cap and returns the extension", () => {
    expect(validateUploadRequest({ filename: "Song.MP3", declaredMime: "audio/mpeg", size: 5 * 1024 * 1024 })).toEqual({ extension: "mp3" });
    expect(validateUploadRequest({ filename: "a.flac", declaredMime: "", size: 10 }).extension).toBe("flac");
  });

  it("rejects empty, too-large, wrong MIME and wrong extension", () => {
    expect(() => validateUploadRequest({ filename: "a.mp3", declaredMime: "audio/mpeg", size: 0 })).toThrow(/empty/);
    expect(() => validateUploadRequest({ filename: "a.mp3", declaredMime: "audio/mpeg", size: 101 * 1024 * 1024 })).toThrow(/100 MB/);
    expect(() => validateUploadRequest({ filename: "a.mp3", declaredMime: "video/x-msvideo", size: 10 })).toThrow(/Unsupported/);
    expect(() => validateUploadRequest({ filename: "a.exe", declaredMime: "audio/mpeg", size: 10 })).toThrow(/Unsupported/);
  });
});

describe("finalizeDirectUpload path ownership", () => {
  it("refuses a path that was not minted for this user", async () => {
    const { finalizeDirectUpload } = await import("@/services/tracks");
    const user = { id: "11111111-1111-1111-1111-111111111111", authId: "a", email: "a@b.co", fullName: null, stripeCustomerId: null };
    const uploadId = "22222222-2222-4222-8222-222222222222";
    await expect(
      finalizeDirectUpload({
        user,
        uploadId,
        path: `99999999-9999-9999-9999-999999999999/${uploadId}/original.mp3`,
        filename: "a.mp3",
        title: null,
        artist: null,
        rightsConfirmed: true,
      })
    ).rejects.toThrow(/does not belong/);
    await expect(
      finalizeDirectUpload({ user, uploadId: "not-a-uuid", path: "x", filename: "a.mp3", title: null, artist: null, rightsConfirmed: true })
    ).rejects.toThrow(/not valid/);
    await expect(
      finalizeDirectUpload({ user, uploadId, path: `${user.id}/${uploadId}/original.mp3`, filename: "a.mp3", title: null, artist: null, rightsConfirmed: false })
    ).rejects.toThrow(/rights_confirmed/);
  });
});

// ---------------------------------------------------------------- /api/redeem with kind "upload"

type Row = { id: string; public_id: string; title: string; status: string; paid: boolean; user_id: string };
const state: { track: Row | null; updates: Array<Record<string, unknown>> } = { track: null, updates: [] };

function tracksQuery() {
  const filters: Record<string, unknown> = {};
  let patch: Record<string, unknown> | null = null;
  const q = {
    select: () => q,
    update: (p: Record<string, unknown>) => {
      patch = p;
      return q;
    },
    eq: (col: string, val: unknown) => {
      filters[col] = val;
      return q;
    },
    maybeSingle: async () => {
      const t = state.track;
      const match = t && (filters.public_id === undefined || filters.public_id === t.public_id) && filters.user_id === t.user_id;
      return { data: match ? t : null, error: null };
    },
    then: (resolve: (v: { data: unknown; error: null }) => void) => {
      // awaited update(...).eq(...).select(...)
      const t = state.track;
      if (patch && t) {
        const ok = Object.entries(filters).every(([k, v]) => (t as unknown as Record<string, unknown>)[k] === v);
        if (ok) {
          Object.assign(t, patch);
          state.updates.push(patch);
          resolve({ data: [{ id: t.id }], error: null });
          return;
        }
      }
      resolve({ data: [], error: null });
    },
  };
  return q;
}

vi.mock("@/lib/auth", () => ({
  requireUser: async () => ({ id: "user-1-aaaaaaaaaaaa", authId: "auth-1", email: "fan@example.com", fullName: null, stripeCustomerId: null }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: (table: string) => (table === "tracks" ? tracksQuery() : { insert: async () => ({ error: null }) }) }),
}));
vi.mock("@/lib/apixis-login", () => ({ apixisOwner: async () => null }));
vi.mock("@/lib/audit", () => ({ writeAudit: vi.fn(async () => undefined) }));
const redeemMock = vi.fn();
vi.mock("@/lib/apixis-wallet", () => ({
  redeem: (opts: unknown) => redeemMock(opts),
  buyIxisUrl: (_p: string, r: string) => `https://wallet.example/buy?return_url=${encodeURIComponent(r)}`,
  WalletError: class WalletError extends Error {
    status = 500;
  },
}));

function post(body: unknown) {
  return new Request("https://lyrixis.apixis.dev/api/redeem", {
    method: "POST",
    headers: { "content-type": "application/json", "x-idempotency-key": "attempt-1234-5678" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/redeem kind=upload", () => {
  beforeEach(() => {
    state.track = { id: "t-uuid", public_id: "trx_0123456789abcdef", title: "My Song", status: "completed", paid: false, user_id: "user-1-aaaaaaaaaaaa" };
    state.updates = [];
    redeemMock.mockReset();
  });

  it("charges the 300-Ixis SKU and marks the user's own track paid", async () => {
    redeemMock.mockImplementation(async (opts: { productKey: string; idempotencyKey: string; provision: (r: { reservationId: string; ixis: number }) => Promise<unknown> }) => {
      expect(opts.productKey).toBe("lyrixis.track.unlock");
      expect(opts.idempotencyKey.length).toBeLessThan(80);
      const result = await opts.provision({ reservationId: "res_1", ixis: 300 });
      return { ok: true, receiptId: "rcpt_1", result };
    });
    const { POST } = await import("@/app/api/redeem/route");
    const res = await POST(post({ trackId: "trx_0123456789abcdef", kind: "upload" }) as never);
    expect(res.status).toBe(200);
    expect(state.track?.paid).toBe(true);
    const json = (await res.json()) as { message: string };
    expect(json.message).toMatch(/300 Ixis/);
  });

  it("refuses to charge before lyrics are ready", async () => {
    state.track!.status = "transcribing";
    const { POST } = await import("@/app/api/redeem/route");
    const res = await POST(post({ trackId: "trx_0123456789abcdef" }) as never);
    expect(res.status).toBe(409);
    expect(redeemMock).not.toHaveBeenCalled();
  });

  it("returns 402 with a Buy Ixis link back to the track when short on Ixis", async () => {
    redeemMock.mockResolvedValue({ ok: false, insufficient: true, needed: 300, message: "insufficient" });
    const { POST } = await import("@/app/api/redeem/route");
    const res = await POST(post({ trackId: "trx_0123456789abcdef", kind: "upload" }) as never);
    expect(res.status).toBe(402);
    const json = (await res.json()) as { buyUrl: string };
    expect(decodeURIComponent(json.buyUrl)).toContain("/tracks/trx_0123456789abcdef");
    expect(state.track?.paid).toBe(false);
  });

  it("does not charge again for an already-unlocked track", async () => {
    state.track!.paid = true;
    const { POST } = await import("@/app/api/redeem/route");
    const res = await POST(post({ trackId: "trx_0123456789abcdef", kind: "upload" }) as never);
    expect(res.status).toBe(200);
    expect(redeemMock).not.toHaveBeenCalled();
  });

  it("404s on someone else's track", async () => {
    state.track!.user_id = "someone-else";
    const { POST } = await import("@/app/api/redeem/route");
    const res = await POST(post({ trackId: "trx_0123456789abcdef", kind: "upload" }) as never);
    expect(res.status).toBe(404);
  });
});
