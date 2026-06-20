import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { deleteMedia } from "@/lib/storage";

// PATCH /api/posts/:id — edit your own post's caption.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getSessionUserId();
  if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const { id } = await params;
  const { caption } = (await req.json().catch(() => ({}))) as { caption?: string };
  const clean = (caption ?? "").trim();
  if (clean.length > 2200) {
    return NextResponse.json({ error: "Caption too long (max 2200)" }, { status: 400 });
  }

  const post = await prisma.post.findUnique({ where: { id }, select: { authorId: true } });
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (post.authorId !== me) {
    return NextResponse.json({ error: "Not your post" }, { status: 403 });
  }

  await prisma.post.update({ where: { id }, data: { caption: clean || null } });
  return NextResponse.json({ ok: true, caption: clean || null });
}

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
    select: { authorId: true, mediaUrl: true, mediaUrls: true },
  });
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (post.authorId !== me) {
    return NextResponse.json({ error: "Not your post" }, { status: 403 });
  }

  await prisma.post.delete({ where: { id } });
  // best-effort cleanup of every media item (or the single one for old posts)
  const urls = post.mediaUrls.length ? post.mediaUrls : [post.mediaUrl];
  await Promise.all(urls.map((u) => deleteMedia(u)));
  return NextResponse.json({ ok: true });
}
