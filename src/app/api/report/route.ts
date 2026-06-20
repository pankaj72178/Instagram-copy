import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";

// POST /api/report { targetType: "user"|"post", targetId, reason? }
export async function POST(req: Request) {
  const limited = await rateLimit(req, "report", 20, 60_000);
  if (limited) return limited;

  const me = await getSessionUserId();
  if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const { targetType, targetId, reason } = (await req.json().catch(() => ({}))) as {
    targetType?: string;
    targetId?: string;
    reason?: string;
  };
  if (!targetId || (targetType !== "user" && targetType !== "post")) {
    return NextResponse.json({ error: "Invalid report" }, { status: 400 });
  }

  await prisma.report.create({
    data: {
      reporterId: me,
      targetType,
      targetId,
      reason: (reason ?? "").trim().slice(0, 500) || null,
    },
  });
  return NextResponse.json({ ok: true });
}
