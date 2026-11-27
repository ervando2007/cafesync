import "server-only";
import { headers } from "next/headers";

/**
 * Small in-process fixed-window rate limiter. CafeSync runs as one Node
 * process per server (systemd), so memory is enough; counters reset on
 * restart, which is acceptable for abuse throttling.
 */
interface Bucket {
  count: number;
  resetAt: number;
}

declare global {
  var __cafesyncRateBuckets: Map<string, Bucket> | undefined;
}

const buckets = (globalThis.__cafesyncRateBuckets ??= new Map<string, Bucket>());

function sweep(now: number) {
  if (buckets.size < 5000) return;
  for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
}

/** Counts one hit for `key`; false once more than `limit` hits fall in the window. */
export function hit(key: string, limit: number, windowSeconds: number): boolean {
  const now = Date.now();
  sweep(now);
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= limit;
}

/** Whether `key` is already over `limit` (without counting a new hit). */
export function isLimited(key: string, limit: number): boolean {
  const bucket = buckets.get(key);
  return !!bucket && bucket.resetAt > Date.now() && bucket.count >= limit;
}

export function reset(key: string): void {
  buckets.delete(key);
}

/**
 * Client IP as seen by Nginx (X-Real-IP is set by the proxy; the app port is
 * bound to localhost so it can't be reached around Nginx).
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-real-ip")?.trim() ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}
