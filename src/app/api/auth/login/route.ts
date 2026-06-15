import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, setAuthCookie } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/ratelimit";

export async function POST(req: Request) {
  try {
    const limited = rateLimit(req, "login", 10, 60_000); // 10/min per IP
    if (limited) return limited;

    const body = await req.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, passwordHash: true, username: true },
    });
    // Same message whether the user is missing, has no password (Google-only),
    // or the password is wrong.
    if (!user || !user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    await setAuthCookie(user.id);
    return NextResponse.json({ user: { id: user.id, username: user.username } });
  } catch (err) {
    console.error("login error:", err);
    return NextResponse.json({ error: "Could not log in" }, { status: 500 });
  }
}
