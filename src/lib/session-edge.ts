// Edge-safe token verification for middleware (no Prisma / bcrypt / server-only).
import { jwtVerify } from "jose";

export async function verifyTokenEdge(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET)
    );
    return (payload.sub as string) ?? null;
  } catch {
    return null;
  }
}
