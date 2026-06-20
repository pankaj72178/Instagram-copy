import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

// POST /api/block { username } — block a user (also removes any follows both ways).
export async function POST(req: Request) {
  const me = await getSessionUserId();
  if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const { username } = (await req.json().catch(() => ({}))) as { username?: string };
  if (!username) return NextResponse.json({ error: "username required" }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (target.id === me) return NextResponse.json({ error: "You can't block yourself" }, { status: 400 });

  await prisma.block.upsert({
    where: { blockerId_blockedId: { blockerId: me, blockedId: target.id } },
    create: { blockerId: me, blockedId: target.id },
    update: {},
  });
  // Sever any follow relationship in both directions.
  await prisma.follow.deleteMany({
    where: {
      OR: [
        { followerId: me, followingId: target.id },
        { followerId: target.id, followingId: me },
      ],
    },
  });
  return NextResponse.json({ blocked: true });
}

// DELETE /api/block { username } — unblock.
export async function DELETE(req: Request) {
  const me = await getSessionUserId();
  if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const { username } = (await req.json().catch(() => ({}))) as { username?: string };
  if (!username) return NextResponse.json({ error: "username required" }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  await prisma.block.deleteMany({ where: { blockerId: me, blockedId: target.id } });
  return NextResponse.json({ blocked: false });
}
