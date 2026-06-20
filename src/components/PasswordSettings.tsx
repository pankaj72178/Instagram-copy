"use client";

import { useState } from "react";
import { useToast } from "@/components/Toast";

export default function PasswordSettings({ hasPassword }: { hasPassword: boolean }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  // once a Google user sets one, treat it as existing
  const [hasPw, setHasPw] = useState(hasPassword);

  const inputCls =
    "w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Couldn't update password");
        return;
      }
      toast.success(hasPw ? "Password changed" : "Password set — you can now log in with email");
      setHasPw(true);
      setOpen(false);
      setCurrent("");
      setNext("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl bg-zinc-950 p-4 ring-1 ring-zinc-800">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">{hasPw ? "Change password" : "Set a password"}</h3>
          <p className="mt-0.5 text-sm text-zinc-500">
            {hasPw
              ? "Update the password you use to log in."
              : "You signed up with Google. Set a password to also log in with your email."}
          </p>
        </div>
        {!open && (
          <button
            onClick={() => setOpen(true)}
            className="shrink-0 rounded-lg bg-zinc-800 px-3 py-1.5 text-sm font-semibold ring-1 ring-zinc-700 hover:bg-zinc-700"
          >
            {hasPw ? "Change" : "Set"}
          </button>
        )}
      </div>

      {open && (
        <form onSubmit={submit} className="mt-4 space-y-3">
          {hasPw && (
            <input
              type="password"
              required
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              placeholder="Current password"
              autoComplete="current-password"
              className={inputCls}
            />
          )}
          <input
            type="password"
            required
            minLength={6}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder="New password (min 6 chars)"
            autoComplete="new-password"
            className={inputCls}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {busy ? "Saving…" : hasPw ? "Update password" : "Set password"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={busy}
              className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-semibold ring-1 ring-zinc-700 hover:bg-zinc-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
