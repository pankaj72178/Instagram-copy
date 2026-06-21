"use client";

import { useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/Toast";

type SavedPost = { id: string; mediaUrl: string; mediaType: string; collectionId: string | null };
type Collection = { id: string; name: string };

export default function SavedView({
  initialPosts,
  initialCollections,
}: {
  initialPosts: SavedPost[];
  initialCollections: Collection[];
}) {
  const toast = useToast();
  const [posts, setPosts] = useState<SavedPost[]>(initialPosts);
  const [collections, setCollections] = useState<Collection[]>(initialCollections);
  const [tab, setTab] = useState<string | null>(null); // null = All
  const [menuFor, setMenuFor] = useState<string | null>(null);

  const visible = tab === null ? posts : posts.filter((p) => p.collectionId === tab);
  const countFor = (cid: string) => posts.filter((p) => p.collectionId === cid).length;

  async function newCollection() {
    const name = window.prompt("Name your collection:");
    if (!name?.trim()) return;
    const res = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(data.error || "Couldn't create collection");
    setCollections((c) => [...c, data.collection]);
    setTab(data.collection.id);
  }

  async function deleteCollection(id: string) {
    if (!confirm("Delete this collection? Saved posts stay, just unfiled.")) return;
    const res = await fetch(`/api/collections/${id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Couldn't delete collection");
    setCollections((c) => c.filter((x) => x.id !== id));
    setPosts((ps) => ps.map((p) => (p.collectionId === id ? { ...p, collectionId: null } : p)));
    setTab(null);
    toast.success("Collection deleted");
  }

  async function moveTo(postId: string, collectionId: string | null) {
    setMenuFor(null);
    setPosts((ps) => ps.map((p) => (p.id === postId ? { ...p, collectionId } : p)));
    const res = await fetch(`/api/posts/${postId}/bookmark`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collectionId }),
    });
    if (!res.ok) toast.error("Couldn't move post");
  }

  return (
    <div>
      {/* folder tabs */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setTab(null)}
          className={`rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ${tab === null ? "bg-indigo-600 text-white ring-indigo-600" : "bg-zinc-900 text-zinc-300 ring-zinc-800 hover:bg-zinc-800"}`}
        >
          All {posts.length}
        </button>
        {collections.map((c) => (
          <button
            key={c.id}
            onClick={() => setTab(c.id)}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ${tab === c.id ? "bg-indigo-600 text-white ring-indigo-600" : "bg-zinc-900 text-zinc-300 ring-zinc-800 hover:bg-zinc-800"}`}
          >
            {c.name} {countFor(c.id)}
          </button>
        ))}
        <button
          onClick={newCollection}
          className="rounded-full bg-zinc-900 px-3 py-1.5 text-sm font-semibold text-indigo-400 ring-1 ring-zinc-800 hover:bg-zinc-800"
        >
          ＋ New
        </button>
        {tab && (
          <button
            onClick={() => deleteCollection(tab)}
            className="ml-auto rounded-full px-3 py-1.5 text-sm font-semibold text-red-400 hover:text-red-300"
          >
            Delete folder
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <span className="text-4xl">🔖</span>
          <p className="font-semibold">{tab ? "This collection is empty" : "Nothing saved yet"}</p>
          <p className="max-w-xs text-sm text-zinc-500">
            Tap the bookmark icon on any post to save it, then use the folder button to organize.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-3 gap-1 md:gap-2">
          {visible.map((p) => (
            <li key={p.id} className="relative aspect-square overflow-hidden rounded-md bg-zinc-800">
              <Link href={`/post/${p.id}`} className="block h-full w-full">
                {p.mediaType === "VIDEO" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <video src={p.mediaUrl} className="h-full w-full object-cover" muted playsInline />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.mediaUrl} alt="" className="h-full w-full object-cover" />
                )}
              </Link>
              {/* move-to-folder button */}
              <button
                onClick={() => setMenuFor(menuFor === p.id ? null : p.id)}
                aria-label="Organize"
                className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                </svg>
              </button>
              {menuFor === p.id && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuFor(null)} />
                  <div className="absolute right-1.5 top-9 z-20 w-40 overflow-hidden rounded-lg bg-zinc-900 py-1 text-sm shadow-xl ring-1 ring-zinc-700">
                    <p className="px-3 py-1 text-xs font-semibold uppercase text-zinc-500">Move to</p>
                    {collections.length === 0 && (
                      <p className="px-3 py-1 text-xs text-zinc-500">No folders yet</p>
                    )}
                    {collections.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => moveTo(p.id, c.id)}
                        className={`block w-full px-3 py-1.5 text-left hover:bg-zinc-800 ${p.collectionId === c.id ? "text-indigo-400" : "text-zinc-200"}`}
                      >
                        {c.name}
                      </button>
                    ))}
                    {p.collectionId && (
                      <button
                        onClick={() => moveTo(p.id, null)}
                        className="block w-full border-t border-zinc-800 px-3 py-1.5 text-left text-zinc-400 hover:bg-zinc-800"
                      >
                        Remove from folder
                      </button>
                    )}
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
