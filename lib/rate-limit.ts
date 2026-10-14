// Public limiters. Per-instance memory only. Uploads are capped by a DB row count in
// services/tracks.ts, so none of these need Redis.
import { HttpError } from "@/lib/errors";

const WAITLIST_WINDOW_SEC = 10 * 60;
const WAITLIST_MAX = 8;
const waitlistHits = new Map<string, { count: number; resetAt: number }>();

function throwWaitlistLimited(): never {
  throw new HttpError(429, "rate_limited", "Too many requests. Try again in a few minutes.");
}

function assertMemoryWaitlistLimit(ip: string): void {
  const now = Date.now();
  const current = waitlistHits.get(ip);
  if (!current || current.resetAt <= now) {
    waitlistHits.set(ip, { count: 1, resetAt: now + WAITLIST_WINDOW_SEC * 1000 });
    return;
  }
  current.count += 1;
  if (current.count > WAITLIST_MAX) throwWaitlistLimited();
}

const INGEST_WINDOW_SEC = 10 * 60;
const INGEST_MAX = 6;
const ingestHits = new Map<string, { count: number; resetAt: number }>();

function throwIngestLimited(): never {
  throw new HttpError(429, "rate_limited", "Too many catalog adds. Try again in a few minutes.");
}

function assertMemoryIngestLimit(ip: string): void {
  const now = Date.now();
  const current = ingestHits.get(ip);
  if (!current || current.resetAt <= now) {
    ingestHits.set(ip, { count: 1, resetAt: now + INGEST_WINDOW_SEC * 1000 });
    return;
  }
  current.count += 1;
  if (current.count > INGEST_MAX) throwIngestLimited();
}

export async function assertCatalogIngestRateLimit(ip: string): Promise<void> {
  assertMemoryIngestLimit(ip || "unknown");
}

/** Light public limiter. */
export async function assertWaitlistRateLimit(ip: string): Promise<void> {
  assertMemoryWaitlistLimit(ip || "unknown");
}

const genericMemory = new Map<string, { count: number; resetAt: number }>();

/** Named fixed-window limit. */
export async function assertRateLimit(name: string, identity: string, max: number, windowSec: number): Promise<void> {
  const id = identity || "unknown";
  const now = Date.now();
  const key = `${name}:${id}`;
  const current = genericMemory.get(key);
  if (!current || current.resetAt <= now) {
    genericMemory.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    if (genericMemory.size > 5000) genericMemory.clear();
    return;
  }
  current.count += 1;
  if (current.count > max) {
    throw new HttpError(429, "rate_limited", "Too many requests. Please wait a few minutes.");
  }
}
