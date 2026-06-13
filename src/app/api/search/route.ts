import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/search?q=term — find users by username or display name.
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") || "").trim();
  if (q.length < 1) return NextResponse.json({ users: [] });

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { username: { contains: q, mode: "insensitive" } },
        { displayName: { contains: q, mode: "insensitive" } },
      ],
    },
    take: 15,
    orderBy: { username: "asc" },
    select: { username: true, displayName: true, avatarUrl: true, isPrivate: true },
  });

  return NextResponse.json({ users });
}
