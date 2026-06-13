// Follow-state + privacy helpers shared across profiles, feed, and posts.
import "server-only";
import { prisma } from "@/lib/prisma";

export type FollowState =
  | "self"
  | "following" // accepted follow
  | "requested" // pending request I sent
  | "none"; // not following

/** What is `viewerId`'s relationship to `targetId`? */
export async function getFollowState(
  viewerId: string | null,
  targetId: string
): Promise<FollowState> {
  if (!viewerId) return "none";
  if (viewerId === targetId) return "self";
  const f = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: viewerId, followingId: targetId } },
    select: { status: true },
  });
  if (!f) return "none";
  return f.status === "ACCEPTED" ? "following" : "requested";
}

/** Does `targetId` follow `viewerId` back (accepted)? Used for "Follow Back". */
export async function followsMe(viewerId: string, targetId: string): Promise<boolean> {
  const f = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: targetId, followingId: viewerId } },
    select: { status: true },
  });
  return f?.status === "ACCEPTED";
}

/**
 * Can `viewerId` see `target`'s posts / followers / following?
 * Public accounts: always. Private: only the owner or accepted followers.
 */
export async function canViewContent(
  viewerId: string | null,
  target: { id: string; isPrivate: boolean }
): Promise<boolean> {
  if (!target.isPrivate) return true;
  if (!viewerId) return false;
  if (viewerId === target.id) return true;
  const state = await getFollowState(viewerId, target.id);
  return state === "following";
}

/** Viewer's follow state toward many users at once (for lists/search). */
export async function followStatesFor(
  viewerId: string | null,
  ids: string[]
): Promise<Record<string, FollowState>> {
  const out: Record<string, FollowState> = {};
  for (const id of ids) out[id] = viewerId === id ? "self" : "none";
  if (!viewerId || ids.length === 0) return out;
  const rows = await prisma.follow.findMany({
    where: { followerId: viewerId, followingId: { in: ids } },
    select: { followingId: true, status: true },
  });
  for (const r of rows) {
    out[r.followingId] = r.status === "ACCEPTED" ? "following" : "requested";
  }
  return out;
}

/** IDs of accounts `viewerId` follows (ACCEPTED) — used to build the feed. */
export async function acceptedFollowingIds(viewerId: string): Promise<string[]> {
  const rows = await prisma.follow.findMany({
    where: { followerId: viewerId, status: "ACCEPTED" },
    select: { followingId: true },
  });
  return rows.map((r) => r.followingId);
}
