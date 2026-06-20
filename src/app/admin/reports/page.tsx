import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { timeAgo } from "@/lib/format";
import DismissReport from "@/components/DismissReport";

export const dynamic = "force-dynamic";

// /admin/reports — moderation queue. Visible only to ADMIN_EMAILS.
export default async function AdminReportsPage() {
  const me = await getCurrentUser();
  if (!me || !isAdminEmail(me.email)) notFound();

  const reports = await prisma.report.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      targetType: true,
      targetId: true,
      reason: true,
      createdAt: true,
      reporter: { select: { username: true } },
    },
  });

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
      <h1 className="mb-1 text-2xl font-bold">Moderation</h1>
      <p className="mb-6 text-sm text-zinc-500">{reports.length} open report{reports.length === 1 ? "" : "s"}</p>

      {reports.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-20 text-center">
          <span className="text-4xl">✅</span>
          <p className="font-semibold">No open reports</p>
          <p className="text-sm text-zinc-500">You’re all caught up.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {reports.map((r) => {
            const targetHref =
              r.targetType === "post" ? `/post/${r.targetId}` : `/${r.targetId}`;
            const targetLabel =
              r.targetType === "post" ? `post ${r.targetId}` : `@${r.targetId}`;
            return (
              <li key={r.id} className="flex items-start gap-3 rounded-xl bg-zinc-900 p-4 ring-1 ring-zinc-800">
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <Link href={`/${r.reporter.username}`} className="font-semibold text-indigo-400 hover:underline">
                      @{r.reporter.username}
                    </Link>{" "}
                    reported{" "}
                    <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs font-medium uppercase text-zinc-400">
                      {r.targetType}
                    </span>{" "}
                    <Link href={targetHref} className="font-medium text-zinc-100 hover:underline">
                      {targetLabel}
                    </Link>
                  </p>
                  {r.reason && <p className="mt-1 text-sm text-zinc-400">“{r.reason}”</p>}
                  <p className="mt-1 text-xs text-zinc-500">{timeAgo(r.createdAt)}</p>
                </div>
                <DismissReport id={r.id} />
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
