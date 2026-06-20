import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId, hashPassword, verifyPassword } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";

// POST /api/account/password { currentPassword?, newPassword }
// - Accounts that already have a password must provide the correct current one.
// - Google accounts (no password yet) can set one directly, enabling email login.
export async function POST(req: Request) {
  const limited = await rateLimit(req, "set-password", 10, 60_000);
  if (limited) return limited;

  const me = await getSessionUserId();
  if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const { currentPassword, newPassword } = (await req.json().catch(() => ({}))) as {
    currentPassword?: string;
    newPassword?: string;
  };

  if (!newPassword || newPassword.length < 6) {
    return NextResponse.json(
      { error: "New password must be at least 6 characters." },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: me },
    select: { passwordHash: true },
  });
  if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  // If they already have a password, verify the current one before changing.
  if (user.passwordHash) {
    if (!currentPassword || !(await verifyPassword(currentPassword, user.passwordHash))) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
    }
  }

  await prisma.user.update({
    where: { id: me },
    data: { passwordHash: await hashPassword(newPassword) },
  });

  return NextResponse.json({ ok: true, hadPassword: !!user.passwordHash });
}
