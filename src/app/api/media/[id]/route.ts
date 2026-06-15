import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { canViewContent } from "@/lib/access";

// GET /api/media/:id — stream a media file stored in MongoDB.
// Privacy: if this media belongs to a POST whose author is private, only the
// owner / approved followers may fetch it. Avatars (and other media) are public.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = `/api/media/${id}`;

  // Is this a post's media? If so, enforce the author's privacy.
  const post = await prisma.post.findFirst({
    where: { mediaUrl: url },
    select: { author: { select: { id: true, isPrivate: true } } },
  });
  if (post) {
    const viewerId = await getSessionUserId();
    const ok = await canViewContent(viewerId, post.author);
    if (!ok) return new Response("Forbidden", { status: 403 });
  }

  let media;
  try {
    media = await prisma.media.findUnique({
      where: { id },
      select: { data: true, contentType: true },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
  if (!media) return new Response("Not found", { status: 404 });

  const body = Buffer.from(media.data as unknown as Uint8Array);
  return new Response(body, {
    headers: {
      "Content-Type": media.contentType || "application/octet-stream",
      "Content-Length": String(body.length),
      // Cache per-viewer (private so a CDN won't share private media).
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
