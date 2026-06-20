import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canViewContent } from "@/lib/access";
import { loadPostCards } from "@/lib/posts";
import PostCard from "@/components/PostCard";
import Link from "next/link";

// Open Graph / link preview — only expose details for PUBLIC posts.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const post = await prisma.post.findUnique({
    where: { id },
    select: {
      caption: true,
      mediaUrl: true,
      author: { select: { username: true, isPrivate: true } },
    },
  });
  if (!post) return { title: "Post" };
  if (post.author.isPrivate) {
    return { title: "Private post", robots: { index: false } };
  }
  const title = `@${post.author.username} on Folo`;
  const description = post.caption?.slice(0, 160) || `A post by @${post.author.username}`;
  return {
    title,
    description,
    openGraph: { title, description, images: [post.mediaUrl], type: "article" },
    twitter: { card: "summary_large_image", title, description, images: [post.mediaUrl] },
  };
}

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
