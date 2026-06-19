// Email sender. Picks a backend automatically, in order:
//   1. Resend  — if RESEND_API_KEY is set (simplest: one env var, HTTP API,
//      no SMTP/app-password dance). Set EMAIL_FROM to a verified sender.
//   2. Gmail SMTP (nodemailer) — if EMAIL_USER + EMAIL_PASS are set.
//   3. Console  — otherwise logs the link so reset still works in dev.
import "server-only";
import nodemailer from "nodemailer";

const RESET_SUBJECT = "Reset your Folo password";

function resetHtml(link: string) {
  return `
    <div style="font-family:system-ui,Arial,sans-serif;max-width:480px;margin:auto">
      <h2 style="color:#6366f1">Reset your password</h2>
      <p>We received a request to reset your Folo password. This link expires in 1 hour.</p>
      <p><a href="${link}" style="display:inline-block;background:#6366f1;color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none;font-weight:600">Reset password</a></p>
      <p style="color:#888;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
    </div>`;
}

async function sendViaResend(to: string, link: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const from = process.env.EMAIL_FROM || "Folo <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject: RESET_SUBJECT, html: resetHtml(link) }),
  });
  if (!res.ok) {
    console.error("Resend send failed:", res.status, await res.text().catch(() => ""));
    return false;
  }
  return true;
}

async function sendViaSmtp(to: string, link: string): Promise<boolean> {
  const { EMAIL_USER, EMAIL_PASS } = process.env;
  if (!EMAIL_USER || !EMAIL_PASS) return false;
  const t = nodemailer.createTransport({
    service: "gmail",
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
  });
  await t.sendMail({
    from: `"Folo" <${EMAIL_USER}>`,
    to,
    subject: RESET_SUBJECT,
    html: resetHtml(link),
  });
  return true;
}

export async function sendPasswordReset(to: string, link: string) {
  if (await sendViaResend(to, link)) return;
  if (await sendViaSmtp(to, link)) return;
  // No email provider configured — log the link so you can still reset in dev.
  console.log(`🔑 Password reset link for ${to}: ${link}`);
}
