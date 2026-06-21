import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { acceptedFollowingIds, blockedUserIds } from "@/lib/access";
import { saveMedia } from "@/lib/storage";
import { sniffMime } from "@/lib/filecheck";
import { rateLimit } from "@/lib/ratelimit";
import { IMAGE_TYPES, VIDEO_TYPES, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES } from "@/lib/validation";

export type StoryItem = { id: string; mediaUrl: string; mediaType: string; createdAt: string; seen: boolean };
export type StoryGroup = {
  username: string;
  avatarUrl: string | null;
  isMe: boolean;
  hasUnseen: boolean;
  stories: StoryItem[];
};

// GET /api/stories — active stories from people you follow + your own, grouped.
export async function GET() {
  const me = await getSessionUserId();
  if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const [following, blocked] = await Promise.all([acceptedFollowingIds(me), blockedUserIds(me)]);
  const authorIds = [me, ...following].filter((id) => !blocked.includes(id));

  const rows = await prisma.story.findMany({
    where: { authorId: { in: authorIds }, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      mediaUrl: true,
      mediaType: true,
      createdAt: true,
      authorId: true,
      author: { select: { username: true, avatarUrl: true } },
      views: { where: { viewerId: me }, select: { id: true }, take: 1 },
    },
  });

  // Group by author.
  const byAuthor = new Map<string, StoryGroup>();
  for (const r of rows) {
    let g = byAuthor.get(r.authorId);
    if (!g) {
      g = {
        username: r.author.username,
        avatarUrl: r.author.avatarUrl,
        isMe: r.authorId === me,
        hasUnseen: false,
        stories: [],
      };
      byAuthor.set(r.authorId, g);
    }
    const seen = r.views.length > 0;
    g.stories.push({ id: r.id, mediaUrl: r.mediaUrl, mediaType: r.mediaType, createdAt: r.createdAt.toISOString(), seen });
    if (!g.isMe && !seen) g.hasUnseen = true;
  }

  // Order: me first, then groups with unseen, then the rest.
  const groups = [...byAuthor.values()].sort((a, b) => {
    if (a.isMe !== b.isMe) return a.isMe ? -1 : 1;
    if (a.hasUnseen !== b.hasUnseen) return a.hasUnseen ? -1 : 1;
    return 0;
  });

  return NextResponse.json({ groups });
}

// POST /api/stories — add a story (multipart: `media`). Expires in 24h.
export async function POST(req: Request) {
  const limited = await rateLimit(req, "story", 20, 60_000);
  if (limited) return limited;

  const me = await getSessionUserId();
  if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const media = form?.get("media");
  if (!(media instanceof File) || media.size === 0) {
    return NextResponse.json({ error: "Choose a photo or video" }, { status: 400 });
  }
  const realType = await sniffMime(media);
  const isImage = !!realType && IMAGE_TYPES.includes(realType);
  const isVideo = !!realType && VIDEO_TYPES.includes(realType);
  if (!isImage && !isVideo) {
    return NextResponse.json({ error: "Unsupported or invalid file." }, { status: 400 });
  }
  if (media.size > (isImage ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES)) {
    return NextResponse.json({ error: "File too large." }, { status: 400 });
  }

  let url: string;
  try {
    ({ url } = await saveMedia(media));
  } catch {
    return NextResponse.json({ error: "Couldn't save the file." }, { status: 500 });
  }

  const story = await prisma.story.create({
    data: {
      authorId: me,
      mediaUrl: url,
      mediaType: isImage ? "IMAGE" : "VIDEO",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
    select: { id: true },
  });
  return NextResponse.json({ story }, { status: 201 });
}
