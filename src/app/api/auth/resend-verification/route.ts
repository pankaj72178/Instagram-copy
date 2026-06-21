import { NextResponse } from "next/server";
import { createHash, randomInt } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { sendVerificationOtp } from "@/lib/mailer";
import { rateLimit } from "@/lib/ratelimit";

// POST /api/auth/resend-verification — email a fresh verification code.
export async function POST(req: Request) {
  const limited = await rateLimit(req, "resend-verify", 3, 60_000);
  if (limited) return limited;

  const me = await getSessionUserId();
  if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: me },
    select: { email: true, emailVerified: true },
  });
  if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  if (user.emailVerified) return NextResponse.json({ ok: true, alreadyVerified: true });

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const codeHash = createHash("sha256").update(code).digest("hex");
  await prisma.user.update({
    where: { id: me },
    data: { verifyCodeHash: codeHash, verifyCodeExp: new Date(Date.now() + 15 * 60 * 1000) },
  });

  try {
    await sendVerificationOtp(user.email, code);
  } catch (e) {
    console.error("verification email failed:", e);
  }
  return NextResponse.json({ ok: true });
}
