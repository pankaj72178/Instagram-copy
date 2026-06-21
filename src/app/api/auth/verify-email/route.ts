import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";

// POST /api/auth/verify-email { code } — confirm the signed-in user's email.
export async function POST(req: Request) {
  const limited = await rateLimit(req, "verify-email", 10, 60_000);
  if (limited) return limited;

  const me = await getSessionUserId();
  if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const { code } = (await req.json().catch(() => ({}))) as { code?: string };
  if (!code) return NextResponse.json({ error: "Enter the code from your email." }, { status: 400 });

  const codeHash = createHash("sha256").update(code.trim()).digest("hex");
  const user = await prisma.user.findFirst({
    where: { id: me, verifyCodeHash: codeHash, verifyCodeExp: { gt: new Date() } },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ error: "That code is incorrect or has expired." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: me },
    data: { emailVerified: true, verifyCodeHash: null, verifyCodeExp: null },
  });
  return NextResponse.json({ ok: true });
}
