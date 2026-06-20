import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PostGrid from "@/components/PostGrid";

export const dynamic = "force-dynamic";

// /saved — posts the current user has bookmarked.
export default async function SavedPage() {
  const me = await getSessionUserId();
  if (!me) redirect("/login?next=/saved");

  const bookmarks = await prisma.bookmark.findMany({
    where: { userId: me },
    orderBy: { createdAt: "desc" },
    select: { post: { select: { id: true, mediaUrl: true, mediaType: true } } },
  });
  const posts = bookmarks.map((b) => b.post).filter(Boolean);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
      <h1 className="mb-1 text-2xl font-bold">Saved</h1>
      <p className="mb-6 text-sm text-zinc-500">Only you can see what you’ve saved.</p>
      <PostGrid
        posts={posts}
        emptyTitle="Nothing saved yet"
        emptyHint="Tap the bookmark icon on any post to save it here."
      />
    </main>
  );
}
