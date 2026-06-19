// Shimmer placeholders shown while server components stream in.
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`folo-skeleton rounded-md ${className}`} />;
}

export function PostCardSkeleton() {
  return (
    <article className="overflow-hidden rounded-2xl bg-zinc-900 ring-1 ring-zinc-800">
      <div className="flex items-center gap-3 p-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-3 w-28" />
      </div>
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="space-y-2 p-3">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </article>
  );
}

export function FeedSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="space-y-5">
      {Array.from({ length: count }).map((_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div>
      <header className="flex items-center gap-6 sm:gap-10">
        <Skeleton className="h-20 w-20 rounded-full sm:h-24 sm:w-24" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-5 w-40" />
          <div className="flex gap-6">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </header>
      <Skeleton className="mt-4 h-4 w-32" />
      <hr className="my-6 border-zinc-800" />
      <div className="grid grid-cols-3 gap-1 md:gap-2">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square w-full rounded-md" />
        ))}
      </div>
    </div>
  );
}

export function UserRowsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <ul className="divide-y divide-zinc-800">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 py-3">
          <Skeleton className="h-11 w-11 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-7 w-20 rounded-lg" />
        </li>
      ))}
    </ul>
  );
}
