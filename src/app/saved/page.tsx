import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SavedView from "@/components/SavedView";

export const dynamic = "force-dynamic";

// /saved — bookmarked posts, organized into collections (folders).
export default async function SavedPage() {
  const me = await getSessionUserId();
  if (!me) redirect("/login?next=/saved");

  const [bookmarks, collections] = await Promise.all([
    prisma.bookmark.findMany({
      where: { userId: me },
      orderBy: { createdAt: "desc" },
      select: { collectionId: true, post: { select: { id: true, mediaUrl: true, mediaType: true } } },
    }),
    prisma.collection.findMany({
      where: { userId: me },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const posts = bookmarks
    .filter((b) => b.post)
    .map((b) => ({ ...b.post!, collectionId: b.collectionId }));

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
      <h1 className="mb-1 text-2xl font-bold">Saved</h1>
      <p className="mb-4 text-sm text-zinc-500">Only you can see what you’ve saved.</p>
      <SavedView initialPosts={posts} initialCollections={collections} />
    </main>
  );
}
