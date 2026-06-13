"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function UploadPage() {
  const router = useRouter();
  const [preview, setPreview] = useState<{ url: string; isVideo: boolean } | null>(null);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    const f = e.target.files?.[0];
    if (!f) return setPreview(null);
    setPreview({ url: URL.createObjectURL(f), isVideo: f.type.startsWith("video/") });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const file = fileRef.current?.files?.[0];
    if (!file) return setError("Please choose a photo or video.");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("media", file);
      fd.set("caption", caption);
      const res = await fetch("/api/posts", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Upload failed");
        return;
      }
      router.push(`/post/${data.post.id}`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">New post</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-600">{error}</p>}

        <label className="flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-indigo-400">
          {preview ? (
            preview.isVideo ? (
              <video src={preview.url} className="h-full w-full object-contain bg-black" controls />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.url} alt="Preview" className="h-full w-full object-contain" />
            )
          ) : (
            <span className="text-center text-sm">
              📷 / 🎬<br />Tap to choose a photo or video
            </span>
          )}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" onChange={onPick} className="hidden" />
        </label>

        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Write a caption…"
          rows={3}
          maxLength={2200}
          className="w-full rounded-xl border border-zinc-700 px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />

        <button type="submit" disabled={busy} className="w-full rounded-xl bg-indigo-600 py-2.5 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60">
          {busy ? "Sharing…" : "Share"}
        </button>
        <p className="text-center text-xs text-zinc-400">Images up to 8MB (jpg/png/webp/gif) · Videos up to 14MB (mp4/webm)</p>
      </form>
    </main>
  );
}
