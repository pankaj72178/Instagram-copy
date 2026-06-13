"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
  const [state, setState] = useState<State>(initialState);
  const [busy, setBusy] = useState(false);

  async function act() {
    setBusy(true);
    try {
      if (state === "none") {
        const res = await fetch("/api/follow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }),
        });
        const data = await res.json();
        if (res.ok) setState(data.state);
      } else {
        // following -> unfollow, requested -> cancel
        const res = await fetch("/api/follow", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }),
        });
        if (res.ok) setState("none");
      }
      router.refresh(); // refresh counts / private gate
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
          : "bg-zinc-100 text-zinc-800 ring-1 ring-zinc-200 hover:bg-zinc-200"
      }`}
    >
      {busy ? "…" : label}
    </button>
  );
}
