"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { timeAgo } from "@/lib/format";
import { useToast } from "@/components/Toast";
import Avatar from "@/components/Avatar";
import Lightbox from "@/components/Lightbox";
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
  const toast = useToast();
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [comments, setComments] = useState<CommentItem[]>(post.comments);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [mediaBroken, setMediaBroken] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  async function toggleLike() {
    const next = !liked;
    // optimistic
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    try {
      const res = await fetch(`/api/posts/${post.id}/like`, { method: next ? "POST" : "DELETE" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLikeCount(data.count);
    } catch {
      // revert on failure
      setLiked(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
      toast.error("Couldn't update like. Check your connection.");
    }
  }

  async function copyLink() {
    const url = `${window.location.origin}/post/${post.id}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback for non-secure / sandboxed contexts.
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Couldn't copy link");
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
    if (res.ok) {
      toast.success("Post deleted");
      router.refresh();
    } else {
      toast.error("Couldn't delete the post");
    }
  }

  return (
    <article className="overflow-hidden rounded-2xl bg-zinc-900 ring-1 ring-zinc-800">
      {/* header */}
      <div className="flex items-center gap-3 p-3">
        <Link href={`/${post.author.username}`} className="flex items-center gap-2">
          <Avatar url={post.author.avatarUrl} username={post.author.username} size="sm" />
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
      <div className="flex items-center justify-center bg-zinc-800">
        {mediaBroken ? (
          <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 text-zinc-500">
            <span className="text-4xl">🖼️</span>
            <span className="text-sm">Media unavailable</span>
          </div>
        ) : post.mediaType === "VIDEO" ? (
          <video
            src={post.mediaUrl}
            controls
            playsInline
            onError={() => setMediaBroken(true)}
            className="max-h-[70vh] w-full bg-black object-contain"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.mediaUrl}
            alt={post.caption ?? `Post by ${post.author.username}`}
            onClick={() => setZoomed(true)}
            onError={() => setMediaBroken(true)}
            className="max-h-[70vh] w-full cursor-zoom-in object-contain"
          />
        )}
      </div>

      {zoomed && post.mediaType !== "VIDEO" && !mediaBroken && (
        <Lightbox
          src={post.mediaUrl}
          alt={post.caption ?? `Post by ${post.author.username}`}
          onClose={() => setZoomed(false)}
        />
      )}

      {/* actions */}
      <div className="px-3 pt-3">
        <div className="flex items-center gap-4">
          <button onClick={toggleLike} aria-label={liked ? "Unlike" : "Like"} className="flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" className={`h-6 w-6 transition ${liked ? "fill-red-500 text-red-500" : "fill-none text-zinc-200"}`} stroke="currentColor" strokeWidth="2">
              <path d="M12 21s-7-4.6-9.3-9.2C1 8.5 2.7 5 6 5c2 0 3.2 1.2 4 2.3C10.8 6.2 12 5 14 5c3.3 0 5 3.5 3.3 6.8C19 16.4 12 21 12 21z" />
            </svg>
          </button>
          <Link href={`/post/${post.id}`} aria-label="Comments" className="flex items-center gap-1.5 text-zinc-200">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20l1.2-5.2A8.5 8.5 0 1 1 21 11.5z" />
            </svg>
          </Link>
          <button onClick={copyLink} aria-label="Copy link to post" className="ml-auto text-zinc-200 hover:text-indigo-400">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" /><path d="M16 6l-4-4-4 4" /><path d="M12 2v14" />
            </svg>
          </button>
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
            className="flex-1 rounded-full bg-zinc-800 px-4 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <button type="submit" disabled={busy || !text.trim()} className="text-sm font-semibold text-indigo-400 disabled:opacity-40">
            Post
          </button>
        </form>
      </div>
    </article>
  );
}
