"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

type Result = {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isPrivate: boolean;
};

export default function SearchBox() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`);
        const data = await res.json();
        setResults(data.users || []);
      } finally {
        setLoading(false);
      }
    }, 250); // debounce
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="mb-6">
      <div className="relative">
        <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
        </svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search people…"
          aria-label="Search people"
          className="w-full rounded-xl bg-zinc-900 py-2.5 pl-10 pr-4 text-sm ring-1 ring-zinc-800 outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {q.trim() && (
        <div className="mt-2 overflow-hidden rounded-xl bg-zinc-900 ring-1 ring-zinc-800">
          {loading && results.length === 0 ? (
            <p className="p-4 text-sm text-zinc-500">Searching…</p>
          ) : results.length === 0 ? (
            <p className="p-4 text-sm text-zinc-500">No users found.</p>
          ) : (
            <ul className="divide-y divide-zinc-800">
              {results.map((u) => (
                <li key={u.username}>
                  <Link href={`/${u.username}`} className="flex items-center gap-3 p-3 hover:bg-zinc-800">
                    {u.avatarUrl ? (
                      <Image src={u.avatarUrl} alt={u.username} width={40} height={40} unoptimized className="h-10 w-10 rounded-full object-cover ring-1 ring-zinc-800" />
                    ) : (
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-950 font-bold text-indigo-400">
                        {u.username[0]?.toUpperCase()}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1 text-sm font-semibold">
                        {u.username}
                        {u.isPrivate && <span className="text-xs text-zinc-500">🔒</span>}
                      </span>
                      <span className="block truncate text-sm text-zinc-400">{u.displayName}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
