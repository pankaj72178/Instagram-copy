// Email sender. Picks a backend automatically, in order:
//   1. Resend  — if RESEND_API_KEY is set (simplest: one env var, HTTP API,
//      no SMTP/app-password dance). Set EMAIL_FROM to a verified sender.
//   2. Gmail SMTP (nodemailer) — if EMAIL_USER + EMAIL_PASS are set.
//   3. Console  — otherwise logs the link so reset still works in dev.
import "server-only";
import nodemailer from "nodemailer";

// --- Generic delivery: tries Resend, then Gmail SMTP, else returns false ---
async function sendViaResend(to: string, subject: string, html: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const from = process.env.EMAIL_FROM || "Folo <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) {
    console.error("Resend send failed:", res.status, await res.text().catch(() => ""));
    return false;
  }
  return true;
}

async function sendViaSmtp(to: string, subject: string, html: string): Promise<boolean> {
  const { EMAIL_USER, EMAIL_PASS } = process.env;
  if (!EMAIL_USER || !EMAIL_PASS) return false;
  const t = nodemailer.createTransport({
    service: "gmail",
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
  });
  await t.sendMail({ from: `"Folo" <${EMAIL_USER}>`, to, subject, html });
  return true;
}

async function deliver(to: string, subject: string, html: string): Promise<boolean> {
  if (await sendViaResend(to, subject, html)) return true;
  if (await sendViaSmtp(to, subject, html)) return true;
  return false;
}

function otpHtml(code: string) {
  return `
    <div style="font-family:system-ui,Arial,sans-serif;max-width:480px;margin:auto">
      <h2 style="color:#6366f1">Your Folo verification code</h2>
      <p>Use this code to reset your password. It expires in 10 minutes.</p>
      <p style="font-size:34px;font-weight:800;letter-spacing:8px;color:#111;background:#f4f4f5;border-radius:12px;padding:16px;text-align:center">${code}</p>
      <p style="color:#888;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
    </div>`;
}

// Sends the 6-digit password-reset code. Falls back to logging it in dev.
export async function sendPasswordOtp(to: string, code: string) {
  const sent = await deliver(to, "Your Folo password reset code", otpHtml(code));
  if (!sent) {
    // No email provider configured — log the code so you can still reset in dev.
    console.log(`🔑 Password reset code for ${to}: ${code}`);
  }
}
