import { NextResponse } from "next/server";
import { jsonError, HttpError } from "@/lib/errors";
import { ALLOWANCE_COOKIE, DEMO_COOKIE, actorFromRequest, allAccessFor, demoEnabled, getStore, publicConfig } from "@/lib/voice-songs/context";
import { demoPreviewWav } from "@/lib/voice-songs/audio";
import { providerStatus } from "@/lib/voice-songs/providers";
import {
  acceptConsent,
  confirmCard,
  createSong,
  extraTake,
  pay,
  quoteSku,
  removeVoice,
  requestRelease,
  reviewRelease,
  saveSample,
  snapshot,
  submitLiveness,
  train,
  writeLyrics,
  type ApiFailure,
} from "@/lib/voice-songs/service";
import type { VoiceSongSku } from "@/lib/voice-songs/pricing";
import { VOICE_SONG_PRICES } from "@/lib/voice-songs/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const SKUS = new Set<VoiceSongSku>(["setup", "song", "take", "release"]);

function deps() {
  return { store: getStore(), allAccess: allAccessFor };
}

function json(body: unknown, status = 200, cookies: string[] = []) {
  const response = NextResponse.json(body, { status });
  for (const cookie of cookies) response.headers.append("set-cookie", cookie);
  return response;
}

function fromResult(result: { ok: true; data: unknown } | ApiFailure) {
  if (!result.ok) return json({ error: { code: result.code, message: result.message, needed: result.needed, buyUrl: result.buyUrl } }, result.status);
  return json(result.data);
}

function cookie(name: string, on: boolean) {
  const value = on ? "1" : "";
  const maxAge = on ? 60 * 60 * 24 * 14 : 0;
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

async function readPayload(request: Request): Promise<{ fields: Record<string, string>; files: Record<string, File> }> {
  const type = request.headers.get("content-type") || "";
  if (type.includes("multipart/form-data")) {
    const form = await request.formData();
    const fields: Record<string, string> = {};
    const files: Record<string, File> = {};
    for (const [key, value] of form.entries()) {
      if (value instanceof File) files[key] = value;
      else fields[key] = String(value);
    }
    return { fields, files };
  }
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const fields: Record<string, string> = {};
  for (const [key, value] of Object.entries(body)) {
    if (value === undefined || value === null) continue;
    fields[key] = typeof value === "string" ? value : JSON.stringify(value);
  }
  return { fields, files: {} };
}

function num(value: string | undefined, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function GET(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  try {
    const { path = [] } = await context.params;
    const actor = await actorFromRequest(request);
    if (path[0] === "config") return json({ ...publicConfig(), signedIn: Boolean(actor), demo: actor?.demo ?? false });
    if (!actor) return json({ error: { code: "unauthorized", message: "Sign in with Apixis ID, or open the demo." }, demoAvailable: demoEnabled() }, 401);
    if (path[0] === "audio") {
      const objectPath = new URL(request.url).searchParams.get("path") || "";
      if (!objectPath.startsWith(`${actor.userId}/`)) return json({ error: { code: "forbidden", message: "That file is not yours." } }, 403);
      const blob = await getStore().getBlob(objectPath);
      if (!blob) return json({ error: { code: "not_found", message: "Audio not found." } }, 404);
      return new NextResponse(new Uint8Array(blob.body), {
        headers: { "content-type": blob.contentType, "cache-control": "private, max-age=60" },
      });
    }
    if (path[0] === "quote") {
      const sku = new URL(request.url).searchParams.get("sku") as VoiceSongSku;
      if (!SKUS.has(sku)) throw new HttpError(400, "sku", "Unknown price.");
      return json(await quoteSku(deps(), actor, sku));
    }
    if (path[0] === "admin") {
      if (!actor.owner && !actor.demo) return json({ error: { code: "forbidden", message: "Reviewers only." } }, 403);
      const queue = actor.owner ? await getStore().listReleaseQueue() : await getStore().listReleases(actor.userId);
      return json({ queue, providers: providerStatus() });
    }
    return json({ ...(await snapshot(deps(), actor)), config: publicConfig(), actor: { demo: actor.demo, email: actor.email, allowance: actor.demoAllowance } });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  try {
    const { path = [] } = await context.params;
    const head = path[0] ?? "";

    if (head === "demo") {
      if (!demoEnabled()) return json({ error: { code: "demo_disabled", message: "Demo mode is off on this server." } }, 403);
      const { fields } = await readPayload(request);
      const allowance = fields.allowance === "true" || fields.allowance === "1";
      return json({ ok: true, allowance }, 200, [cookie(DEMO_COOKIE, true), cookie(ALLOWANCE_COOKIE, allowance)]);
    }

    const actor = await actorFromRequest(request);
    if (!actor) return json({ error: { code: "unauthorized", message: "Sign in with Apixis ID, or open the demo." }, demoAvailable: demoEnabled() }, 401);
    const { fields, files } = await readPayload(request);
    const service = deps();

    if (head === "sample") {
      const standIn = fields.demoStandIn === "true" && actor.demo;
      const file = files.audio;
      if (!file && !standIn) return json({ error: { code: "audio_required", message: "Attach the recording." } }, 400);
      const bytes = standIn ? demoPreviewWav(3) : Buffer.from(await file!.arrayBuffer());
      return fromResult(await saveSample(service, actor, {
        bytes,
        mime: standIn ? "audio/wav" : file!.type || "audio/webm",
        seconds: standIn ? num(fields.seconds, 8) : num(fields.seconds),
        peak: num(fields.peak, standIn ? 0.4 : 0),
        rms: num(fields.rms, standIn ? 0.08 : 0),
        clippingRatio: num(fields.clippingRatio),
      }));
    }
    if (head === "consent") return fromResult(await acceptConsent(service, actor, fields.accepted === "true"));
    if (head === "liveness") {
      const file = files.audio;
      const bytes = file ? (await file.arrayBuffer()).byteLength : num(fields.bytes, actor.demo ? 1200 : 0);
      return fromResult(await submitLiveness(service, actor, { transcript: fields.transcript || "", bytes }));
    }
    if (head === "train") return fromResult(await train(service, actor));
    if (head === "lyrics") {
      return fromResult(await writeLyrics(service, actor, {
        theme: fields.theme || "",
        mood: fields.mood || "",
        genre: fields.genre || "",
        note: fields.note || "",
        lyrics: fields.lyrics || "",
      }));
    }
    if (head === "checkout") {
      const sku = fields.sku as VoiceSongSku;
      const method = fields.method as "ixis" | "card" | "allowance";
      if (!SKUS.has(sku) || !["ixis", "card", "allowance"].includes(method)) {
        return json({ error: { code: "checkout", message: "Choose a price and Ixis, card, or allowance." } }, 400);
      }
      const origin = new URL(request.url).origin;
      return fromResult(await pay(service, actor, {
        sku,
        method,
        idempotencyKey: (fields.idempotencyKey || "").slice(0, 80),
        returnUrl: fields.returnUrl || `${origin}/voice-songs`,
      }));
    }
    if (head === "confirm-card") return fromResult(await confirmCard(service, actor, fields.idempotencyKey || "", fields.sessionId || ""));
    if (head === "songs" && path.length === 1) {
      return fromResult(await createSong(service, actor, {
        title: fields.title || "",
        theme: fields.theme || "",
        mood: fields.mood || "",
        genre: fields.genre || "",
        lyrics: fields.lyrics || "",
        idempotencyKey: fields.idempotencyKey || "",
      }));
    }
    if (head === "songs" && path[2] === "takes") {
      return fromResult(await extraTake(service, actor, path[1] || "", {
        idempotencyKey: fields.idempotencyKey || "",
        voiceMix: num(fields.voiceMix, 65),
        lyrics: fields.lyrics,
      }));
    }
    if (head === "releases") {
      const art = files.artwork;
      return fromResult(await requestRelease(service, actor, {
        songId: fields.songId || "",
        takeId: fields.takeId || "",
        artistName: fields.artistName || "",
        title: fields.title || "",
        credits: fields.credits || "",
        rights: fields.rights === "true",
        idempotencyKey: fields.idempotencyKey || "",
        artwork: art ? { bytes: Buffer.from(await art.arrayBuffer()), mime: art.type || "image/png" } : undefined,
      }));
    }
    if (head === "admin") {
      return fromResult(await reviewRelease(service, actor, {
        releaseId: fields.releaseId || "",
        decision: fields.decision === "reject" ? "reject" : "approve",
        note: fields.note || "",
      }));
    }
    return json({ error: { code: "not_found", message: "Unknown Voice Songs route.", prices: VOICE_SONG_PRICES } }, 404);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  try {
    const { path = [] } = await context.params;
    if (path[0] !== "voice") return json({ error: { code: "not_found", message: "Unknown route." } }, 404);
    const actor = await actorFromRequest(request);
    if (!actor) return json({ error: { code: "unauthorized", message: "Sign in to delete a voice." } }, 401);
    return fromResult(await removeVoice(deps(), actor));
  } catch (error) {
    return jsonError(error);
  }
}
