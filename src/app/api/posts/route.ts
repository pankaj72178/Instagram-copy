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
  MAX_IMAGE_MB,
  MAX_VIDEO_MB,
} from "@/lib/validation";

// POST /api/posts — create a post (multipart: `media` file + optional `caption`).
export async function POST(req: Request) {
  const limited = await rateLimit(req, "upload", 20, 60_000); // 20 posts/min per IP
  if (limited) return limited;

  const me = await getSessionUserId();
  if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid form data" }, { status: 400 });

  const MAX_ITEMS = 10;
  const files = form.getAll("media").filter((f): f is File => f instanceof File && f.size > 0);
  const caption = (form.get("caption") as string | null)?.trim() || null;

  if (files.length === 0) {
    return NextResponse.json({ error: "Please choose a photo or video" }, { status: 400 });
  }
  if (files.length > MAX_ITEMS) {
    return NextResponse.json({ error: `You can add up to ${MAX_ITEMS} items per post.` }, { status: 400 });
  }
  if (caption && caption.length > 2200) {
    return NextResponse.json({ error: "Caption too long" }, { status: 400 });
  }

  // Validate every file by its REAL signature (not the client MIME type).
  const validated: { file: File; type: "IMAGE" | "VIDEO" }[] = [];
  for (const file of files) {
    const realType = await sniffMime(file);
    const isImage = !!realType && IMAGE_TYPES.includes(realType);
    const isVideo = !!realType && VIDEO_TYPES.includes(realType);
    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: "Unsupported or invalid file. Use a real JPG/PNG/WEBP/GIF or MP4/WEBM." },
        { status: 400 }
      );
    }
    const maxBytes = isImage ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
    if (file.size > maxBytes) {
      return NextResponse.json(
        { error: `File too large. Max ${isImage ? MAX_IMAGE_MB : MAX_VIDEO_MB}MB for ${isImage ? "images" : "videos"}.` },
        { status: 400 }
      );
    }
    validated.push({ file, type: isImage ? "IMAGE" : "VIDEO" });
  }

  // Save all media.
  const urls: string[] = [];
  const types: string[] = [];
  try {
    for (const v of validated) {
      const { url } = await saveMedia(v.file);
      urls.push(url);
      types.push(v.type);
    }
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
    data: {
      authorId: me,
      mediaUrl: urls[0],
      mediaType: types[0],
      mediaUrls: urls,
      mediaTypes: types,
      caption,
    },
    select: { id: true },
  });

  return NextResponse.json({ post }, { status: 201 });
}
