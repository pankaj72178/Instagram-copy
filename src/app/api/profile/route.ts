import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { saveMedia, deleteMedia } from "@/lib/storage";
import { sniffMime } from "@/lib/filecheck";
import { updateProfileSchema, IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/validation";

// PATCH /api/profile — update displayName, bio, isPrivate, and optional avatar.
// Accepts multipart/form-data (so an avatar file can be included).
export async function PATCH(req: Request) {
  const me = await getSessionUserId();
  if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid form data" }, { status: 400 });

  const parsed = updateProfileSchema.safeParse({
    username: form.get("username"),
    displayName: form.get("displayName"),
    bio: form.get("bio") ?? "",
    isPrivate: form.get("isPrivate") === "true",
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const { username, displayName, bio, isPrivate } = parsed.data;

  // If the username changed, make sure it's still unique.
  const taken = await prisma.user.findFirst({
    where: { username, NOT: { id: me } },
    select: { id: true },
  });
  if (taken) {
    return NextResponse.json({ error: "Username is already taken" }, { status: 409 });
  }

  // Optional avatar
  const avatar = form.get("avatar");
  let avatarUrl: string | undefined;
  if (avatar instanceof File && avatar.size > 0) {
    const realType = await sniffMime(avatar);
    if (!realType || !IMAGE_TYPES.includes(realType)) {
      return NextResponse.json({ error: "Avatar must be a valid image" }, { status: 400 });
    }
    if (avatar.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "Avatar is too large (max 8MB)" }, { status: 400 });
    }
    const me0 = await prisma.user.findUnique({ where: { id: me }, select: { avatarUrl: true } });
    const saved = await saveMedia(avatar);
    avatarUrl = saved.url;
    if (me0?.avatarUrl) await deleteMedia(me0.avatarUrl);
  }

  const before = await prisma.user.findUnique({ where: { id: me }, select: { isPrivate: true } });

  const user = await prisma.user.update({
    where: { id: me },
    data: { username, displayName, bio: bio || null, isPrivate, ...(avatarUrl ? { avatarUrl } : {}) },
    select: { username: true, displayName: true, bio: true, isPrivate: true, avatarUrl: true },
  });

  // Going private -> public: auto-accept any pending follow requests.
  if (before?.isPrivate && !isPrivate) {
    await prisma.follow.updateMany({
      where: { followingId: me, status: "PENDING" },
      data: { status: "ACCEPTED" },
    });
  }

  return NextResponse.json({ user });
}
