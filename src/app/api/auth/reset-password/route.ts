import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword, setAuthCookie } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";

// POST /api/auth/reset-password { email, otp, password }
// Verifies the 6-digit code emailed by /forgot-password, then sets the new password.
export async function POST(req: Request) {
  const limited = await rateLimit(req, "reset", 10, 60_000);
  if (limited) return limited;

  const { email, otp, password } = (await req.json().catch(() => ({}))) as {
    email?: string;
    otp?: string;
    password?: string;
  };
  if (!email || !otp || !password || password.length < 6) {
    return NextResponse.json(
      { error: "Enter the code and a new password (at least 6 characters)." },
      { status: 400 }
    );
  }

  const codeHash = createHash("sha256").update(otp.trim()).digest("hex");
  const user = await prisma.user.findFirst({
    where: {
      email: email.toLowerCase(),
      resetTokenHash: codeHash,
      resetTokenExp: { gt: new Date() },
    },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json(
      { error: "That code is incorrect or has expired. Request a new one." },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(password),
      resetTokenHash: null,
      resetTokenExp: null,
    },
  });

  // Log them in after a successful reset.
  await setAuthCookie(user.id);
  return NextResponse.json({ ok: true });
}
