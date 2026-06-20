import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { areBlocked } from "@/lib/access";
import { findConversation, getOrCreateConversation } from "@/lib/dm";
import { rateLimit } from "@/lib/ratelimit";
import { encryptText, decryptText } from "@/lib/crypto";

async function resolve(req: Request, username: string) {
  const me = await getSessionUserId();
  if (!me) return { error: NextResponse.json({ error: "Login required" }, { status: 401 }) };
  const other = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!other) return { error: NextResponse.json({ error: "User not found" }, { status: 404 }) };
  if (other.id === me)
    return { error: NextResponse.json({ error: "You can't message yourself" }, { status: 400 }) };
  if (await areBlocked(me, other.id))
    return { error: NextResponse.json({ error: "You can't message this user" }, { status: 403 }) };
  return { me, otherId: other.id };
}

// GET /api/messages/:username — messages in the thread (and mark theirs read).
export async function GET(_req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const r = await resolve(_req, username);
  if ("error" in r) return r.error;
  const { me, otherId } = r;

  const convoId = await findConversation(me, otherId);
  if (!convoId) return NextResponse.json({ messages: [] });

  // Mark the other person's messages as read.
  await prisma.message.updateMany({
    where: { conversationId: convoId, senderId: otherId, read: false },
    data: { read: true },
  });

  const messages = await prisma.message.findMany({
    where: { conversationId: convoId },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: { id: true, text: true, senderId: true, createdAt: true },
  });

  return NextResponse.json({
    messages: messages.map((m) => ({
      id: m.id,
      text: decryptText(m.text),
      mine: m.senderId === me,
      createdAt: m.createdAt.toISOString(),
    })),
  });
}

// POST /api/messages/:username { text } — send a message.
export async function POST(req: Request, { params }: { params: Promise<{ username: string }> }) {
  const limited = await rateLimit(req, "dm", 60, 60_000);
  if (limited) return limited;

  const { username } = await params;
  const r = await resolve(req, username);
  if ("error" in r) return r.error;
  const { me, otherId } = r;

  const { text } = (await req.json().catch(() => ({}))) as { text?: string };
  const clean = (text ?? "").trim();
  if (!clean) return NextResponse.json({ error: "Message can't be empty" }, { status: 400 });
  if (clean.length > 2000) return NextResponse.json({ error: "Message too long" }, { status: 400 });

  const convoId = await getOrCreateConversation(me, otherId);
  const msg = await prisma.message.create({
    data: { conversationId: convoId, senderId: me, text: encryptText(clean) },
    select: { id: true, createdAt: true },
  });
  // Bump conversation for inbox ordering.
  await prisma.conversation.update({ where: { id: convoId }, data: { updatedAt: new Date() } });

  return NextResponse.json({
    message: { id: msg.id, text: clean, mine: true, createdAt: msg.createdAt.toISOString() },
  });
}
