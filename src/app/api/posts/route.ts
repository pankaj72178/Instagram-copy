import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { saveMedia } from "@/lib/storage";
import {
  IMAGE_TYPES,
  VIDEO_TYPES,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
} from "@/lib/validation";

// POST /api/posts — create a post (multipart: `media` file + optional `caption`).
export async function POST(req: Request) {
  const me = await getSessionUserId();
  if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid form data" }, { status: 400 });

  const media = form.get("media");
  const caption = (form.get("caption") as string | null)?.trim() || null;

  if (!(media instanceof File) || media.size === 0) {
    return NextResponse.json({ error: "Please choose a photo or video" }, { status: 400 });
  }

  const isImage = IMAGE_TYPES.includes(media.type);
  const isVideo = VIDEO_TYPES.includes(media.type);
  if (!isImage && !isVideo) {
    return NextResponse.json(
      { error: "Unsupported file type. Use JPG/PNG/WEBP/GIF or MP4/WEBM." },
      { status: 400 }
    );
  }
  const maxBytes = isImage ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (media.size > maxBytes) {
    return NextResponse.json(
      { error: `File too large (max ${isImage ? "8MB" : "50MB"})` },
      { status: 400 }
    );
  }
  if (caption && caption.length > 2200) {
    return NextResponse.json({ error: "Caption too long" }, { status: 400 });
  }

  const { url } = await saveMedia(media);
  const post = await prisma.post.create({
    data: { authorId: me, mediaUrl: url, mediaType: isImage ? "IMAGE" : "VIDEO", caption },
    select: { id: true },
  });

  return NextResponse.json({ post }, { status: 201 });
}
