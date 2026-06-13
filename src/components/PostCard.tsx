"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { timeAgo } from "@/lib/format";
import type { PostCardData, CommentItem } from "@/lib/posts";

export type { PostCardData, CommentItem };

export default function PostCard({
  post,
  myUsername,
  showAllComments = false,
}: {
  post: PostCardData;
  myUsername: string;
  showAllComments?: boolean;
}) {
  const router = useRouter();
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [comments, setComments] = useState<CommentItem[]>(post.comments);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function toggleLike() {
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    const res = await fetch(`/api/posts/${post.id}/like`, { method: next ? "POST" : "DELETE" });
    if (res.ok) {
      const data = await res.json();
      setLikeCount(data.count);
    }
  }

  async function addComment(e: React.FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: value }),
      });
      const data = await res.json();
      if (res.ok) {
        setComments((c) => [...c, data.comment]);
        setCommentCount((n) => n + 1);
        setText("");
      }
    } finally {
      setBusy(false);
    }
  }

  async function deleteComment(id: string) {
    const res = await fetch(`/api/comments/${id}`, { method: "DELETE" });
    if (res.ok) {
      setComments((c) => c.filter((x) => x.id !== id));
      setCommentCount((n) => Math.max(0, n - 1));
    }
  }

  async function deletePost() {
    if (!confirm("Delete this post?")) return;
    const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  return (
    <article className="overflow-hidden rounded-2xl bg-white ring-1 ring-zinc-200">
      {/* header */}
      <div className="flex items-center gap-3 p-3">
        <Link href={`/${post.author.username}`} className="flex items-center gap-2">
          <Avatar url={post.author.avatarUrl} username={post.author.username} />
          <span className="text-sm font-semibold">{post.author.username}</span>
        </Link>
        <span className="text-xs text-zinc-400">· {timeAgo(post.createdAt)}</span>
        {post.isOwner && (
          <button onClick={deletePost} className="ml-auto text-xs font-medium text-red-500 hover:underline">
            Delete
          </button>
        )}
      </div>

      {/* media */}
      <div className="bg-zinc-100">
        {post.mediaType === "VIDEO" ? (
          <video src={post.mediaUrl} controls playsInline className="max-h-[70vh] w-full bg-black object-contain" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.mediaUrl} alt={post.caption ?? `Post by ${post.author.username}`} className="max-h-[70vh] w-full object-contain" />
        )}
      </div>

      {/* actions */}
      <div className="px-3 pt-3">
        <div className="flex items-center gap-4">
          <button onClick={toggleLike} aria-label={liked ? "Unlike" : "Like"} className="flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" className={`h-6 w-6 ${liked ? "fill-red-500 text-red-500" : "fill-none text-zinc-700"}`} stroke="currentColor" strokeWidth="2">
              <path d="M12 21s-7-4.6-9.3-9.2C1 8.5 2.7 5 6 5c2 0 3.2 1.2 4 2.3C10.8 6.2 12 5 14 5c3.3 0 5 3.5 3.3 6.8C19 16.4 12 21 12 21z" />
            </svg>
          </button>
          <Link href={`/post/${post.id}`} aria-label="Comments" className="flex items-center gap-1.5 text-zinc-700">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20l1.2-5.2A8.5 8.5 0 1 1 21 11.5z" />
            </svg>
          </Link>
        </div>
        <p className="mt-2 text-sm font-semibold">{likeCount} {likeCount === 1 ? "like" : "likes"}</p>
        {post.caption && (
          <p className="mt-1 text-sm">
            <Link href={`/${post.author.username}`} className="font-semibold">{post.author.username}</Link>{" "}
            <span className="whitespace-pre-line">{post.caption}</span>
          </p>
        )}
      </div>

      {/* comments */}
      <div className="px-3 pb-3 pt-2">
        {!showAllComments && commentCount > comments.length && (
          <Link href={`/post/${post.id}`} className="text-sm text-zinc-400 hover:underline">
            View all {commentCount} comments
          </Link>
        )}
        <ul className="mt-1 space-y-1">
          {comments.map((c) => (
            <li key={c.id} className="group flex items-start gap-1 text-sm">
              <span className="flex-1">
                <Link href={`/${c.user.username}`} className="font-semibold">{c.user.username}</Link>{" "}
                <span>{c.text}</span>
              </span>
              {(c.user.username === myUsername || post.isOwner) && (
                <button onClick={() => deleteComment(c.id)} className="text-xs text-zinc-300 opacity-0 transition group-hover:opacity-100 hover:text-red-500">
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>

        <form onSubmit={addComment} className="mt-2 flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a comment…"
            maxLength={500}
            className="flex-1 rounded-full bg-zinc-100 px-4 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <button type="submit" disabled={busy || !text.trim()} className="text-sm font-semibold text-indigo-600 disabled:opacity-40">
            Post
          </button>
        </form>
      </div>
    </article>
  );
}

function Avatar({ url, username }: { url: string | null; username: string }) {
  if (url) {
    return <Image src={url} alt={username} width={32} height={32} unoptimized className="h-8 w-8 rounded-full object-cover ring-1 ring-zinc-200" />;
  }
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600">
      {username[0]?.toUpperCase()}
    </span>
  );
}
