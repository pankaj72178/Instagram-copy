import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, setAuthCookie } from "@/lib/auth";
import { signupSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/ratelimit";

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

    const user = await prisma.user.create({
      data: {
        username,
        displayName,
        email: email.toLowerCase(),
        passwordHash: await hashPassword(password),
      },
      select: { id: true, username: true, displayName: true },
    });

    await setAuthCookie(user.id);
    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    console.error("signup error:", err);
    return NextResponse.json({ error: "Could not sign up" }, { status: 500 });
  }
}
