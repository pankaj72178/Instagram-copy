// Email sender (nodemailer). Configured via EMAIL_USER + EMAIL_PASS (Gmail App
// Password recommended). If those aren't set, it logs the link to the server
// console instead of sending — so password reset still works in dev/without SMTP.
import "server-only";
import nodemailer from "nodemailer";

function transporter() {
  const { EMAIL_USER, EMAIL_PASS } = process.env;
  if (!EMAIL_USER || !EMAIL_PASS) return null;
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
  });
}

export async function sendPasswordReset(to: string, link: string) {
  const t = transporter();
  if (!t) {
    // No SMTP configured — log the link so you can still reset in dev.
    console.log(`🔑 Password reset link for ${to}: ${link}`);
    return;
  }
  await t.sendMail({
    from: `"Folo" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Reset your Folo password",
    html: `
      <div style="font-family:system-ui,Arial,sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#6366f1">Reset your password</h2>
        <p>We received a request to reset your Folo password. This link expires in 1 hour.</p>
        <p><a href="${link}" style="display:inline-block;background:#6366f1;color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none;font-weight:600">Reset password</a></p>
        <p style="color:#888;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
      </div>`,
  });
}
