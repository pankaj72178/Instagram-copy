"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema, type SignupInput } from "@/lib/validation";
import GoogleSignIn from "@/components/GoogleSignIn";

export default function SignupPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({ resolver: zodResolver(signupSchema) });

  async function onSubmit(values: SignupInput) {
    setServerError("");
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setServerError(data.error || "Sign up failed");
      return;
    }
    // New email/password accounts go straight to email verification.
    router.push(data.needsVerification ? "/verify-email" : "/");
    router.refresh();
  }

  const inputCls =
    "w-full rounded-xl border border-zinc-700 px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200";

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-zinc-950 p-6">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-indigo-600/30 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-32 right-1/4 h-80 w-80 rounded-full bg-fuchsia-600/20 blur-[120px]" />
      <div className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-zinc-900/60 p-8 shadow-2xl backdrop-blur-xl">
        <h1 className="text-brand text-center text-4xl font-extrabold tracking-tight">
          Folo
        </h1>
        <p className="mb-6 mt-1 text-center text-sm text-zinc-400">Create your account</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {serverError && (
            <p className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-600">
              {serverError}
            </p>
          )}
          <div>
            <label htmlFor="displayName" className="mb-1 block text-sm font-medium text-zinc-200">
              Display name
            </label>
            <input id="displayName" {...register("displayName")} className={inputCls} placeholder="Ava Stone" />
            {errors.displayName && (
              <p className="mt-1 text-sm text-red-600">{errors.displayName.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="username" className="mb-1 block text-sm font-medium text-zinc-200">
              Username
            </label>
            <input id="username" {...register("username")} className={inputCls} placeholder="ava" />
            {errors.username && (
              <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-zinc-200">
              Email
            </label>
            <input id="email" type="email" {...register("email")} className={inputCls} placeholder="you@example.com" />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-zinc-200">
              Password
            </label>
            <input id="password" type="password" {...register("password")} className={inputCls} placeholder="At least 6 characters" />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-gradient w-full rounded-xl py-2.5 font-semibold text-white disabled:opacity-60"
          >
            {isSubmitting ? "Creating…" : "Sign up"}
          </button>
        </form>

        <GoogleSignIn />

        <p className="mt-6 text-center text-sm text-zinc-500">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-indigo-400 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
