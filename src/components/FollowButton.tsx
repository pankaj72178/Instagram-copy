"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

type State = "following" | "requested" | "none";

export default function FollowButton({
  username,
  initialState,
  followsMe,
}: {
  username: string;
  initialState: State;
  followsMe: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [state, setState] = useState<State>(initialState);
  const [busy, setBusy] = useState(false);

  async function act() {
    const prev = state;
    setBusy(true);
    // optimistic: assume success (server confirms exact PENDING/ACCEPTED state)
    setState(prev === "none" ? "following" : "none");
    try {
      if (prev === "none") {
        const res = await fetch("/api/follow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error);
        setState(data.state); // "following" or "requested" (private account)
      } else {
        // following -> unfollow, requested -> cancel
        const res = await fetch("/api/follow", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }),
        });
        if (!res.ok) throw new Error();
        setState("none");
      }
      router.refresh(); // refresh counts / private gate
    } catch {
      setState(prev); // revert
      toast.error("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const label =
    state === "following"
      ? "Following"
      : state === "requested"
        ? "Requested"
        : followsMe
          ? "Follow back"
          : "Follow";

  const primary = state === "none";
  return (
    <button
      onClick={act}
      disabled={busy}
      aria-label={label}
      className={`rounded-lg px-5 py-1.5 text-sm font-semibold transition disabled:opacity-60 ${
        primary
          ? "bg-indigo-600 text-white hover:bg-indigo-700"
          : "bg-zinc-800 text-zinc-100 ring-1 ring-zinc-800 hover:bg-zinc-700"
      }`}
    >
      {busy ? "…" : label}
    </button>
  );
}
