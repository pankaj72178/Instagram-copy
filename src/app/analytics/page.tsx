import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// /analytics — a private dashboard of your own account's performance.
export default async function AnalyticsPage() {
  const me = await getSessionUserId();
  if (!me) redirect("/login?next=/analytics");

  const [postCount, likesReceived, commentsReceived, followers, following, topPosts] =
    await Promise.all([
      prisma.post.count({ where: { authorId: me } }),
      prisma.like.count({ where: { post: { authorId: me } } }),
      prisma.comment.count({ where: { post: { authorId: me }, NOT: { userId: me } } }),
      prisma.follow.count({ where: { followingId: me, status: "ACCEPTED" } }),
      prisma.follow.count({ where: { followerId: me, status: "ACCEPTED" } }),
      prisma.post.findMany({
        where: { authorId: me },
        orderBy: { likes: { _count: "desc" } },
        take: 6,
        select: { id: true, mediaUrl: true, mediaType: true, _count: { select: { likes: true, comments: true } } },
      }),
    ]);

  const avgLikes = postCount ? Math.round((likesReceived / postCount) * 10) / 10 : 0;

  const stats = [
    { label: "Posts", value: postCount },
    { label: "Likes received", value: likesReceived },
    { label: "Comments received", value: commentsReceived },
    { label: "Avg likes / post", value: avgLikes },
    { label: "Followers", value: followers },
    { label: "Following", value: following },
  ];

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
      <h1 className="mb-1 text-2xl font-bold">Your analytics</h1>
      <p className="mb-6 text-sm text-zinc-500">Only you can see this.</p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl bg-zinc-900 p-4 ring-1 ring-zinc-800">
            <p className="text-2xl font-extrabold text-brand">{s.value}</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-zinc-500">{s.label}</p>
          </div>
        ))}
      </div>

      <h2 className="mb-3 mt-8 text-lg font-semibold">Top posts</h2>
      {topPosts.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-500">No posts yet.</p>
      ) : (
        <ul className="grid grid-cols-3 gap-1 md:gap-2">
          {topPosts.map((p) => (
            <li key={p.id} className="relative">
              <Link href={`/post/${p.id}`} className="block aspect-square overflow-hidden rounded-md bg-zinc-800">
                {p.mediaType === "VIDEO" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <video src={p.mediaUrl} className="h-full w-full object-cover" muted playsInline />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.mediaUrl} alt="" className="h-full w-full object-cover" />
                )}
                <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-3 bg-gradient-to-t from-black/70 to-transparent py-1.5 text-xs font-semibold text-white">
                  <span>❤️ {p._count.likes}</span>
                  <span>💬 {p._count.comments}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
