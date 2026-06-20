"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  MAX_IMAGE_MB,
  MAX_VIDEO_MB,
} from "@/lib/validation";

const MAX_ITEMS = 10;

// Returns an error string if the file is too big, else null.
function sizeError(file: File): string | null {
  const isVideo = file.type.startsWith("video/");
  const max = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > max) {
    return `“${file.name}” is ${(file.size / 1024 / 1024).toFixed(1)}MB — the max is ${isVideo ? MAX_VIDEO_MB : MAX_IMAGE_MB}MB.`;
  }
  return null;
}

type Item = { file: File; url: string; isVideo: boolean };

export default function UploadPage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [active, setActive] = useState(0);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;
    if (picked.length > MAX_ITEMS) {
      setError(`You can add up to ${MAX_ITEMS} items.`);
      e.target.value = "";
      return;
    }
    for (const f of picked) {
      const tooBig = sizeError(f);
      if (tooBig) {
        setError(tooBig);
        e.target.value = "";
        return;
      }
    }
    setItems(picked.map((f) => ({ file: f, url: URL.createObjectURL(f), isVideo: f.type.startsWith("video/") })));
    setActive(0);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (items.length === 0) return setError("Please choose at least one photo or video.");
    setBusy(true);
    try {
      const fd = new FormData();
      for (const it of items) fd.append("media", it.file);
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

  const current = items[active];

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">New post</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <p className="rounded-lg bg-red-950 p-3 text-sm font-medium text-red-300">{error}</p>}

        <label className="relative flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-indigo-400">
          {current ? (
            current.isVideo ? (
              <video src={current.url} className="h-full w-full bg-black object-contain" controls />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={current.url} alt="Preview" className="h-full w-full object-contain" />
            )
          ) : (
            <span className="text-center text-sm">
              📷 / 🎬<br />Tap to choose photos or videos<br />
              <span className="text-xs text-zinc-500">(up to {MAX_ITEMS})</span>
            </span>
          )}
          {items.length > 1 && (
            <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">
              {active + 1}/{items.length}
            </span>
          )}
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
            onChange={onPick}
            className="hidden"
          />
        </label>

        {/* thumbnail strip for reordering preview / selecting active */}
        {items.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {items.map((it, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActive(i)}
                className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg ring-2 ${i === active ? "ring-indigo-500" : "ring-transparent"}`}
              >
                {it.isVideo ? (
                  <video src={it.url} className="h-full w-full object-cover" muted />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.url} alt="" className="h-full w-full object-cover" />
                )}
              </button>
            ))}
          </div>
        )}

        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Write a caption…  use #tags and @mentions"
          rows={3}
          maxLength={2200}
          className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2.5 outline-none focus:border-indigo-500"
        />

        <button type="submit" disabled={busy} className="btn-gradient w-full rounded-xl py-2.5 font-semibold text-white disabled:opacity-60">
          {busy ? "Sharing…" : "Share"}
        </button>
        <p className="text-center text-xs text-zinc-400">
          Up to {MAX_ITEMS} items · Images ≤{MAX_IMAGE_MB}MB · Videos ≤{MAX_VIDEO_MB}MB
        </p>
      </form>
    </main>
  );
}
