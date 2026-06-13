import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { timeAgo } from "@/lib/format";
import FollowRequests from "@/components/FollowRequests";

export default async function NotificationsPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login?next=/notifications");

  const [requests, recentFollowers, recentLikes] = await Promise.all([
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
      where: { post: { authorId: me.id } },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: {
        id: true,
        createdAt: true,
        user: { select: { username: true, avatarUrl: true } },
        post: { select: { id: true, mediaUrl: true } },
      },
    }),
  ]);

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-6">
      <h1 className="mb-4 text-xl font-bold">Activity</h1>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">Follow requests</h2>
        <FollowRequests requests={requests} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">Recent</h2>
        {recentFollowers.length === 0 && recentLikes.length === 0 ? (
          <p className="text-sm text-zinc-400">Nothing here yet.</p>
        ) : (
          <ul className="space-y-3">
            {recentFollowers.map((f) => (
              <li key={`f-${f.id}`} className="flex items-center gap-3 text-sm">
                <UserAvatar url={f.follower.avatarUrl} username={f.follower.username} />
                <span className="flex-1">
                  <Link href={`/${f.follower.username}`} className="font-semibold">{f.follower.username}</Link>{" "}
                  started following you
                </span>
                <span className="text-xs text-zinc-400">{timeAgo(f.updatedAt)}</span>
              </li>
            ))}
            {recentLikes.map((l) => (
              <li key={`l-${l.id}`} className="flex items-center gap-3 text-sm">
                <UserAvatar url={l.user.avatarUrl} username={l.user.username} />
                <span className="flex-1">
                  <Link href={`/${l.user.username}`} className="font-semibold">{l.user.username}</Link>{" "}
                  liked your post
                </span>
                <Link href={`/post/${l.post.id}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={l.post.mediaUrl} alt="" className="h-10 w-10 rounded-md object-cover ring-1 ring-zinc-800" />
                </Link>
                <span className="text-xs text-zinc-400">{timeAgo(l.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function UserAvatar({ url, username }: { url: string | null; username: string }) {
  if (url) {
    return <Image src={url} alt={username} width={40} height={40} unoptimized className="h-10 w-10 rounded-full object-cover ring-1 ring-zinc-800" />;
  }
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-950 font-bold text-indigo-400">
      {username[0]?.toUpperCase()}
    </span>
  );
}
