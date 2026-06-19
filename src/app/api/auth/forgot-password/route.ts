import { NextResponse } from "next/server";
import { createHash, randomInt } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordOtp } from "@/lib/mailer";
import { rateLimit } from "@/lib/ratelimit";

// POST /api/auth/forgot-password { email }
// Emails a 6-digit OTP. Always responds the same way (don't reveal whether the
// email exists).
export async function POST(req: Request) {
  const limited = await rateLimit(req, "forgot", 5, 60_000);
  if (limited) return limited;

  const { email } = (await req.json().catch(() => ({}))) as { email?: string };
  const ok = NextResponse.json({
    ok: true,
    message: "If that email exists, a verification code has been sent.",
  });
  if (!email) return ok;

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, email: true, passwordHash: true },
  });
  // Only email/password accounts can reset (Google users have no password).
  if (!user || !user.passwordHash) return ok;

  // Generate a 6-digit code; store only its hash, valid for 10 minutes.
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const codeHash = createHash("sha256").update(code).digest("hex");
  await prisma.user.update({
    where: { id: user.id },
    data: { resetTokenHash: codeHash, resetTokenExp: new Date(Date.now() + 10 * 60 * 1000) },
  });

  try {
    await sendPasswordOtp(user.email, code);
  } catch (e) {
    console.error("reset email failed:", e);
  }
  return ok;
}
