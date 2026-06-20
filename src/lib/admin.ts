// Admin gating. Set ADMIN_EMAILS in the environment (comma-separated) to grant
// access to the moderation dashboard. No admins until it's configured.
import "server-only";

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const admins = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.toLowerCase());
}
