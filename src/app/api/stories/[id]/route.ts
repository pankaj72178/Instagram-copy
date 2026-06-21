import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { deleteMedia } from "@/lib/storage";

// DELETE /api/stories/:id — delete your own story.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getSessionUserId();
  if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });
  const { id } = await params;

  const story = await prisma.story.findUnique({ where: { id }, select: { authorId: true, mediaUrl: true } });
  if (!story) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (story.authorId !== me) return NextResponse.json({ error: "Not your story" }, { status: 403 });

  await prisma.story.delete({ where: { id } });
  await deleteMedia(story.mediaUrl);
  return NextResponse.json({ ok: true });
}
