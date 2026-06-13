// Seed script for Folo.
//   - generates simple SVG placeholder media into /public/uploads
//   - creates 4 demo users (2 public, 2 private), all password: "password123"
//   - adds sample posts, a mix of accepted/pending follows, likes & comments
// Run with: npm run seed   (wipes and reseeds)
import "dotenv/config";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const UPLOADS = join(process.cwd(), "public", "uploads");

// --- tiny SVG generators (valid <img> sources, no binary assets needed) -----
function gradientSvg(label: string, c1: string, c2: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
  </linearGradient></defs>
  <rect width="640" height="640" fill="url(#g)"/>
  <text x="50%" y="50%" font-family="system-ui,sans-serif" font-size="44" fill="#ffffff"
    text-anchor="middle" dominant-baseline="middle" opacity="0.9">${label}</text>
</svg>`;
}
function avatarSvg(initials: string, c1: string, c2: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240">
  <defs><linearGradient id="a" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
  </linearGradient></defs>
  <rect width="240" height="240" fill="url(#a)"/>
  <text x="50%" y="52%" font-family="system-ui,sans-serif" font-size="96" font-weight="700"
    fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${initials}</text>
</svg>`;
}
function writeMedia(name: string, svg: string): string {
  writeFileSync(join(UPLOADS, name), svg, "utf8");
  return `/uploads/${name}`; // public URL
}

async function main() {
  mkdirSync(UPLOADS, { recursive: true });

  // Clean slate (respecting FK order)
  await prisma.comment.deleteMany();
  await prisma.like.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);

  const usersData = [
    { username: "ava", displayName: "Ava Stone", email: "ava@folo.test", isPrivate: false, av: ["AS", "#6366f1", "#a855f7"], bio: "Photographer & coffee lover ☕" },
    { username: "ben", displayName: "Ben Carter", email: "ben@folo.test", isPrivate: false, av: ["BC", "#0ea5e9", "#22d3ee"], bio: "Traveling the world 🌍" },
    { username: "cara", displayName: "Cara Diaz", email: "cara@folo.test", isPrivate: true, av: ["CD", "#f43f5e", "#fb923c"], bio: "Private account 🔒 friends only" },
    { username: "dan", displayName: "Dan Lee", email: "dan@folo.test", isPrivate: true, av: ["DL", "#10b981", "#34d399"], bio: "Just vibes" },
  ];

  const users: Record<string, { id: string }> = {};
  for (const u of usersData) {
    const created = await prisma.user.create({
      data: {
        username: u.username,
        displayName: u.displayName,
        email: u.email,
        passwordHash,
        isPrivate: u.isPrivate,
        bio: u.bio,
        avatarUrl: writeMedia(`avatar-${u.username}.svg`, avatarSvg(u.av[0], u.av[1], u.av[2])),
      },
    });
    users[u.username] = created;
  }

  // --- posts (each user gets a couple) --------------------------------------
  const palettes: [string, string][] = [
    ["#6366f1", "#ec4899"], ["#0ea5e9", "#10b981"], ["#f59e0b", "#ef4444"],
    ["#8b5cf6", "#06b6d4"], ["#14b8a6", "#84cc16"], ["#f43f5e", "#a855f7"],
  ];
  let p = 0;
  const postIds: string[] = [];
  for (const u of usersData) {
    const n = 2;
    for (let i = 0; i < n; i++) {
      const [c1, c2] = palettes[p % palettes.length];
      const url = writeMedia(`post-${u.username}-${i}.svg`, gradientSvg(`${u.displayName} · ${i + 1}`, c1, c2));
      const post = await prisma.post.create({
        data: {
          authorId: users[u.username].id,
          mediaUrl: url,
          mediaType: "IMAGE",
          caption: `${u.displayName}'s post #${i + 1} ✨`,
        },
      });
      postIds.push(post.id);
      p++;
    }
  }

  // --- follows (mix of ACCEPTED + PENDING) ----------------------------------
  const F = (followerId: string, followingId: string, status: "ACCEPTED" | "PENDING") =>
    prisma.follow.create({ data: { followerId, followingId, status } });

  await F(users.ava.id, users.ben.id, "ACCEPTED");   // ava follows ben (public)
  await F(users.ben.id, users.ava.id, "ACCEPTED");   // ben follows ava (mutual)
  await F(users.cara.id, users.ava.id, "ACCEPTED");  // cara follows ava
  await F(users.ava.id, users.cara.id, "ACCEPTED");  // ava is approved follower of private cara
  await F(users.ben.id, users.cara.id, "PENDING");   // ben requested to follow private cara
  await F(users.dan.id, users.ben.id, "ACCEPTED");   // dan follows ben
  await F(users.ava.id, users.dan.id, "PENDING");    // ava requested private dan

  // --- a few likes & comments ----------------------------------------------
  await prisma.like.create({ data: { userId: users.ben.id, postId: postIds[0] } });
  await prisma.like.create({ data: { userId: users.cara.id, postId: postIds[0] } });
  await prisma.comment.create({ data: { userId: users.ben.id, postId: postIds[0], text: "Love this! 🔥" } });
  await prisma.comment.create({ data: { userId: users.ava.id, postId: postIds[2], text: "Great shot 👏" } });

  console.log("✅ Seed complete.");
  console.log("   Users (password = 'password123'):");
  usersData.forEach((u) =>
    console.log(`   • ${u.username.padEnd(5)} ${u.isPrivate ? "[private]" : "[public] "} — ${u.email}`)
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
