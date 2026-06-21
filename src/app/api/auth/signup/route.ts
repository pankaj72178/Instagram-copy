import { NextResponse } from "next/server";
import { createHash, randomInt } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword, setAuthCookie } from "@/lib/auth";
import { signupSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/ratelimit";
import { sendVerificationOtp } from "@/lib/mailer";

export async function POST(req: Request) {
  try {
    const limited = await rateLimit(req, "signup", 5, 60_000); // 5/min per IP
    if (limited) return limited;

    const body = await req.json().catch(() => null);
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    const { username, displayName, email, password } = parsed.data;

    // Ensure username + email are unique.
    const existing = await prisma.user.findFirst({
      where: { OR: [{ username }, { email: email.toLowerCase() }] },
      select: { username: true, email: true },
    });
    if (existing) {
      const field = existing.username === username ? "Username" : "Email";
      return NextResponse.json({ error: `${field} is already taken` }, { status: 409 });
    }

    // Email-verification code (store only the hash; valid 15 min).
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const codeHash = createHash("sha256").update(code).digest("hex");

    const user = await prisma.user.create({
      data: {
        username,
        displayName,
        email: email.toLowerCase(),
        passwordHash: await hashPassword(password),
        verifyCodeHash: codeHash,
        verifyCodeExp: new Date(Date.now() + 15 * 60 * 1000),
      },
      select: { id: true, username: true, displayName: true, email: true },
    });

    try {
      await sendVerificationOtp(user.email, code);
    } catch (e) {
      console.error("verification email failed:", e);
    }

    await setAuthCookie(user.id);
    return NextResponse.json({ user, needsVerification: true }, { status: 201 });
  } catch (err) {
    console.error("signup error:", err);
    return NextResponse.json({ error: "Could not sign up" }, { status: 500 });
  }
}
