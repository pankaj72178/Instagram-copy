import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const user = await prisma.user.findUnique({
    where: { username },
    select: { username: true, displayName: true, bio: true, avatarUrl: true },
  });
  if (!user) return { title: "Profile" };
  const title = `${user.displayName} (@${user.username})`;
  const description = user.bio?.slice(0, 160) || `See @${user.username}’s photos and videos on Folo.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      ...(user.avatarUrl ? { images: [user.avatarUrl] } : {}),
    },
  };
}
import { getFollowState, followsMe, canViewContent, areBlocked } from "@/lib/access";
import FollowButton from "@/components/FollowButton";
import PostGrid from "@/components/PostGrid";
import Avatar from "@/components/Avatar";
import ProfileActions from "@/components/ProfileActions";
import Linkify from "@/components/Linkify";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const viewerId = await getSessionUserId();

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      displayName: true,
      bio: true,
      avatarUrl: true,
      isPrivate: true,
    },
  });
  if (!user) {
    // Maybe they renamed — old links should still work. Look up the history.
    const renamed = await prisma.user.findFirst({
      where: { prevUsernames: { has: username } },
      select: { username: true },
    });
    if (renamed) redirect(`/${renamed.username}`);
    notFound();
  }

  const [postCount, followerCount, followingCount] = await Promise.all([
    prisma.post.count({ where: { authorId: user.id } }),
    prisma.follow.count({ where: { followingId: user.id, status: "ACCEPTED" } }),
    prisma.follow.count({ where: { followerId: user.id, status: "ACCEPTED" } }),
  ]);

  const isSelf = viewerId === user.id;
  const state = await getFollowState(viewerId, user.id);
  const theyFollowMe = viewerId && !isSelf ? await followsMe(viewerId, user.id) : false;
  const blocked = !isSelf ? await areBlocked(viewerId, user.id) : false;
  const iBlockedThem =
    viewerId && !isSelf
      ? !!(await prisma.block.findUnique({
          where: { blockerId_blockedId: { blockerId: viewerId, blockedId: user.id } },
          select: { id: true },
        }))
      : false;
  const canView = await canViewContent(viewerId, user);

  const posts = canView
    ? await prisma.post.findMany({
        where: { authorId: user.id },
        orderBy: { createdAt: "desc" },
        select: { id: true, mediaUrl: true, mediaType: true },
      })
    : [];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
      {/* Header */}
      <header className="flex items-center gap-6 sm:gap-10">
        <Avatar url={user.avatarUrl} username={user.username} size="xl" ring />

        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold">{user.username}</h1>
            {user.isPrivate && (
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-500">
                🔒 Private
              </span>
            )}
            {isSelf ? (
              <>
                <Link
                  href="/settings"
                  className="rounded-lg bg-zinc-800 px-4 py-1.5 text-sm font-semibold ring-1 ring-zinc-800 hover:bg-zinc-700"
                >
                  Edit profile
                </Link>
                <Link
                  href="/saved"
                  className="rounded-lg bg-zinc-800 px-4 py-1.5 text-sm font-semibold ring-1 ring-zinc-800 hover:bg-zinc-700"
                >
                  Saved
                </Link>
              </>
            ) : viewerId ? (
              <>
                {!blocked && (
                  <>
                    <FollowButton username={user.username} initialState={state === "self" ? "none" : state} followsMe={theyFollowMe} />
                    <Link
                      href={`/messages/${user.username}`}
                      className="rounded-lg bg-zinc-800 px-4 py-1.5 text-sm font-semibold ring-1 ring-zinc-800 hover:bg-zinc-700"
                    >
                      Message
                    </Link>
                  </>
                )}
                <ProfileActions username={user.username} initialBlocked={iBlockedThem} />
              </>
            ) : (
              <Link href="/login" className="rounded-lg bg-indigo-600 px-5 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700">
                Follow
              </Link>
            )}
          </div>

          <div className="mt-3 flex gap-6 text-sm">
            <span><b>{postCount}</b> posts</span>
            <Link href={`/${user.username}/followers`} className="hover:underline">
              <b>{followerCount}</b> followers
            </Link>
            <Link href={`/${user.username}/following`} className="hover:underline">
              <b>{followingCount}</b> following
            </Link>
          </div>
        </div>
      </header>

      <div className="mt-4">
        <p className="font-semibold">{user.displayName}</p>
        {user.bio && (
          <p className="mt-1 text-sm text-zinc-300">
            <Linkify text={user.bio} />
          </p>
        )}
      </div>

      <hr className="my-6 border-zinc-800" />

      {/* Posts, block gate, or private gate */}
      {blocked ? (
        <div className="py-16 text-center">
          <p className="text-2xl">🚫</p>
          <p className="mt-2 font-semibold">
            {iBlockedThem ? "You blocked this account" : "This account is unavailable"}
          </p>
          <p className="text-sm text-zinc-500">
            {iBlockedThem ? "Unblock them to see their posts again." : ""}
          </p>
        </div>
      ) : canView ? (
        <PostGrid
          posts={posts}
          emptyTitle={isSelf ? "Share your first post" : "No posts yet"}
          emptyHint={
            isSelf
              ? "Photos and videos you post will show up here."
              : undefined
          }
        />
      ) : (
        <div className="py-16 text-center">
          <p className="text-2xl">🔒</p>
          <p className="mt-2 font-semibold">This account is private</p>
          <p className="text-sm text-zinc-500">Follow this account to see their posts.</p>
        </div>
      )}
    </main>
  );
}
