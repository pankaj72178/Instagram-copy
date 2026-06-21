import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { areBlocked } from "@/lib/access";
import { findConversation, pairKey } from "@/lib/dm";

// POST /api/messages/:username/typing — flag that I'm typing in this thread.
export async function POST(_req: Request, { params }: { params: Promise<{ username: string }> }) {
  const me = await getSessionUserId();
  if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });
  const { username } = await params;

  const other = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!other || other.id === me || (await areBlocked(me, other.id))) {
    return NextResponse.json({ ok: false });
  }

  const convoId = await findConversation(me, other.id);
  if (!convoId) return NextResponse.json({ ok: true }); // no thread yet — nothing to flag

  const meIsA = pairKey(me, other.id).userAId === me;
  await prisma.conversation.update({
    where: { id: convoId },
    data: meIsA ? { userATypingAt: new Date() } : { userBTypingAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
