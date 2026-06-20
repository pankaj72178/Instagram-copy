// Direct-message helpers. Conversations are 1:1 with a canonical (A,B) pair.
import "server-only";
import { prisma } from "@/lib/prisma";

/** Canonical ordering so each user-pair maps to exactly one conversation. */
export function pairKey(a: string, b: string) {
  return a < b ? { userAId: a, userBId: b } : { userAId: b, userBId: a };
}

/** Find the existing conversation id between two users, or null. */
export async function findConversation(a: string, b: string): Promise<string | null> {
  const key = pairKey(a, b);
  const c = await prisma.conversation.findUnique({
    where: { userAId_userBId: key },
    select: { id: true },
  });
  return c?.id ?? null;
}

/** Find or create the conversation between two users; returns its id. */
export async function getOrCreateConversation(a: string, b: string): Promise<string> {
  const key = pairKey(a, b);
  const c = await prisma.conversation.upsert({
    where: { userAId_userBId: key },
    create: key,
    update: {},
    select: { id: true },
  });
  return c.id;
}
