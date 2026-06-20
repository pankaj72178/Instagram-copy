import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId, getCurrentUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
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

// DELETE /api/report { id } — admins dismiss/resolve a report.
export async function DELETE(req: Request) {
  const me = await getCurrentUser();
  if (!me || !isAdminEmail(me.email)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }
  const { id } = (await req.json().catch(() => ({}))) as { id?: string };
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.report.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
}
