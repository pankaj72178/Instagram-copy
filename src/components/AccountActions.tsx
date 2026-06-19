"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AccountActions() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function deleteAccount() {
    setError("");
    setDeleting(true);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Could not delete your account. Please try again.");
        return;
      }
      router.push("/signup");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="mt-10 space-y-4">
      <h2 className="text-lg font-semibold text-zinc-200">Account</h2>

      {/* Log out */}
      <button
        onClick={logout}
        disabled={loggingOut}
        className="w-full rounded-xl bg-zinc-800 py-2.5 font-semibold text-zinc-100 ring-1 ring-zinc-700 transition hover:bg-zinc-700 disabled:opacity-60"
      >
        {loggingOut ? "Logging out…" : "Log out"}
      </button>

      {/* Danger zone */}
      <div className="rounded-xl border border-red-900/60 bg-red-950/30 p-4">
        <h3 className="font-semibold text-red-300">Delete account</h3>
        <p className="mt-1 text-sm text-zinc-400">
          This permanently deletes your profile, posts, comments, likes and followers.
          This can’t be undone.
        </p>

        {!confirming ? (
          <button
            onClick={() => setConfirming(true)}
            className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Delete my account
          </button>
        ) : (
          <div className="mt-4 space-y-3">
            <label className="block text-sm text-zinc-300">
              Type <span className="font-mono font-bold text-red-300">DELETE</span> to confirm
            </label>
            <input
              autoFocus
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-red-500 focus:ring-2 focus:ring-red-900"
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={deleteAccount}
                disabled={confirmText !== "DELETE" || deleting}
                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Permanently delete"}
              </button>
              <button
                onClick={() => {
                  setConfirming(false);
                  setConfirmText("");
                  setError("");
                }}
                disabled={deleting}
                className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-100 ring-1 ring-zinc-700 transition hover:bg-zinc-700 disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
