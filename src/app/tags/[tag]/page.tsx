import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { blockedUserIds } from "@/lib/access";
import PostGrid from "@/components/PostGrid";

export const dynamic = "force-dynamic";

// /tags/[tag] — public posts whose caption contains #tag (+ your own).
export default async function TagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  const clean = decodeURIComponent(tag).replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();
  const me = await getSessionUserId();
  const blocked = me ? await blockedUserIds(me) : [];

  const posts = clean
    ? await prisma.post.findMany({
        where: {
          caption: { contains: `#${clean}`, mode: "insensitive" },
          authorId: blocked.length ? { notIn: blocked } : undefined,
          OR: [{ author: { isPrivate: false } }, ...(me ? [{ authorId: me }] : [])],
        },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: { id: true, mediaUrl: true, mediaType: true },
      })
    : [];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
      <h1 className="mb-1 text-2xl font-bold text-brand">#{clean}</h1>
      <p className="mb-6 text-sm text-zinc-500">
        {posts.length} {posts.length === 1 ? "post" : "posts"}
      </p>
      <PostGrid
        posts={posts}
        emptyTitle={`No posts tagged #${clean}`}
        emptyHint="Be the first to use this hashtag in a caption."
      />
    </main>
  );
}
