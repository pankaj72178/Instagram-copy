"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

export default function ProfileActions({
  username,
  initialBlocked,
}: {
  username: string;
  initialBlocked: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [blocked, setBlocked] = useState(initialBlocked);
  const [busy, setBusy] = useState(false);

  async function toggleBlock() {
    setBusy(true);
    setOpen(false);
    const next = !blocked;
    try {
      const res = await fetch("/api/block", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      if (!res.ok) throw new Error();
      setBlocked(next);
      toast.success(next ? `Blocked @${username}` : `Unblocked @${username}`);
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function report() {
    setOpen(false);
    const reason = window.prompt(`Report @${username}? Optionally add a reason:`);
    if (reason === null) return; // cancelled
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType: "user", targetId: username, reason }),
      });
      if (!res.ok) throw new Error();
      toast.success("Report submitted. Thanks for keeping Folo safe.");
    } catch {
      toast.error("Couldn't submit the report");
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="More options"
        className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm font-semibold ring-1 ring-zinc-700 hover:bg-zinc-700"
      >
        •••
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl bg-zinc-900 py-1 shadow-xl ring-1 ring-zinc-700">
            <button
              onClick={report}
              className="block w-full px-4 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
            >
              Report
            </button>
            <button
              onClick={toggleBlock}
              disabled={busy}
              className="block w-full px-4 py-2 text-left text-sm font-medium text-red-400 hover:bg-zinc-800 disabled:opacity-60"
            >
              {blocked ? "Unblock" : "Block"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
