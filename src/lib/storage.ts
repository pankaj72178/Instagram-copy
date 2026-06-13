// =====================================================================
// Storage module (isolated) — saves uploaded media to the local filesystem
// under /public/uploads for development. To switch to S3/Cloudinary later,
// reimplement saveMedia()/deleteMedia() here; nothing else needs to change.
// =====================================================================
import "server-only";
import { writeFile, mkdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const UPLOAD_DIR = join(process.cwd(), "public", "uploads");

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

export type SavedMedia = { url: string };

/**
 * Persist an uploaded File and return its public URL (e.g. "/uploads/abc.jpg").
 */
export async function saveMedia(file: File): Promise<SavedMedia> {
  const ext = EXT[file.type] ?? "bin";
  const name = `${randomUUID()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(join(UPLOAD_DIR, name), bytes);

  return { url: `/uploads/${name}` };
}

/**
 * Delete a previously-saved media file by its public URL. Best-effort.
 */
export async function deleteMedia(url: string): Promise<void> {
  if (!url.startsWith("/uploads/")) return;
  const name = url.replace("/uploads/", "");
  try {
    await unlink(join(UPLOAD_DIR, name));
  } catch {
    // file may already be gone — ignore
  }
}
