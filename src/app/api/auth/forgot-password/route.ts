import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordReset } from "@/lib/mailer";
import { rateLimit } from "@/lib/ratelimit";

// POST /api/auth/forgot-password { email }
// Always responds the same way (don't reveal whether the email exists).
export async function POST(req: Request) {
  const limited = rateLimit(req, "forgot", 5, 60_000);
  if (limited) return limited;

  const { email } = (await req.json().catch(() => ({}))) as { email?: string };
  const ok = NextResponse.json({
    ok: true,
    message: "If that email exists, a reset link has been sent.",
  });
  if (!email) return ok;

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, email: true, passwordHash: true },
  });
  // Only email/password accounts can reset (Google users have no password).
  if (!user || !user.passwordHash) return ok;

  // Create a one-time token; store only its hash.
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  await prisma.user.update({
    where: { id: user.id },
    data: { resetTokenHash: tokenHash, resetTokenExp: new Date(Date.now() + 60 * 60 * 1000) },
  });

  const origin = new URL(req.url).origin;
  const link = `${origin}/reset-password?token=${token}`;
  try {
    await sendPasswordReset(user.email, link);
  } catch (e) {
    console.error("reset email failed:", e);
  }
  return ok;
}
