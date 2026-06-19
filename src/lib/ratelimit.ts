// Rate limiter with two backends, chosen automatically:
//   1. Upstash Redis (REST) — if UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
//      are set. Works correctly across serverless instances / cold starts.
//   2. In-memory fixed window — fallback for local dev / single instance.
import { NextResponse } from "next/server";

type Bucket = { count: number; reset: number };
const buckets = new Map<string, Bucket>();

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const useRedis = !!(UPSTASH_URL && UPSTASH_TOKEN);

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

function tooMany(retrySec: number): NextResponse {
  return NextResponse.json(
    { error: "Too many requests. Please slow down and try again shortly." },
    { status: 429, headers: { "Retry-After": String(retrySec) } }
  );
}

// INCR the key; on first hit set a TTL. Returns the current count (or null on error).
async function redisIncr(key: string, windowMs: number): Promise<number | null> {
  try {
    const res = await fetch(`${UPSTASH_URL}/incr/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const { result } = (await res.json()) as { result: number };
    if (result === 1) {
      // first request in this window — set expiry
      await fetch(
        `${UPSTASH_URL}/pexpire/${encodeURIComponent(key)}/${windowMs}`,
        { headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }, cache: "no-store" }
      );
    }
    return result;
  } catch {
    return null;
  }
}

/**
 * Returns a 429 NextResponse if the caller exceeded `limit` requests in
 * `windowMs`, otherwise null (allowed). `scope` separates different actions.
 */
export async function rateLimit(
  req: Request,
  scope: string,
  limit: number,
  windowMs: number
): Promise<NextResponse | null> {
  const key = `rl:${scope}:${clientIp(req)}`;

  if (useRedis) {
    const count = await redisIncr(key, windowMs);
    if (count === null) {
      // Redis unreachable — fall through to in-memory rather than failing open.
    } else if (count > limit) {
      return tooMany(Math.ceil(windowMs / 1000));
    } else {
      return null;
    }
  }

  // In-memory fixed window.
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return null;
  }
  if (b.count >= limit) {
    return tooMany(Math.ceil((b.reset - now) / 1000));
  }
  b.count += 1;
  return null;
}
