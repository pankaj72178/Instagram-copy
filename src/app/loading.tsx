import { FeedSkeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-6">
      <FeedSkeleton count={3} />
    </main>
  );
}
