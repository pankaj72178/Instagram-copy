import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

// POST /api/follow { username } — follow a public account instantly, or send a
// follow request to a private account. Idempotent.
export async function POST(req: Request) {
  const me = await getSessionUserId();
  if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const { username } = (await req.json().catch(() => ({}))) as { username?: string };
  if (!username) return NextResponse.json({ error: "username required" }, { status: 400 });

  const target = await prisma.user.findUnique({
    where: { username },
    select: { id: true, isPrivate: true },
  });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (target.id === me) return NextResponse.json({ error: "You can't follow yourself" }, { status: 400 });

  const status = target.isPrivate ? "PENDING" : "ACCEPTED";

  // Create or keep existing (don't downgrade an accepted follow).
  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: me, followingId: target.id } },
    select: { status: true },
  });
  if (!existing) {
    await prisma.follow.create({ data: { followerId: me, followingId: target.id, status } });
  }

  const finalStatus = existing?.status ?? status;
  return NextResponse.json({
    state: finalStatus === "ACCEPTED" ? "following" : "requested",
  });
}

// DELETE /api/follow { username } — unfollow OR cancel a pending request.
export async function DELETE(req: Request) {
  const me = await getSessionUserId();
  if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const { username } = (await req.json().catch(() => ({}))) as { username?: string };
  if (!username) return NextResponse.json({ error: "username required" }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  await prisma.follow.deleteMany({ where: { followerId: me, followingId: target.id } });
  return NextResponse.json({ state: "none" });
}
