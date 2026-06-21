import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

// POST /api/stories/:id/view — mark a story as seen.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getSessionUserId();
  if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });
  const { id } = await params;
  await prisma.storyView.upsert({
    where: { storyId_viewerId: { storyId: id, viewerId: me } },
    create: { storyId: id, viewerId: me },
    update: {},
  });
  return NextResponse.json({ ok: true });
}
