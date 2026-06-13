import Link from "next/link";

type GridPost = { id: string; mediaUrl: string; mediaType: string };

export default function PostGrid({ posts }: { posts: GridPost[] }) {
  if (posts.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-zinc-400">No posts yet.</p>
    );
  }
  return (
    <div className="grid grid-cols-3 gap-1 md:gap-2">
      {posts.map((p) => (
        <Link
          key={p.id}
          href={`/post/${p.id}`}
          className="relative aspect-square overflow-hidden rounded-md bg-zinc-100"
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
