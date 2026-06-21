import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { acceptedFollowingIds } from "@/lib/access";
import { loadPostCards } from "@/lib/posts";
import Feed from "@/components/Feed";
import SuggestedFollows from "@/components/SuggestedFollows";
import Stories from "@/components/Stories";

export default async function Home() {
  const user = await getCurrentUser();

  // Logged-out landing page
  if (!user) {
    return (
      <main className="flex flex-1 items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 p-6 text-white">
        <div className="w-full max-w-md rounded-3xl bg-zinc-900/10 p-10 text-center ring-1 ring-white/20 backdrop-blur-xl">
          <h1 className="text-5xl font-extrabold tracking-tight">Folo</h1>
          <p className="mt-3 text-white/85">Share moments with the people you follow.</p>
          <div className="mt-8 flex flex-col gap-3">
            <Link href="/login" className="rounded-xl bg-zinc-900 py-2.5 font-semibold text-indigo-400 transition hover:bg-zinc-900/90">
              Log in
            </Link>
            <Link href="/signup" className="rounded-xl bg-zinc-900/15 py-2.5 font-semibold text-white ring-1 ring-white/30 transition hover:bg-zinc-900/25">
              Create account
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Logged-in feed
  const authorIds = [...(await acceptedFollowingIds(user.id)), user.id];
  const posts = await loadPostCards({ authorId: { in: authorIds } }, user.id, {
    take: 11,
    commentPreview: 2,
  });
  const hasMore = posts.length > 10;
  const page = hasMore ? posts.slice(0, 10) : posts;
  const nextCursor = hasMore ? page[page.length - 1].id : null;

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-6">
      <Stories myUsername={user.username} myAvatar={user.avatarUrl} />
      {page.length === 0 ? (
        <div className="space-y-4">
          <div className="rounded-2xl bg-zinc-900 p-10 text-center ring-1 ring-zinc-800">
            <p className="text-lg font-semibold">Your feed is empty</p>
            <p className="mt-1 text-sm text-zinc-500">
              Follow people below or{" "}
              <Link href="/upload" className="font-semibold text-indigo-400 hover:underline">share your first post</Link>.
            </p>
          </div>
          <SuggestedFollows limit={6} />
        </div>
      ) : (
        <Feed initialPosts={page} initialCursor={nextCursor} myUsername={user.username} />
      )}
    </main>
  );
}
