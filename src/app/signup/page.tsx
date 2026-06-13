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
    router.push("/");
    router.refresh();
  }

  const inputCls =
    "w-full rounded-xl border border-zinc-300 px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200";

  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 p-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl ring-1 ring-zinc-100">
        <h1 className="text-center text-3xl font-extrabold tracking-tight text-indigo-600">
          Folo
        </h1>
        <p className="mb-6 mt-1 text-center text-sm text-zinc-500">Create your account</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {serverError && (
            <p className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-600">
              {serverError}
            </p>
          )}
          <div>
            <label htmlFor="displayName" className="mb-1 block text-sm font-medium text-zinc-700">
              Display name
            </label>
            <input id="displayName" {...register("displayName")} className={inputCls} placeholder="Ava Stone" />
            {errors.displayName && (
              <p className="mt-1 text-sm text-red-600">{errors.displayName.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="username" className="mb-1 block text-sm font-medium text-zinc-700">
              Username
            </label>
            <input id="username" {...register("username")} className={inputCls} placeholder="ava" />
            {errors.username && (
              <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-zinc-700">
              Email
            </label>
            <input id="email" type="email" {...register("email")} className={inputCls} placeholder="you@example.com" />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-zinc-700">
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
            className="w-full rounded-xl bg-indigo-600 py-2.5 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {isSubmitting ? "Creating…" : "Sign up"}
          </button>
        </form>

        <GoogleSignIn />

        <p className="mt-6 text-center text-sm text-zinc-500">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-indigo-600 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
