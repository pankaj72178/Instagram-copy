import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { timeAgo } from "@/lib/format";
import FollowRequests from "@/components/FollowRequests";
import Avatar from "@/components/Avatar";

type Actor = { username: string; avatarUrl: string | null };
type Event = {
  key: string;
  at: Date;
  actor: Actor;
  text: string;
  postId?: string;
  postMedia?: string;
};

export default async function NotificationsPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login?next=/notifications");

  const [requests, recentFollowers, recentLikes, recentComments] = await Promise.all([
    prisma.follow.findMany({
      where: { followingId: me.id, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      select: { id: true, follower: { select: { username: true, displayName: true, avatarUrl: true } } },
    }),
    prisma.follow.findMany({
      where: { followingId: me.id, status: "ACCEPTED" },
      orderBy: { updatedAt: "desc" },
      take: 15,
      select: { id: true, updatedAt: true, follower: { select: { username: true, avatarUrl: true } } },
    }),
    prisma.like.findMany({
      where: { post: { authorId: me.id }, NOT: { userId: me.id } },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: {
        id: true,
        createdAt: true,
        user: { select: { username: true, avatarUrl: true } },
        post: { select: { id: true, mediaUrl: true } },
      },
    }),
    prisma.comment.findMany({
      where: { post: { authorId: me.id }, NOT: { userId: me.id } },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: {
        id: true,
        createdAt: true,
        text: true,
        user: { select: { username: true, avatarUrl: true } },
        post: { select: { id: true, mediaUrl: true } },
      },
    }),
  ]);

  // Merge everything into one time-sorted activity feed.
  const events: Event[] = [
    ...recentFollowers.map((f) => ({
      key: `f-${f.id}`,
      at: f.updatedAt,
      actor: f.follower,
      text: "started following you",
    })),
    ...recentLikes.map((l) => ({
      key: `l-${l.id}`,
      at: l.createdAt,
      actor: l.user,
      text: "liked your post",
      postId: l.post.id,
      postMedia: l.post.mediaUrl,
    })),
    ...recentComments.map((c) => ({
      key: `c-${c.id}`,
      at: c.createdAt,
      actor: c.user,
      text: `commented: ${c.text.length > 40 ? c.text.slice(0, 40) + "…" : c.text}`,
      postId: c.post.id,
      postMedia: c.post.mediaUrl,
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 30);

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-6">
      <h1 className="mb-4 text-xl font-bold">Activity</h1>

      {requests.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">Follow requests</h2>
          <FollowRequests requests={requests} />
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">Recent</h2>
        {events.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <span className="text-4xl">🔔</span>
            <p className="font-semibold">No activity yet</p>
            <p className="text-sm text-zinc-500">Likes, comments and new followers will show up here.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {events.map((e) => (
              <li key={e.key} className="flex items-center gap-3 text-sm">
                <Link href={`/${e.actor.username}`} className="shrink-0">
                  <Avatar url={e.actor.avatarUrl} username={e.actor.username} size="md" />
                </Link>
                <span className="flex-1">
                  <Link href={`/${e.actor.username}`} className="font-semibold">{e.actor.username}</Link>{" "}
                  {e.text}
                </span>
                {e.postId && e.postMedia && (
                  <Link href={`/post/${e.postId}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={e.postMedia} alt="" className="h-10 w-10 rounded-md object-cover ring-1 ring-zinc-800" />
                  </Link>
                )}
                <span className="whitespace-nowrap text-xs text-zinc-400">{timeAgo(e.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
