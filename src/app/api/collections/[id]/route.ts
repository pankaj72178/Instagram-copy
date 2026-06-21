import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

// DELETE /api/collections/:id — delete a folder (saved posts stay, just unfiled).
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getSessionUserId();
  if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });
  const { id } = await params;

  const col = await prisma.collection.findUnique({ where: { id }, select: { userId: true } });
  if (!col) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (col.userId !== me) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  // Un-file the saved posts, then remove the folder.
  await prisma.bookmark.updateMany({ where: { collectionId: id }, data: { collectionId: null } });
  await prisma.collection.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
