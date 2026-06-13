// =====================================================================
// Storage module (isolated). Picks a backend automatically:
//   1. Vercel Blob   — if BLOB_READ_WRITE_TOKEN is set (best: CDN-backed).
//   2. MongoDB       — otherwise: stores bytes in the DB and serves them via
//      /api/media/[id]. Works on Vercel's read-only filesystem with NO extra
//      setup (uses the database you already have).
// Swap to S3/Cloudinary later by reimplementing just these two functions.
// =====================================================================
import "server-only";
import { prisma } from "@/lib/prisma";

const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

export type SavedMedia = { url: string };

export async function saveMedia(file: File): Promise<SavedMedia> {
  if (useBlob) {
    const { put } = await import("@vercel/blob");
    const { randomUUID } = await import("node:crypto");
    const blob = await put(`uploads/${randomUUID()}`, file, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: true,
    });
    return { url: blob.url };
  }

  // Store the bytes in MongoDB; serve them back through /api/media/[id].
  const bytes = Buffer.from(await file.arrayBuffer());
  const media = await prisma.media.create({
    data: { data: bytes, contentType: file.type },
    select: { id: true },
  });
  return { url: `/api/media/${media.id}` };
}

export async function deleteMedia(url: string): Promise<void> {
  try {
    if (url.startsWith("/api/media/")) {
      const id = url.replace("/api/media/", "");
      await prisma.media.delete({ where: { id } });
      return;
    }
    if (url.startsWith("http") && useBlob) {
      const { del } = await import("@vercel/blob");
      await del(url);
    }
    // "/uploads/..." (committed seed assets) are left in place.
  } catch {
    // already gone / not deletable — ignore
  }
}
