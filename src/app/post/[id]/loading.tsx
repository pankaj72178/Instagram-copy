import { PostCardSkeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-6">
      <PostCardSkeleton />
    </main>
  );
}
