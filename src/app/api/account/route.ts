import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId, clearAuthCookie } from "@/lib/auth";
import { deleteMedia } from "@/lib/storage";
import { rateLimit } from "@/lib/ratelimit";

// DELETE /api/account — permanently delete the signed-in user's account
// and all data they own (posts, likes, comments, follows, uploaded media).
export async function DELETE(req: Request) {
  const limited = await rateLimit(req, "account-delete", 5, 60_000);
  if (limited) return limited;

  const me = await getSessionUserId();
  if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });

  // Gather media to clean up after the rows are gone (avatar + every post's file).
  const [account, posts] = await Promise.all([
    prisma.user.findUnique({ where: { id: me }, select: { avatarUrl: true } }),
    prisma.post.findMany({ where: { authorId: me }, select: { id: true, mediaUrl: true } }),
  ]);
  if (!account) {
    await clearAuthCookie();
    return NextResponse.json({ ok: true });
  }

  const postIds = posts.map((p) => p.id);

  // Remove dependent rows first (MongoDB has no DB-level cascade), then the user.
  await prisma.like.deleteMany({
    where: { OR: [{ userId: me }, { postId: { in: postIds } }] },
  });
  await prisma.comment.deleteMany({
    where: { OR: [{ userId: me }, { postId: { in: postIds } }] },
  });
  await prisma.follow.deleteMany({
    where: { OR: [{ followerId: me }, { followingId: me }] },
  });
  await prisma.bookmark.deleteMany({
    where: { OR: [{ userId: me }, { postId: { in: postIds } }] },
  });
  await prisma.block.deleteMany({
    where: { OR: [{ blockerId: me }, { blockedId: me }] },
  });
  await prisma.report.deleteMany({ where: { reporterId: me } });
  // Conversations + their messages (Message cascades when the conversation is deleted).
  await prisma.message.deleteMany({ where: { senderId: me } });
  await prisma.conversation.deleteMany({
    where: { OR: [{ userAId: me }, { userBId: me }] },
  });
  await prisma.post.deleteMany({ where: { authorId: me } });
  await prisma.user.delete({ where: { id: me } });

  // Best-effort media cleanup (DB-stored bytes or Blob files).
  await Promise.all([
    ...posts.map((p) => deleteMedia(p.mediaUrl)),
    account.avatarUrl ? deleteMedia(account.avatarUrl) : Promise.resolve(),
  ]);

  await clearAuthCookie();
  return NextResponse.json({ ok: true });
}
