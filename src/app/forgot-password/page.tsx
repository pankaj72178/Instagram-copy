"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-950 p-6">
      <div className="w-full max-w-sm rounded-2xl bg-zinc-900 p-8 shadow-xl ring-1 ring-zinc-800">
        <h1 className="text-center text-3xl font-extrabold tracking-tight text-indigo-400">Folo</h1>
        <p className="mb-6 mt-1 text-center text-sm text-zinc-400">Reset your password</p>

        {sent ? (
          <p className="rounded-lg bg-zinc-800 p-4 text-center text-sm text-zinc-200">
            If an account exists for <b>{email}</b>, a reset link has been sent. Check your inbox.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
            <button type="submit" disabled={busy} className="w-full rounded-xl bg-indigo-600 py-2.5 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60">
              {busy ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-zinc-400">
          <Link href="/login" className="font-semibold text-indigo-400 hover:underline">Back to log in</Link>
        </p>
      </div>
    </main>
  );
}
