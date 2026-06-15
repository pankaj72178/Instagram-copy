"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") || "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!token) return setError("Missing reset token.");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not reset password");
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <p className="rounded-lg bg-red-950 p-3 text-sm font-medium text-red-300">{error}</p>}
      <input
        type="password"
        required
        minLength={6}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="New password (min 6 chars)"
        className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
      />
      <button type="submit" disabled={busy} className="w-full rounded-xl bg-indigo-600 py-2.5 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60">
        {busy ? "Resetting…" : "Reset password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-950 p-6">
      <div className="w-full max-w-sm rounded-2xl bg-zinc-900 p-8 shadow-xl ring-1 ring-zinc-800">
        <h1 className="text-center text-3xl font-extrabold tracking-tight text-indigo-400">Folo</h1>
        <p className="mb-6 mt-1 text-center text-sm text-zinc-400">Choose a new password</p>
        <Suspense fallback={null}>
          <ResetForm />
        </Suspense>
        <p className="mt-6 text-center text-sm text-zinc-400">
          <Link href="/login" className="font-semibold text-indigo-400 hover:underline">Back to log in</Link>
        </p>
      </div>
    </main>
  );
}
