// Verify a file's ACTUAL type from its magic bytes (signature), not the
// client-supplied MIME (which can be spoofed). Returns the detected MIME, or
// null if it isn't a supported image/video.
import "server-only";

export async function sniffMime(file: File): Promise<string | null> {
  const buf = Buffer.from(await file.slice(0, 16).arrayBuffer());
  const hex = buf.toString("hex").toUpperCase();
  const ascii = buf.toString("latin1");

  if (hex.startsWith("FFD8FF")) return "image/jpeg";
  if (hex.startsWith("89504E470D0A1A0A")) return "image/png";
  if (ascii.startsWith("GIF8")) return "image/gif";
  if (ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WEBP") return "image/webp";
  if (ascii.slice(4, 8) === "ftyp") return "video/mp4";
  if (hex.startsWith("1A45DFA3")) return "video/webm";
  return null;
}
