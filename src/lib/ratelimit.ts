// Lightweight in-memory rate limiter (fixed window per key).
// Good baseline against bursts/brute-force. NOTE: in-memory means it's per
// server instance — for robust distributed limiting on serverless, back this
// with Upstash Redis (swap the Map for a Redis INCR + EXPIRE).
import { NextResponse } from "next/server";

type Bucket = { count: number; reset: number };
const buckets = new Map<string, Bucket>();

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

/**
 * Returns a 429 NextResponse if the caller exceeded `limit` requests in
 * `windowMs`, otherwise null (allowed). `scope` separates different actions.
 */
export function rateLimit(
  req: Request,
  scope: string,
  limit: number,
  windowMs: number
): NextResponse | null {
  const key = `${scope}:${clientIp(req)}`;
  const now = Date.now();
  const b = buckets.get(key);

  if (!b || now > b.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return null;
  }
  if (b.count >= limit) {
    const retry = Math.ceil((b.reset - now) / 1000);
    return NextResponse.json(
      { error: "Too many requests. Please slow down and try again shortly." },
      { status: 429, headers: { "Retry-After": String(retry) } }
    );
  }
  b.count += 1;
  return null;
}
