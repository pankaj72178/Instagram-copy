import { ProfileSkeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
      <ProfileSkeleton />
    </main>
  );
}
