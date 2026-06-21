"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { timeAgo } from "@/lib/format";
import { useToast } from "@/components/Toast";
import Avatar from "@/components/Avatar";
import Lightbox from "@/components/Lightbox";
import Linkify from "@/components/Linkify";
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
  const [bookmarked, setBookmarked] = useState(post.bookmarkedByMe);
  const [comments, setComments] = useState<CommentItem[]>(post.comments);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [mediaBroken, setMediaBroken] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [burstKey, setBurstKey] = useState(0); // >0 shows the heart burst
  const [bounceKey, setBounceKey] = useState(0);
  // caption editing (owner only)
  const [caption, setCaption] = useState(post.caption ?? "");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(caption);
  const lastTap = useRef(0);
  // carousel
  const slides = post.mediaUrls.map((url, i) => ({ url, type: post.mediaTypes[i] ?? post.mediaType }));
  const [slide, setSlide] = useState(0);
  const cur = slides[Math.min(slide, slides.length - 1)];

  function bounce() {
    setBounceKey((k) => k + 1);
  }

  async function toggleLike() {
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    if (next) bounce();
    try {
      const res = await fetch(`/api/posts/${post.id}/like`, { method: next ? "POST" : "DELETE" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLikeCount(data.count);
    } catch {
      setLiked(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
      toast.error("Couldn't update like. Check your connection.");
    }
  }

  // Double-tap → like + heart burst. Single tap → open the lightbox.
  function onImageTap() {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      lastTap.current = 0;
      setBurstKey((k) => k + 1);
      if (!liked) toggleLike();
      else bounce();
    } else {
      lastTap.current = now;
      window.setTimeout(() => {
        if (lastTap.current && Date.now() - lastTap.current >= 280) {
          lastTap.current = 0;
          setZoomed(true);
        }
      }, 290);
    }
  }

  async function toggleBookmark() {
    const next = !bookmarked;
    setBookmarked(next);
    try {
      const res = await fetch(`/api/posts/${post.id}/bookmark`, { method: next ? "POST" : "DELETE" });
      if (!res.ok) throw new Error();
      toast.success(next ? "Saved" : "Removed from saved");
    } catch {
      setBookmarked(!next);
      toast.error("Couldn't update saved posts");
    }
  }

  async function copyLink() {
    const url = `${window.location.origin}/post/${post.id}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
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

  async function saveCaption() {
    setBusy(true);
    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption: draft }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Couldn't update caption");
        return;
      }
      setCaption(draft);
      setEditing(false);
      toast.success("Caption updated");
    } finally {
      setBusy(false);
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

  async function reportPost() {
    const reason = window.prompt("Report this post? Optionally add a reason:");
    if (reason === null) return;
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType: "post", targetId: post.id, reason }),
      });
      if (!res.ok) throw new Error();
      toast.success("Report submitted. Thanks for keeping Folo safe.");
    } catch {
      toast.error("Couldn't submit the report");
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
          <Avatar url={post.author.avatarUrl} username={post.author.username} size="sm" ring />
          <span className="text-sm font-semibold">{post.author.username}</span>
        </Link>
        <span className="text-xs text-zinc-400">· {timeAgo(post.createdAt)}</span>
        {post.isOwner ? (
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={() => {
                setDraft(caption);
                setEditing(true);
              }}
              className="text-xs font-medium text-zinc-400 hover:text-indigo-400"
            >
              Edit
            </button>
            <button onClick={deletePost} className="text-xs font-medium text-red-500 hover:underline">
              Delete
            </button>
          </div>
        ) : (
          <button onClick={reportPost} className="ml-auto text-xs font-medium text-zinc-400 hover:text-red-500">
            Report
          </button>
        )}
      </div>

      {/* media */}
      <div className="relative flex select-none items-center justify-center bg-zinc-800">
        {mediaBroken ? (
          <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 text-zinc-500">
            <span className="text-4xl">🖼️</span>
            <span className="text-sm">Media unavailable</span>
          </div>
        ) : cur.type === "VIDEO" ? (
          <video
            key={cur.url}
            src={cur.url}
            controls
            playsInline
            onError={() => setMediaBroken(true)}
            className="max-h-[70vh] w-full bg-black object-contain"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={cur.url}
            src={cur.url}
            alt={post.altText || caption || `Post by ${post.author.username}`}
            onClick={onImageTap}
            onDoubleClick={(e) => e.preventDefault()}
            onError={() => setMediaBroken(true)}
            className="max-h-[70vh] w-full cursor-pointer object-contain"
          />
        )}

        {/* carousel controls */}
        {slides.length > 1 && !mediaBroken && (
          <>
            {slide > 0 && (
              <button
                type="button"
                onClick={() => setSlide((s) => s - 1)}
                aria-label="Previous"
                className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-lg text-white hover:bg-black/70"
              >
                ‹
              </button>
            )}
            {slide < slides.length - 1 && (
              <button
                type="button"
                onClick={() => setSlide((s) => s + 1)}
                aria-label="Next"
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-lg text-white hover:bg-black/70"
              >
                ›
              </button>
            )}
            <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">
              {slide + 1}/{slides.length}
            </span>
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
              {slides.map((_, i) => (
                <span key={i} className={`h-1.5 w-1.5 rounded-full transition ${i === slide ? "bg-white" : "bg-white/40"}`} />
              ))}
            </div>
          </>
        )}

        {/* heart burst overlay */}
        {burstKey > 0 && (
          <svg
            key={burstKey}
            viewBox="0 0 24 24"
            className="heart-burst pointer-events-none absolute h-28 w-28 fill-white/95 drop-shadow-lg"
          >
            <path d="M12 21s-7-4.6-9.3-9.2C1 8.5 2.7 5 6 5c2 0 3.2 1.2 4 2.3C10.8 6.2 12 5 14 5c3.3 0 5 3.5 3.3 6.8C19 16.4 12 21 12 21z" />
          </svg>
        )}
      </div>

      {zoomed && cur.type !== "VIDEO" && !mediaBroken && (
        <Lightbox
          src={cur.url}
          alt={caption || `Post by ${post.author.username}`}
          onClose={() => setZoomed(false)}
        />
      )}

      {/* actions */}
      <div className="px-3 pt-3">
        <div className="flex items-center gap-4">
          <button onClick={toggleLike} aria-label={liked ? "Unlike" : "Like"} className="flex items-center gap-1.5">
            <svg
              key={bounceKey}
              viewBox="0 0 24 24"
              className={`h-6 w-6 transition ${liked ? "fill-red-500 text-red-500" : "fill-none text-zinc-200"} ${bounceKey > 0 ? "like-bounce" : ""}`}
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 21s-7-4.6-9.3-9.2C1 8.5 2.7 5 6 5c2 0 3.2 1.2 4 2.3C10.8 6.2 12 5 14 5c3.3 0 5 3.5 3.3 6.8C19 16.4 12 21 12 21z" />
            </svg>
          </button>
          <Link href={`/post/${post.id}`} aria-label="Comments" className="flex items-center gap-1.5 text-zinc-200">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20l1.2-5.2A8.5 8.5 0 1 1 21 11.5z" />
            </svg>
          </Link>
          <button onClick={copyLink} aria-label="Copy link to post" className="text-zinc-200 hover:text-indigo-400">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" /><path d="M16 6l-4-4-4 4" /><path d="M12 2v14" />
            </svg>
          </button>
          <button
            onClick={toggleBookmark}
            aria-label={bookmarked ? "Remove from saved" : "Save post"}
            className="ml-auto text-zinc-200 hover:text-indigo-400"
          >
            <svg viewBox="0 0 24 24" className={`h-6 w-6 ${bookmarked ? "fill-indigo-400 text-indigo-400" : "fill-none"}`} stroke="currentColor" strokeWidth="2">
              <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" />
            </svg>
          </button>
        </div>
        <p className="mt-2 text-sm font-semibold">{likeCount} {likeCount === 1 ? "like" : "likes"}</p>

        {/* caption (editable by owner) */}
        {editing ? (
          <div className="mt-2 space-y-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              maxLength={2200}
              autoFocus
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              placeholder="Write a caption…"
            />
            <div className="flex gap-2">
              <button onClick={saveCaption} disabled={busy} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
                {busy ? "Saving…" : "Save"}
              </button>
              <button onClick={() => setEditing(false)} disabled={busy} className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-semibold ring-1 ring-zinc-700 hover:bg-zinc-700">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          caption && (
            <p className="mt-1 text-sm">
              <Link href={`/${post.author.username}`} className="font-semibold">{post.author.username}</Link>{" "}
              <Linkify text={caption} />
            </p>
          )
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
                <Linkify text={c.text} />
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
