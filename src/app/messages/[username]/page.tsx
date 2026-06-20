import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { areBlocked } from "@/lib/access";
import { findConversation } from "@/lib/dm";
import Thread from "@/components/Thread";

export const dynamic = "force-dynamic";

// /messages/[username] — a 1:1 conversation thread.
export default async function ThreadPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const me = await getSessionUserId();
  if (!me) redirect(`/login?next=/messages/${username}`);

  const other = await prisma.user.findUnique({
    where: { username },
    select: { id: true, username: true, displayName: true, avatarUrl: true },
  });
  if (!other) notFound();
  if (other.id === me) redirect("/messages");

  if (await areBlocked(me, other.id)) {
    return (
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-16 text-center">
        <p className="text-2xl">🚫</p>
        <p className="mt-2 font-semibold">You can’t message this account</p>
        <Link href="/messages" className="mt-3 inline-block text-sm text-indigo-400 hover:underline">
          Back to messages
        </Link>
      </main>
    );
  }

  // Load existing messages (and mark the other person's as read).
  const convoId = await findConversation(me, other.id);
  let initialMessages: { id: string; text: string; mine: boolean; createdAt: string }[] = [];
  if (convoId) {
    await prisma.message.updateMany({
      where: { conversationId: convoId, senderId: other.id, read: false },
      data: { read: true },
    });
    const rows = await prisma.message.findMany({
      where: { conversationId: convoId },
      orderBy: { createdAt: "asc" },
      take: 200,
      select: { id: true, text: true, senderId: true, createdAt: true },
    });
    initialMessages = rows.map((m) => ({
      id: m.id,
      text: m.text,
      mine: m.senderId === me,
      createdAt: m.createdAt.toISOString(),
    }));
  }

  return (
    <Thread
      other={{ username: other.username, displayName: other.displayName, avatarUrl: other.avatarUrl }}
      initialMessages={initialMessages}
    />
  );
}
