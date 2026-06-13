import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { canViewContent } from "@/lib/access";
import { commentSchema } from "@/lib/validation";

async function loadViewablePost(id: string, viewerId: string) {
  const post = await prisma.post.findUnique({
    where: { id },
    select: { id: true, author: { select: { id: true, isPrivate: true } } },
  });
  if (!post) return null;
  return (await canViewContent(viewerId, post.author)) ? post : null;
}

// GET /api/posts/:id/comments — list comments (author + timestamp).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getSessionUserId();
  if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });
  const { id } = await params;

  if (!(await loadViewablePost(id, me))) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }
  const comments = await prisma.comment.findMany({
    where: { postId: id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      text: true,
      createdAt: true,
      user: { select: { username: true, avatarUrl: true } },
    },
  });
  return NextResponse.json({ comments });
}

// POST /api/posts/:id/comments — add a comment.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getSessionUserId();
  if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });
  const { id } = await params;

  if (!(await loadViewablePost(id, me))) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }
  const body = await req.json().catch(() => ({}));
  const parsed = commentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid comment" },
      { status: 400 }
    );
  }

  const comment = await prisma.comment.create({
    data: { postId: id, userId: me, text: parsed.data.text },
    select: {
      id: true,
      text: true,
      createdAt: true,
      user: { select: { username: true, avatarUrl: true } },
    },
  });
  return NextResponse.json({ comment }, { status: 201 });
}
