import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { deleteMedia } from "@/lib/storage";

// DELETE /api/posts/:id — delete your own post.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getSessionUserId();
  if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const { id } = await params;
  const post = await prisma.post.findUnique({
    where: { id },
    select: { authorId: true, mediaUrl: true },
  });
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (post.authorId !== me) {
    return NextResponse.json({ error: "Not your post" }, { status: 403 });
  }

  await prisma.post.delete({ where: { id } });
  await deleteMedia(post.mediaUrl); // best-effort file cleanup
  return NextResponse.json({ ok: true });
}
