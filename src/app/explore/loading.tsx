import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
      <h1 className="mb-4 text-xl font-bold">Explore</h1>
      <Skeleton className="mb-6 h-11 w-full rounded-xl" />
      <div className="grid grid-cols-3 gap-1 md:gap-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square w-full rounded-md" />
        ))}
      </div>
    </main>
  );
}
