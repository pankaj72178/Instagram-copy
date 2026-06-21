import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

// GET /api/collections — my collections (folders).
export async function GET() {
  const me = await getSessionUserId();
  if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });
  const collections = await prisma.collection.findMany({
    where: { userId: me },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });
  return NextResponse.json({ collections });
}

// POST /api/collections { name } — create a collection.
export async function POST(req: Request) {
  const me = await getSessionUserId();
  if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const { name } = (await req.json().catch(() => ({}))) as { name?: string };
  const clean = (name ?? "").trim().slice(0, 50);
  if (!clean) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const count = await prisma.collection.count({ where: { userId: me } });
  if (count >= 50) return NextResponse.json({ error: "Collection limit reached" }, { status: 400 });

  const collection = await prisma.collection.create({
    data: { userId: me, name: clean },
    select: { id: true, name: true },
  });
  return NextResponse.json({ collection }, { status: 201 });
}
