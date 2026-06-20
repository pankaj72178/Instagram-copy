import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { blockedUserIds } from "@/lib/access";
import PostGrid from "@/components/PostGrid";
import SearchBox from "@/components/SearchBox";

// Always render at request time (never prerender at build → no DB needed during build).
export const dynamic = "force-dynamic";

// Explore — recent posts from PUBLIC accounts only (excluding blocked users).
export default async function ExplorePage() {
  const me = await getSessionUserId();
  const blocked = me ? await blockedUserIds(me) : [];
  const posts = await prisma.post.findMany({
    where: {
      author: { isPrivate: false },
      ...(blocked.length ? { authorId: { notIn: blocked } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { id: true, mediaUrl: true, mediaType: true },
  });

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
      <h1 className="mb-4 text-xl font-bold">Explore</h1>
      <SearchBox />
      {posts.length === 0 ? (
        <p className="py-16 text-center text-sm text-zinc-400">No public posts yet.</p>
      ) : (
        <PostGrid posts={posts} />
      )}
    </main>
  );
}
