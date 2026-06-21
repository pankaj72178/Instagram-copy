import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { areBlocked } from "@/lib/access";
import { findConversation, getOrCreateConversation, pairKey } from "@/lib/dm";
import { rateLimit } from "@/lib/ratelimit";
import { encryptText, decryptText } from "@/lib/crypto";
import { saveMedia } from "@/lib/storage";
import { sniffMime } from "@/lib/filecheck";
import { IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/validation";

const TYPING_WINDOW_MS = 6000;
const ONLINE_WINDOW_MS = 60_000;

async function resolve(username: string) {
  const me = await getSessionUserId();
  if (!me) return { error: NextResponse.json({ error: "Login required" }, { status: 401 }) };
  const other = await prisma.user.findUnique({
    where: { username },
    select: { id: true, lastActiveAt: true },
  });
  if (!other) return { error: NextResponse.json({ error: "User not found" }, { status: 404 }) };
  if (other.id === me)
    return { error: NextResponse.json({ error: "You can't message yourself" }, { status: 400 }) };
  if (await areBlocked(me, other.id))
    return { error: NextResponse.json({ error: "You can't message this user" }, { status: 403 }) };
  return { me, otherId: other.id, otherLastActive: other.lastActiveAt };
}

function presence(lastActiveAt: Date | null) {
  if (!lastActiveAt) return { online: false, lastActiveAt: null as string | null };
  const online = Date.now() - lastActiveAt.getTime() < ONLINE_WINDOW_MS;
  return { online, lastActiveAt: lastActiveAt.toISOString() };
}

// GET /api/messages/:username — thread messages + the other person's presence/typing.
export async function GET(_req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const r = await resolve(username);
  if ("error" in r) return r.error;
  const { me, otherId, otherLastActive } = r;

  // Bump my own presence.
  await prisma.user.update({ where: { id: me }, data: { lastActiveAt: new Date() } });

  const key = pairKey(me, otherId);
  const convo = await prisma.conversation.findUnique({
    where: { userAId_userBId: key },
    select: { id: true, userAId: true, userBTypingAt: true, userATypingAt: true },
  });

  if (!convo) {
    return NextResponse.json({ messages: [], typing: false, other: presence(otherLastActive) });
  }

  await prisma.message.updateMany({
    where: { conversationId: convo.id, senderId: otherId, read: false },
    data: { read: true },
  });

  const rows = await prisma.message.findMany({
    where: { conversationId: convo.id },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: { id: true, text: true, imageUrl: true, senderId: true, createdAt: true },
  });

  // Is the other person currently typing?
  const otherTypingAt = convo.userAId === otherId ? convo.userATypingAt : convo.userBTypingAt;
  const typing = !!otherTypingAt && Date.now() - otherTypingAt.getTime() < TYPING_WINDOW_MS;

  return NextResponse.json({
    typing,
    other: presence(otherLastActive),
    messages: rows.map((m) => ({
      id: m.id,
      text: m.text ? decryptText(m.text) : "",
      imageUrl: m.imageUrl,
      mine: m.senderId === me,
      createdAt: m.createdAt.toISOString(),
    })),
  });
}

// POST /api/messages/:username — send a text and/or image message.
export async function POST(req: Request, { params }: { params: Promise<{ username: string }> }) {
  const limited = await rateLimit(req, "dm", 60, 60_000);
  if (limited) return limited;

  const { username } = await params;
  const r = await resolve(username);
  if ("error" in r) return r.error;
  const { me, otherId } = r;

  let clean = "";
  let imageUrl: string | null = null;

  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    clean = ((form?.get("text") as string | null) ?? "").trim();
    const media = form?.get("media");
    if (media instanceof File && media.size > 0) {
      const realType = await sniffMime(media);
      if (!realType || !IMAGE_TYPES.includes(realType)) {
        return NextResponse.json({ error: "Only images can be sent in chat." }, { status: 400 });
      }
      if (media.size > MAX_IMAGE_BYTES) {
        return NextResponse.json({ error: "Image too large." }, { status: 400 });
      }
      try {
        ({ url: imageUrl } = await saveMedia(media));
      } catch {
        return NextResponse.json({ error: "Couldn't upload the image." }, { status: 500 });
      }
    }
  } else {
    const body = (await req.json().catch(() => ({}))) as { text?: string };
    clean = (body.text ?? "").trim();
  }

  if (!clean && !imageUrl) {
    return NextResponse.json({ error: "Message can't be empty" }, { status: 400 });
  }
  if (clean.length > 2000) return NextResponse.json({ error: "Message too long" }, { status: 400 });

  const convoId = await getOrCreateConversation(me, otherId);
  const msg = await prisma.message.create({
    data: {
      conversationId: convoId,
      senderId: me,
      text: clean ? encryptText(clean) : "",
      imageUrl,
    },
    select: { id: true, createdAt: true },
  });

  // Bump conversation + clear my typing flag + my presence.
  const key = pairKey(me, otherId);
  const meIsA = key.userAId === me;
  await Promise.all([
    prisma.conversation.update({
      where: { id: convoId },
      data: { updatedAt: new Date(), ...(meIsA ? { userATypingAt: null } : { userBTypingAt: null }) },
    }),
    prisma.user.update({ where: { id: me }, data: { lastActiveAt: new Date() } }),
  ]);

  return NextResponse.json({
    message: { id: msg.id, text: clean, imageUrl, mine: true, createdAt: msg.createdAt.toISOString() },
  });
}
