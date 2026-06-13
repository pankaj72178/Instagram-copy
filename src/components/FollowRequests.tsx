"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

type Req = {
  id: string;
  follower: { username: string; displayName: string; avatarUrl: string | null };
};

export default function FollowRequests({ requests }: { requests: Req[] }) {
  const router = useRouter();
  const [items, setItems] = useState(requests);
  const [busy, setBusy] = useState<string | null>(null);

  async function act(id: string, action: "accept" | "reject") {
    setBusy(id);
    try {
      const res = await fetch("/api/follow/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      if (res.ok) {
        setItems((x) => x.filter((r) => r.id !== id));
        router.refresh();
      }
    } finally {
      setBusy(null);
    }
  }

  if (items.length === 0) {
    return <p className="text-sm text-zinc-400">No pending requests.</p>;
  }

  return (
    <ul className="space-y-3">
      {items.map((r) => (
        <li key={r.id} className="flex items-center gap-3">
          <Link href={`/${r.follower.username}`}>
            {r.follower.avatarUrl ? (
              <Image src={r.follower.avatarUrl} alt={r.follower.username} width={40} height={40} unoptimized className="h-10 w-10 rounded-full object-cover ring-1 ring-zinc-800" />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-950 font-bold text-indigo-400">
                {r.follower.username[0]?.toUpperCase()}
              </span>
            )}
          </Link>
          <div className="flex-1 text-sm">
            <Link href={`/${r.follower.username}`} className="font-semibold">{r.follower.username}</Link>
            <p className="text-zinc-500">wants to follow you</p>
          </div>
          <button onClick={() => act(r.id, "accept")} disabled={busy === r.id} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
            Accept
          </button>
          <button onClick={() => act(r.id, "reject")} disabled={busy === r.id} className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm font-semibold ring-1 ring-zinc-800 hover:bg-zinc-700 disabled:opacity-60">
            Reject
          </button>
        </li>
      ))}
    </ul>
  );
}
