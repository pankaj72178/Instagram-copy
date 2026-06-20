// Symmetric encryption for message text at rest (AES-256-GCM).
// The key is derived from DM_ENCRYPTION_KEY (preferred) or JWT_SECRET so it
// works with zero extra setup. Encrypted values are tagged "enc:v1:" so old
// plaintext rows keep working (decrypt returns them unchanged).
import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const PREFIX = "enc:v1:";

let cachedKey: Buffer | null = null;
function key(): Buffer {
  if (cachedKey) return cachedKey;
  const secret = process.env.DM_ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing DM_ENCRYPTION_KEY/JWT_SECRET for message encryption");
  // Derive a stable 32-byte key from the secret.
  cachedKey = scryptSync(secret, "folo-dm-v1", 32);
  return cachedKey;
}

export function encryptText(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // enc:v1:<iv>.<tag>.<ciphertext>  (all base64url)
  return (
    PREFIX +
    [iv.toString("base64url"), tag.toString("base64url"), ct.toString("base64url")].join(".")
  );
}

export function decryptText(value: string): string {
  if (!value.startsWith(PREFIX)) return value; // legacy plaintext
  try {
    const [ivB, tagB, ctB] = value.slice(PREFIX.length).split(".");
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivB, "base64url"));
    decipher.setAuthTag(Buffer.from(tagB, "base64url"));
    const pt = Buffer.concat([decipher.update(Buffer.from(ctB, "base64url")), decipher.final()]);
    return pt.toString("utf8");
  } catch {
    return "🔒 (couldn't decrypt)";
  }
}
