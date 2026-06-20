import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { blockedUserIds } from "@/lib/access";

// GET /api/search?q=term — find users by username or display name (excluding blocked).
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") || "").trim();
  if (q.length < 1) return NextResponse.json({ users: [] });

  const me = await getSessionUserId();
  const blocked = me ? await blockedUserIds(me) : [];

  const users = await prisma.user.findMany({
    where: {
      AND: [
        {
          OR: [
            { username: { contains: q, mode: "insensitive" } },
            { displayName: { contains: q, mode: "insensitive" } },
          ],
        },
        ...(blocked.length ? [{ id: { notIn: blocked } }] : []),
      ],
    },
    take: 15,
    orderBy: { username: "asc" },
    select: { username: true, displayName: true, avatarUrl: true, isPrivate: true },
  });

  return NextResponse.json({ users });
}
