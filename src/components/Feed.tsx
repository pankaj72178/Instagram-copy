"use client";

import { useState } from "react";
import PostCard from "./PostCard";
import type { PostCardData } from "@/lib/posts";

export default function Feed({
  initialPosts,
  initialCursor,
  myUsername,
}: {
  initialPosts: PostCardData[];
  initialCursor: string | null;
  myUsername: string;
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);

  async function loadMore() {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/feed?cursor=${cursor}`);
      const data = await res.json();
      setPosts((p) => [...p, ...data.posts]);
      setCursor(data.nextCursor);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {posts.map((p) => (
        <PostCard key={p.id} post={p} myUsername={myUsername} />
      ))}
      {cursor && (
        <button
          onClick={loadMore}
          disabled={loading}
          className="mx-auto block rounded-xl bg-white px-5 py-2.5 text-sm font-semibold ring-1 ring-zinc-200 hover:bg-zinc-100 disabled:opacity-60"
        >
          {loading ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}
