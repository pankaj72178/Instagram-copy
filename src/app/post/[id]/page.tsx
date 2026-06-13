import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canViewContent } from "@/lib/access";
import { loadPostCards } from "@/lib/posts";
import PostCard from "@/components/PostCard";
import Link from "next/link";

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await getCurrentUser();

  const base = await prisma.post.findUnique({
    where: { id },
    select: { author: { select: { id: true, isPrivate: true } } },
  });
  if (!base) notFound();

  const canView = await canViewContent(me?.id ?? null, base.author);
  if (!canView) {
    return (
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-16 text-center">
        <p className="text-2xl">🔒</p>
        <p className="mt-2 font-semibold">This post is from a private account</p>
        <Link href="/" className="mt-3 inline-block text-sm text-indigo-400 hover:underline">Back home</Link>
      </main>
    );
  }

  const [card] = await loadPostCards({ id }, me?.id ?? "", { allComments: true });
  if (!card) notFound();

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-6">
      <PostCard post={card} myUsername={me?.username ?? ""} showAllComments />
    </main>
  );
}
