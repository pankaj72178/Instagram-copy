// =====================================================================
// Storage module (isolated). Two backends, chosen automatically:
//   • Vercel Blob  — used when BLOB_READ_WRITE_TOKEN is set (works on Vercel,
//     where the filesystem is read-only). Media persists across deploys.
//   • Local filesystem (/public/uploads) — used in local dev when no Blob
//     token is present.
// Swapping to S3/Cloudinary later = reimplement just these two functions.
// =====================================================================
import "server-only";
import { writeFile, mkdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const UPLOAD_DIR = join(process.cwd(), "public", "uploads");
const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

export type SavedMedia = { url: string };

export async function saveMedia(file: File): Promise<SavedMedia> {
  const ext = EXT[file.type] ?? "bin";
  const name = `${randomUUID()}.${ext}`;

  if (useBlob) {
    // Dynamic import so local dev never needs the package configured.
    const { put } = await import("@vercel/blob");
    const blob = await put(`uploads/${name}`, file, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: false,
    });
    return { url: blob.url };
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(join(UPLOAD_DIR, name), bytes);
  return { url: `/uploads/${name}` };
}

export async function deleteMedia(url: string): Promise<void> {
  try {
    if (url.startsWith("http")) {
      // Blob (or remote) URL.
      if (useBlob) {
        const { del } = await import("@vercel/blob");
        await del(url);
      }
      return;
    }
    if (url.startsWith("/uploads/")) {
      await unlink(join(UPLOAD_DIR, url.replace("/uploads/", "")));
    }
  } catch {
    // already gone / not deletable — ignore
  }
}
