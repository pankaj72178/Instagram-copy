import Link from "next/link";

type GridPost = { id: string; mediaUrl: string; mediaType: string };

export default function PostGrid({
  posts,
  emptyTitle = "No posts yet",
  emptyHint,
}: {
  posts: GridPost[];
  emptyTitle?: string;
  emptyHint?: string;
}) {
  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-900 ring-1 ring-zinc-800">
          <svg viewBox="0 0 24 24" className="h-8 w-8 text-zinc-500" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="4" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" />
          </svg>
        </div>
        <p className="font-semibold">{emptyTitle}</p>
        {emptyHint && <p className="max-w-xs text-sm text-zinc-500">{emptyHint}</p>}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-3 gap-1 md:gap-2">
      {posts.map((p) => (
        <Link
          key={p.id}
          href={`/post/${p.id}`}
          className="relative aspect-square overflow-hidden rounded-md bg-zinc-800"
        >
          {p.mediaType === "VIDEO" ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <video src={p.mediaUrl} className="h-full w-full object-cover" muted playsInline />
              <span className="absolute right-1.5 top-1.5 text-white drop-shadow">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
              </span>
            </>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.mediaUrl} alt="" className="h-full w-full object-cover transition hover:opacity-90" />
          )}
        </Link>
      ))}
    </div>
  );
}
