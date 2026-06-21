import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { acceptedFollowingIds, blockedUserIds } from "@/lib/access";
import UserList from "@/components/UserList";

// "Suggested for you" — accounts the viewer doesn't follow yet (most-followed
// first), excluding self, current follows, and blocked users.
export default async function SuggestedFollows({ limit = 6 }: { limit?: number }) {
  const me = await getSessionUserId();
  if (!me) return null;

  const [following, blocked] = await Promise.all([acceptedFollowingIds(me), blockedUserIds(me)]);
  const exclude = Array.from(new Set([me, ...following, ...blocked]));

  const candidates = await prisma.user.findMany({
    where: { id: { notIn: exclude } },
    orderBy: { followers: { _count: "desc" } },
    take: limit,
    select: { username: true, displayName: true, avatarUrl: true },
  });
  if (candidates.length === 0) return null;

  return (
    <section className="rounded-2xl bg-zinc-900 p-4 ring-1 ring-zinc-800">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
        Suggested for you
      </h2>
      <UserList
        users={candidates.map((u) => ({ ...u, followState: "none" as const }))}
      />
    </section>
  );
}
