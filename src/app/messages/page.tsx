import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { timeAgo } from "@/lib/format";
import Avatar from "@/components/Avatar";

export const dynamic = "force-dynamic";

// /messages — inbox of conversations.
export default async function MessagesPage() {
  const me = await getSessionUserId();
  if (!me) redirect("/login?next=/messages");

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
        select: { text: true, senderId: true, createdAt: true },
      },
    },
  });

  const items = (
    await Promise.all(
      convos.map(async (c) => {
        const other = c.userA.id === me ? c.userB : c.userA;
        const last = c.messages[0];
        if (!last) return null;
        const unread = await prisma.message.count({
          where: { conversationId: c.id, read: false, NOT: { senderId: me } },
        });
        return { other, last, unread };
      })
    )
  ).filter((x): x is NonNullable<typeof x> => x !== null);

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-0 py-0 sm:px-4 sm:py-6">
      <h1 className="px-4 py-4 text-xl font-bold sm:px-0 sm:pt-0">Messages</h1>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-20 text-center">
          <span className="text-4xl">✉️</span>
          <p className="font-semibold">No messages yet</p>
          <p className="text-sm text-zinc-500">Open someone’s profile and tap Message to start a chat.</p>
        </div>
      ) : (
        <ul className="divide-y divide-zinc-800">
          {items.map(({ other, last, unread }) => (
            <li key={other.username}>
              <Link
                href={`/messages/${other.username}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-900 sm:rounded-xl"
              >
                <Avatar url={other.avatarUrl} username={other.username} size="lg" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold">{other.username}</span>
                    <span className="shrink-0 text-xs text-zinc-500">{timeAgo(last.createdAt)}</span>
                  </span>
                  <span className="flex items-center justify-between gap-2">
                    <span className={`truncate text-sm ${unread ? "font-semibold text-zinc-100" : "text-zinc-500"}`}>
                      {last.senderId === me ? "You: " : ""}
                      {last.text}
                    </span>
                    {unread > 0 && (
                      <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-xs font-bold text-white">
                        {unread}
                      </span>
                    )}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
