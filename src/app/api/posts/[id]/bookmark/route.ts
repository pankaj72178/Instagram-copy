import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { canViewContent } from "@/lib/access";

async function viewablePost(id: string, viewerId: string) {
  const post = await prisma.post.findUnique({
    where: { id },
    select: { id: true, author: { select: { id: true, isPrivate: true } } },
  });
  if (!post) return null;
  return (await canViewContent(viewerId, post.author)) ? post : null;
}

// POST /api/posts/:id/bookmark — save a post.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getSessionUserId();
  if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });
  const { id } = await params;

  if (!(await viewablePost(id, me))) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }
  await prisma.bookmark.upsert({
    where: { userId_postId: { userId: me, postId: id } },
    create: { userId: me, postId: id },
    update: {},
  });
  return NextResponse.json({ bookmarked: true });
}

// PATCH /api/posts/:id/bookmark { collectionId } — move a saved post into a
// collection (or null to un-file it).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getSessionUserId();
  if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });
  const { id } = await params;

  const { collectionId } = (await req.json().catch(() => ({}))) as { collectionId?: string | null };
  let target: string | null = null;
  if (collectionId) {
    const col = await prisma.collection.findUnique({
      where: { id: collectionId },
      select: { userId: true },
    });
    if (!col || col.userId !== me) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }
    target = collectionId;
  }
  await prisma.bookmark.updateMany({ where: { userId: me, postId: id }, data: { collectionId: target } });
  return NextResponse.json({ ok: true, collectionId: target });
}

// DELETE /api/posts/:id/bookmark — unsave.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getSessionUserId();
  if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });
  const { id } = await params;
  await prisma.bookmark.deleteMany({ where: { userId: me, postId: id } });
  return NextResponse.json({ bookmarked: false });
}
