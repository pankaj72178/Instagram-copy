import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { canViewContent } from "@/lib/access";

async function loadViewablePost(id: string, viewerId: string) {
  const post = await prisma.post.findUnique({
    where: { id },
    select: { id: true, author: { select: { id: true, isPrivate: true } } },
  });
  if (!post) return null;
  const ok = await canViewContent(viewerId, post.author);
  return ok ? post : null;
}

// POST /api/posts/:id/like — like a post.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getSessionUserId();
  if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });
  const { id } = await params;

  const post = await loadViewablePost(id, me);
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  // Idempotent: ignore if already liked.
  await prisma.like.upsert({
    where: { userId_postId: { userId: me, postId: id } },
    create: { userId: me, postId: id },
    update: {},
  });
  const count = await prisma.like.count({ where: { postId: id } });
  return NextResponse.json({ liked: true, count });
}

// DELETE /api/posts/:id/like — unlike.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getSessionUserId();
  if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });
  const { id } = await params;

  await prisma.like.deleteMany({ where: { userId: me, postId: id } });
  const count = await prisma.like.count({ where: { postId: id } });
  return NextResponse.json({ liked: false, count });
}
