import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { getFollowState, followsMe, canViewContent } from "@/lib/access";
import FollowButton from "@/components/FollowButton";
import PostGrid from "@/components/PostGrid";

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
  if (!user) notFound();

  const [postCount, followerCount, followingCount] = await Promise.all([
    prisma.post.count({ where: { authorId: user.id } }),
    prisma.follow.count({ where: { followingId: user.id, status: "ACCEPTED" } }),
    prisma.follow.count({ where: { followerId: user.id, status: "ACCEPTED" } }),
  ]);

  const isSelf = viewerId === user.id;
  const state = await getFollowState(viewerId, user.id);
  const theyFollowMe = viewerId && !isSelf ? await followsMe(viewerId, user.id) : false;
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
        {user.avatarUrl ? (
          <Image
            src={user.avatarUrl}
            alt={user.username}
            width={88}
            height={88}
            unoptimized
            className="h-20 w-20 rounded-full object-cover ring-1 ring-zinc-200 sm:h-24 sm:w-24"
          />
        ) : (
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 text-3xl font-bold text-indigo-600 sm:h-24 sm:w-24">
            {user.username[0]?.toUpperCase()}
          </span>
        )}

        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold">{user.username}</h1>
            {user.isPrivate && (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500">
                🔒 Private
              </span>
            )}
            {isSelf ? (
              <Link
                href="/settings"
                className="rounded-lg bg-zinc-100 px-4 py-1.5 text-sm font-semibold ring-1 ring-zinc-200 hover:bg-zinc-200"
              >
                Edit profile
              </Link>
            ) : viewerId ? (
              <FollowButton username={user.username} initialState={state === "self" ? "none" : state} followsMe={theyFollowMe} />
            ) : (
              <Link href="/login" className="rounded-lg bg-indigo-600 px-5 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700">
                Follow
              </Link>
            )}
          </div>

          <div className="mt-3 flex gap-6 text-sm">
            <span><b>{postCount}</b> posts</span>
            <span><b>{followerCount}</b> followers</span>
            <span><b>{followingCount}</b> following</span>
          </div>
        </div>
      </header>

      <div className="mt-4">
        <p className="font-semibold">{user.displayName}</p>
        {user.bio && <p className="mt-1 whitespace-pre-line text-sm text-zinc-600">{user.bio}</p>}
      </div>

      <hr className="my-6 border-zinc-200" />

      {/* Posts or private gate */}
      {canView ? (
        <PostGrid posts={posts} />
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
