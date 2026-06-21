import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

// DELETE /api/comments/:id — delete your own comment (or a comment on your post).
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getSessionUserId();
  if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });
  const { id } = await params;

  const comment = await prisma.comment.findUnique({
    where: { id },
    select: { userId: true, post: { select: { authorId: true } } },
  });
  if (!comment) return NextResponse.json({ error: "Comment not found" }, { status: 404 });

  // You can delete your own comment, or any comment on your own post.
  if (comment.userId !== me && comment.post.authorId !== me) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  // Remove the comment's replies + all likes, then the comment itself.
  const replies = await prisma.comment.findMany({ where: { parentId: id }, select: { id: true } });
  const ids = [id, ...replies.map((r) => r.id)];
  await prisma.commentLike.deleteMany({ where: { commentId: { in: ids } } });
  await prisma.comment.deleteMany({ where: { id: { in: ids } } });
  return NextResponse.json({ ok: true, removed: ids.length });
}
