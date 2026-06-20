"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  const inputCls =
    "w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-900";

  // Step 1 — request a code
  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok && res.status === 429) {
        setError("Too many requests. Please wait a minute and try again.");
        return;
      }
      setInfo(`If an account exists for ${email}, a 6-digit code is on its way. Check your inbox (and spam).`);
      setStep(2);
    } finally {
      setBusy(false);
    }
  }

  // Step 2 — verify code + set new password
  async function resetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Couldn't reset your password.");
        return;
      }
      // Reset succeeded and we're now logged in.
      router.push("/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setOtp("");
    await sendCode(new Event("submit") as unknown as React.FormEvent);
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-950 p-6">
      <div className="w-full max-w-sm rounded-2xl bg-zinc-900 p-8 shadow-xl ring-1 ring-zinc-800">
        <h1 className="text-brand text-center text-3xl font-extrabold tracking-tight">Folo</h1>
        <p className="mb-6 mt-1 text-center text-sm text-zinc-400">
          {step === 1 ? "Reset your password" : "Enter the code we emailed you"}
        </p>

        {error && (
          <p className="mb-4 rounded-lg bg-red-950 p-3 text-sm font-medium text-red-300">{error}</p>
        )}

        {step === 1 ? (
          <form onSubmit={sendCode} className="space-y-4">
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={inputCls}
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-indigo-600 py-2.5 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {busy ? "Sending…" : "Send code"}
            </button>
          </form>
        ) : (
          <form onSubmit={resetPassword} className="space-y-4">
            {info && (
              <p className="rounded-lg bg-zinc-800 p-3 text-center text-xs text-zinc-300">{info}</p>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-200">6-digit code</label>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                autoFocus
                className={`${inputCls} text-center text-lg tracking-[0.5em]`}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-200">New password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className={inputCls}
              />
            </div>
            <button
              type="submit"
              disabled={busy || otp.length !== 6}
              className="w-full rounded-xl bg-indigo-600 py-2.5 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {busy ? "Resetting…" : "Reset password"}
            </button>
            <div className="flex items-center justify-between text-sm">
              <button type="button" onClick={() => { setStep(1); setError(""); }} className="text-zinc-400 hover:text-indigo-400 hover:underline">
                ← Change email
              </button>
              <button type="button" onClick={resend} disabled={busy} className="text-zinc-400 hover:text-indigo-400 hover:underline disabled:opacity-50">
                Resend code
              </button>
            </div>
          </form>
        )}

        {step === 1 && (
          <p className="mt-4 rounded-lg bg-zinc-800/60 p-3 text-center text-xs text-zinc-400">
            Signed up with Google? Use <b className="text-zinc-200">Continue with Google</b> on the login page instead — Google accounts don’t have a password.
          </p>
        )}

        <p className="mt-6 text-center text-sm text-zinc-400">
          <Link href="/login" className="font-semibold text-indigo-400 hover:underline">Back to log in</Link>
        </p>
      </div>
    </main>
  );
}
