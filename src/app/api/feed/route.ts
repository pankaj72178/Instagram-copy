import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { acceptedFollowingIds } from "@/lib/access";
import { loadPostCards } from "@/lib/posts";

const PAGE = 10;

// GET /api/feed?cursor=<postId> — posts from people I follow + my own, newest
// first. Privacy is inherent: only accepted-following + self are included.
export async function GET(req: Request) {
  const me = await getSessionUserId();
  if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const cursor = new URL(req.url).searchParams.get("cursor") ?? undefined;
  const authorIds = [...(await acceptedFollowingIds(me)), me];

  const posts = await loadPostCards(
    { authorId: { in: authorIds } },
    me,
    { take: PAGE + 1, cursor, commentPreview: 2 }
  );

  const hasMore = posts.length > PAGE;
  const page = hasMore ? posts.slice(0, PAGE) : posts;
  const nextCursor = hasMore ? page[page.length - 1].id : null;

  return NextResponse.json({ posts: page, nextCursor });
}
