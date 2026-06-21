"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function VerifyEmailPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Couldn't verify your email.");
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setError("");
    setInfo("");
    const res = await fetch("/api/auth/resend-verification", { method: "POST" });
    setInfo(res.ok ? "A new code is on its way." : "Couldn't resend. Try again shortly.");
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-950 p-6">
      <div className="w-full max-w-sm rounded-2xl bg-zinc-900 p-8 shadow-xl ring-1 ring-zinc-800">
        <h1 className="text-brand text-center text-3xl font-extrabold tracking-tight">Folo</h1>
        <p className="mb-6 mt-1 text-center text-sm text-zinc-400">Confirm your email</p>

        {error && <p className="mb-4 rounded-lg bg-red-950 p-3 text-sm font-medium text-red-300">{error}</p>}
        {info && <p className="mb-4 rounded-lg bg-zinc-800 p-3 text-center text-sm text-zinc-200">{info}</p>}

        <p className="mb-4 text-center text-sm text-zinc-400">
          We emailed you a 6-digit code. Enter it below to verify your account.
        </p>

        <form onSubmit={verify} className="space-y-4">
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            maxLength={6}
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-center text-lg tracking-[0.5em] text-white outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={busy || code.length !== 6}
            className="btn-gradient w-full rounded-xl py-2.5 font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Verifying…" : "Verify email"}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-sm">
          <button onClick={resend} className="text-zinc-400 hover:text-indigo-400 hover:underline">
            Resend code
          </button>
          <Link href="/" className="text-zinc-400 hover:text-indigo-400 hover:underline">
            Skip for now
          </Link>
        </div>
      </div>
    </main>
  );
}
