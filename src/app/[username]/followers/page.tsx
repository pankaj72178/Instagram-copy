import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { canViewContent, followStatesFor } from "@/lib/access";
import UserList, { type UserListItem } from "@/components/UserList";

export default async function FollowersPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const viewerId = await getSessionUserId();

  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, username: true, isPrivate: true },
  });
  if (!user) notFound();

  const canView = await canViewContent(viewerId, user);

  let users: UserListItem[] = [];
  if (canView) {
    const rows = await prisma.follow.findMany({
      where: { followingId: user.id, status: "ACCEPTED" },
      orderBy: { createdAt: "desc" },
      select: { follower: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    });
    const followers = rows.map((r) => r.follower);
    const states = await followStatesFor(viewerId, followers.map((f) => f.id));
    users = followers.map((f) => ({
      username: f.username,
      displayName: f.displayName,
      avatarUrl: f.avatarUrl,
      followState: states[f.id] ?? "none",
    }));
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <header className="mb-4">
        <Link href={`/${user.username}`} className="text-sm text-indigo-400 hover:underline">← {user.username}</Link>
        <h1 className="mt-1 text-xl font-bold">Followers</h1>
      </header>
      {canView ? (
        <UserList users={users} emptyText="No followers yet." />
      ) : (
        <p className="py-12 text-center text-sm text-zinc-500">🔒 This account is private.</p>
      )}
    </main>
  );
}
