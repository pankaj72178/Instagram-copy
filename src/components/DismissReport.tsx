"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

export default function DismissReport({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function dismiss() {
    setBusy(true);
    try {
      const res = await fetch("/api/report", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      toast.success("Report dismissed");
      router.refresh();
    } catch {
      toast.error("Couldn't dismiss report");
      setBusy(false);
    }
  }

  return (
    <button
      onClick={dismiss}
      disabled={busy}
      className="shrink-0 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-semibold ring-1 ring-zinc-700 hover:bg-zinc-700 disabled:opacity-60"
    >
      {busy ? "…" : "Dismiss"}
    </button>
  );
}
