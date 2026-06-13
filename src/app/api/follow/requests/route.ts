import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

// GET /api/follow/requests — incoming pending follow requests (people who want
// to follow ME).
export async function GET() {
  const me = await getSessionUserId();
  if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const requests = await prisma.follow.findMany({
    where: { followingId: me, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      follower: { select: { username: true, displayName: true, avatarUrl: true } },
    },
  });
  return NextResponse.json({ requests });
}

// POST /api/follow/requests { id, action: "accept" | "reject" }
export async function POST(req: Request) {
  const me = await getSessionUserId();
  if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const { id, action } = (await req.json().catch(() => ({}))) as {
    id?: string;
    action?: "accept" | "reject";
  };
  if (!id || (action !== "accept" && action !== "reject")) {
    return NextResponse.json({ error: "id and valid action required" }, { status: 400 });
  }

  // Make sure this request is addressed to me and still pending.
  const reqRow = await prisma.follow.findFirst({
    where: { id, followingId: me, status: "PENDING" },
    select: { id: true },
  });
  if (!reqRow) return NextResponse.json({ error: "Request not found" }, { status: 404 });

  if (action === "accept") {
    await prisma.follow.update({ where: { id }, data: { status: "ACCEPTED" } });
  } else {
    await prisma.follow.delete({ where: { id } });
  }
  return NextResponse.json({ ok: true });
}
