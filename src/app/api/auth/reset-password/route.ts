import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword, setAuthCookie } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";

// POST /api/auth/reset-password { token, password }
export async function POST(req: Request) {
  const limited = await rateLimit(req, "reset", 10, 60_000);
  if (limited) return limited;

  const { token, password } = (await req.json().catch(() => ({}))) as {
    token?: string;
    password?: string;
  };
  if (!token || !password || password.length < 6) {
    return NextResponse.json(
      { error: "Invalid token or password must be at least 6 characters" },
      { status: 400 }
    );
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const user = await prisma.user.findFirst({
    where: { resetTokenHash: tokenHash, resetTokenExp: { gt: new Date() } },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ error: "This reset link is invalid or expired." }, { status: 400 });
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
