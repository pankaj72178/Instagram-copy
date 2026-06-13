// Server helper: turn Post rows into the shape <PostCard> expects, including
// like counts, whether the viewer liked it, comment preview, and ownership.
import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type CommentItem = {
  id: string;
  text: string;
  createdAt: string;
  user: { username: string; avatarUrl: string | null };
};

export type PostCardData = {
  id: string;
  author: { username: string; avatarUrl: string | null };
  mediaUrl: string;
  mediaType: string;
  caption: string | null;
  createdAt: string;
  likeCount: number;
  likedByMe: boolean;
  commentCount: number;
  comments: CommentItem[];
  isOwner: boolean;
};

export async function loadPostCards(
  where: Prisma.PostWhereInput,
  viewerId: string,
  opts: { take?: number; cursor?: string; allComments?: boolean; commentPreview?: number } = {}
): Promise<PostCardData[]> {
  const posts = await prisma.post.findMany({
    where,
    orderBy: { createdAt: "desc" },
    ...(opts.take ? { take: opts.take } : {}),
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    select: {
      id: true,
      mediaUrl: true,
      mediaType: true,
      caption: true,
      createdAt: true,
      authorId: true,
      author: { select: { username: true, avatarUrl: true } },
      _count: { select: { likes: true, comments: true } },
      likes: { where: { userId: viewerId }, select: { id: true }, take: 1 },
      comments: {
        orderBy: { createdAt: opts.allComments ? "asc" : "desc" },
        ...(opts.allComments ? {} : { take: opts.commentPreview ?? 2 }),
        select: {
          id: true,
          text: true,
          createdAt: true,
          user: { select: { username: true, avatarUrl: true } },
        },
      },
    },
  });

  return posts.map((p) => {
    const comments = opts.allComments ? p.comments : [...p.comments].reverse();
    return {
      id: p.id,
      author: p.author,
      mediaUrl: p.mediaUrl,
      mediaType: p.mediaType,
      caption: p.caption,
      createdAt: p.createdAt.toISOString(),
      likeCount: p._count.likes,
      likedByMe: p.likes.length > 0,
      commentCount: p._count.comments,
      comments: comments.map((c) => ({
        id: c.id,
        text: c.text,
        createdAt: c.createdAt.toISOString(),
        user: c.user,
      })),
      isOwner: p.authorId === viewerId,
    };
  });
}
