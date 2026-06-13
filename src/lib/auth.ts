// =====================================================================
// Auth module (isolated) — JWT in httpOnly cookies + bcrypt.
// All auth logic lives here so it's easy to swap/extend later.
// Uses `jose` so token verification also works in Edge middleware.
// =====================================================================
import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { TOKEN_NAME } from "@/lib/constants";

export { TOKEN_NAME };
const ALG = "HS256";

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("Missing JWT_SECRET environment variable");
  return new TextEncoder().encode(s);
}

// ---------- password hashing ----------
export function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}
export function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

// ---------- JWT ----------
export async function signToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function verifyToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return (payload.sub as string) ?? null;
  } catch {
    return null;
  }
}

// ---------- cookie helpers ----------
export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 7, // 7 days
};

// Set the auth cookie (call from a Route Handler / Server Action).
export async function setAuthCookie(userId: string) {
  const token = await signToken(userId);
  (await cookies()).set(TOKEN_NAME, token, cookieOptions);
}
export async function clearAuthCookie() {
  (await cookies()).set(TOKEN_NAME, "", { ...cookieOptions, maxAge: 0 });
}

// ---------- session / current user ----------
export async function getSessionUserId(): Promise<string | null> {
  const token = (await cookies()).get(TOKEN_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function getCurrentUser() {
  const userId = await getSessionUserId();
  if (!userId) return null;
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      displayName: true,
      email: true,
      avatarUrl: true,
      bio: true,
      isPrivate: true,
    },
  });
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
