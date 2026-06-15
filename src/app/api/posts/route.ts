import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { saveMedia } from "@/lib/storage";
import { sniffMime } from "@/lib/filecheck";
import { rateLimit } from "@/lib/ratelimit";
import {
  IMAGE_TYPES,
  VIDEO_TYPES,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
} from "@/lib/validation";

// POST /api/posts — create a post (multipart: `media` file + optional `caption`).
export async function POST(req: Request) {
  const limited = rateLimit(req, "upload", 20, 60_000); // 20 posts/min per IP
  if (limited) return limited;

  const me = await getSessionUserId();
  if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid form data" }, { status: 400 });

  const media = form.get("media");
  const caption = (form.get("caption") as string | null)?.trim() || null;

  if (!(media instanceof File) || media.size === 0) {
    return NextResponse.json({ error: "Please choose a photo or video" }, { status: 400 });
  }

  // Trust the file's REAL signature, not the client-supplied MIME type.
  const realType = await sniffMime(media);
  const isImage = !!realType && IMAGE_TYPES.includes(realType);
  const isVideo = !!realType && VIDEO_TYPES.includes(realType);
  if (!isImage && !isVideo) {
    return NextResponse.json(
      { error: "Unsupported or invalid file. Use a real JPG/PNG/WEBP/GIF or MP4/WEBM." },
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

  let url: string;
  try {
    ({ url } = await saveMedia(media));
  } catch (err) {
    console.error("saveMedia failed:", err);
    return NextResponse.json(
      {
        error:
          "Couldn't save the file. On Vercel, create a Blob store so uploads persist (adds BLOB_READ_WRITE_TOKEN).",
      },
      { status: 500 }
    );
  }

  const post = await prisma.post.create({
    data: { authorId: me, mediaUrl: url, mediaType: isImage ? "IMAGE" : "VIDEO", caption },
    select: { id: true },
  });

  return NextResponse.json({ post }, { status: 201 });
}
