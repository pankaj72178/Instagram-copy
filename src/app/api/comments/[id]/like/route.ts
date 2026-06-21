import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

// POST /api/comments/:id/like — like a comment.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getSessionUserId();
  if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });
  const { id } = await params;

  const comment = await prisma.comment.findUnique({ where: { id }, select: { id: true } });
  if (!comment) return NextResponse.json({ error: "Comment not found" }, { status: 404 });

  await prisma.commentLike.upsert({
    where: { userId_commentId: { userId: me, commentId: id } },
    create: { userId: me, commentId: id },
    update: {},
  });
  const count = await prisma.commentLike.count({ where: { commentId: id } });
  return NextResponse.json({ liked: true, count });
}

// DELETE /api/comments/:id/like — unlike.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getSessionUserId();
  if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });
  const { id } = await params;
  await prisma.commentLike.deleteMany({ where: { userId: me, commentId: id } });
  const count = await prisma.commentLike.count({ where: { commentId: id } });
  return NextResponse.json({ liked: false, count });
}
