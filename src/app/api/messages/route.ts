import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { decryptText } from "@/lib/crypto";

// GET /api/messages — my conversations (other participant + last message + unread count).
export async function GET() {
  const me = await getSessionUserId();
  if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const convos = await prisma.conversation.findMany({
    where: { OR: [{ userAId: me }, { userBId: me }] },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: {
      id: true,
      updatedAt: true,
      userA: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      userB: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { text: true, imageUrl: true, senderId: true, createdAt: true },
      },
    },
  });

  const items = await Promise.all(
    convos.map(async (c) => {
      const other = c.userA.id === me ? c.userB : c.userA;
      const last = c.messages[0] ?? null;
      const unread = await prisma.message.count({
        // top-level NOT (not `senderId: { not }`) — the inline form silently
        // matches nothing on MongoDB ObjectId fields.
        where: { conversationId: c.id, read: false, NOT: { senderId: me } },
      });
      return {
        username: other.username,
        displayName: other.displayName,
        avatarUrl: other.avatarUrl,
        lastText: last ? (last.text ? decryptText(last.text) : last.imageUrl ? "📷 Photo" : null) : null,
        lastAt: last?.createdAt ?? c.updatedAt,
        lastFromMe: last ? last.senderId === me : false,
        unread,
      };
    })
  );

  // Only show conversations that actually have a message.
  return NextResponse.json({ conversations: items.filter((i) => i.lastText !== null) });
}
