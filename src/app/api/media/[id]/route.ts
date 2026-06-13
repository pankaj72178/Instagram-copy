import { prisma } from "@/lib/prisma";

// GET /api/media/:id — stream a media file stored in MongoDB.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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

  // Prisma returns Bytes as a Uint8Array/Buffer.
  const body = Buffer.from(media.data as unknown as Uint8Array);
  return new Response(body, {
    headers: {
      "Content-Type": media.contentType || "application/octet-stream",
      "Content-Length": String(body.length),
      // Media is immutable once uploaded — cache aggressively.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
