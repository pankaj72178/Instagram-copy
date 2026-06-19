import { NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "@/lib/prisma";
import { setAuthCookie } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Build a unique username from an email local-part.
async function uniqueUsername(seed: string): Promise<string> {
  const base = (seed.split("@")[0] || "user")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 18) || "user";
  let candidate = base;
  let i = 0;
  // Loop until we find a free username.
  while (await prisma.user.findUnique({ where: { username: candidate }, select: { id: true } })) {
    i += 1;
    candidate = `${base}${i}`;
  }
  return candidate;
}

// POST /api/auth/google { credential } — verify the Google ID token, find or
// create the user, then issue our own JWT cookie.
export async function POST(req: Request) {
  try {
    const limited = await rateLimit(req, "google", 15, 60_000);
    if (limited) return limited;

    const { credential } = (await req.json().catch(() => ({}))) as { credential?: string };
    if (!credential) {
      return NextResponse.json({ error: "Missing Google credential" }, { status: 400 });
    }
    if (!process.env.GOOGLE_CLIENT_ID) {
      return NextResponse.json({ error: "Google sign-in is not configured" }, { status: 500 });
    }

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const email = payload?.email?.toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "Google account has no email" }, { status: 400 });
    }

    let user = await prisma.user.findUnique({ where: { email }, select: { id: true, googleId: true } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          username: await uniqueUsername(email),
          displayName: payload?.name || email.split("@")[0],
          avatarUrl: payload?.picture || null,
          googleId: payload?.sub || null,
        },
        select: { id: true, googleId: true },
      });
    } else if (!user.googleId && payload?.sub) {
      await prisma.user.update({ where: { id: user.id }, data: { googleId: payload.sub } });
    }

    await setAuthCookie(user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("google auth error:", err);
    return NextResponse.json({ error: "Google sign-in failed" }, { status: 401 });
  }
}
