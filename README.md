# 📸 Folo

**Folo** is a full-stack, Instagram-style social media app — share photos and videos, follow people (with public/private accounts + follow requests), like and comment, and browse a personalized feed. Built with original branding.

> ⚠️ Built **incrementally, phase by phase.** See [Build progress](#-build-progress) for what's done so far.

---

## 🧱 Tech stack

| Layer | Tech |
|-------|------|
| Framework | **Next.js 16** (App Router) + **TypeScript** |
| Styling | **Tailwind CSS 4** |
| Database | **Prisma 7** ORM + **SQLite** (local dev) |
| Auth | **JWT** in **httpOnly cookies** (`jose`), passwords hashed with **bcrypt** |
| Validation | **react-hook-form** + **zod** |
| Media | Local filesystem (`/public/uploads`) in dev — storage logic isolated for easy S3/Cloudinary swap later |

**Designed to scale:** the SQLite datasource and the local file storage are each isolated so you can switch to **PostgreSQL** and **S3/Cloudinary** later with minimal changes.

---

## 🚀 Getting started

### 1. Install dependencies
```bash
npm install
```

### 2. Set up the database + seed demo data
```bash
npm run db:reset     # creates the SQLite DB and applies migrations
npm run seed         # adds demo users, posts, follows, likes, comments
```
> `npm run seed` also generates placeholder avatars/photos into `/public/uploads`.

### 3. Run the app
```bash
npm run dev
```
Open **http://localhost:3000**.

That's it — one documented flow to a working app.

---

## 🔑 Demo login credentials

All demo users share the password: **`password123`**

| Username | Email | Account type |
|----------|-------|--------------|
| `ava`  | ava@folo.test  | 🌐 Public |
| `ben`  | ben@folo.test  | 🌐 Public |
| `cara` | cara@folo.test | 🔒 Private |
| `dan`  | dan@folo.test  | 🔒 Private |

The seed also sets up a realistic mix of relationships:
- Mutual follows between `ava` and `ben`
- `ava` is an **approved follower** of private `cara`
- `ben` has a **pending follow request** to private `cara`
- `ava` has a **pending request** to private `dan`

…so you can immediately test public feeds, private accounts, and follow requests.

---

## 📜 npm scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Start the dev server (http://localhost:3000) |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run seed` | Wipe & reseed the database with demo data |
| `npm run db:reset` | Reset migrations + database |

---

## ⚙️ Environment variables

A default `.env` with `DATABASE_URL` is created by Prisma. You'll add `JWT_SECRET` in Phase 2:

```bash
# SQLite database (local dev)
DATABASE_URL="file:./dev.db"

# Secret used to sign JWT auth tokens (Phase 2 — use a long random string)
JWT_SECRET="replace-with-a-long-random-secret"
```

Generate a strong `JWT_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

> `.env` and the SQLite database are gitignored — never commit them.

### Switching to PostgreSQL later
1. In `prisma/schema.prisma`, change the datasource `provider` from `sqlite` to `postgresql`.
2. Point `DATABASE_URL` at your Postgres connection string.
3. Swap the driver adapter in `src/lib/prisma.ts` (`@prisma/adapter-better-sqlite3` → `@prisma/adapter-pg`).
4. Run `npx prisma migrate dev`.

---

## 🗂️ Project structure (so far)

```
folo/
├── prisma/
│   ├── schema.prisma        # User, Post, Follow, Like, Comment models
│   ├── migrations/          # SQL migrations
│   └── seed.ts              # demo users + posts + follows + media
├── public/
│   └── uploads/             # uploaded/seeded media (dev storage)
├── src/
│   ├── app/                 # Next.js App Router pages
│   ├── generated/prisma/    # generated Prisma client (gitignored)
│   └── lib/
│       └── prisma.ts        # Prisma client singleton (DB access isolated here)
└── README.md
```

---

## 🧩 Data model

- **User** — `username` (unique), `displayName`, `email` (unique), `passwordHash`, `avatarUrl`, `bio`, `isPrivate`, timestamps
- **Post** — `authorId`, `mediaUrl`, `mediaType` (`IMAGE` | `VIDEO`), `caption`, timestamps
- **Follow** — `followerId`, `followingId`, `status` (`PENDING` | `ACCEPTED`) — **unique per (follower → following)** pair
- **Like** — `userId`, `postId` — **unique per (user, post)**
- **Comment** — `userId`, `postId`, `text`, timestamp

> SQLite has no native enums, so `status`/`mediaType` are stored as validated strings (enforced in app code with zod). The schema is otherwise Postgres-ready.

---

## ✨ Features (target)

- 🔐 Auth — sign up, log in, log out; protected routes
- 👤 Profiles — avatar, bio, post grid, follower/following counts; edit profile; public/private toggle
- 🔁 Follow system — instant follow for public accounts; **follow requests** for private; Accept/Reject; button states (Follow / Requested / Following / Follow Back); unfollow & cancel request
- 🔒 Privacy — private accounts' posts/followers/following visible only to approved followers
- 🖼️ Posts — upload photo **or** video with caption; type + size validation; delete own posts
- 🏠 Feed — posts from people you follow + your own, newest first, paginated
- ❤️ Engagement — like/unlike, comment, delete own comments
- 🧭 Explore — recent posts from public accounts
- 🔔 Notifications — follow requests, recent follows & likes

---

## 📈 Build progress — ✅ all phases complete

- [x] **Phase 1** — Project setup, Prisma schema, migrations, seed script
- [x] **Phase 2** — Auth (signup, login, logout, JWT cookies, route protection)
- [x] **Phase 3** — Profiles + public/private toggle
- [x] **Phase 4** — Follow system + requests (Follow / Requested / Following / Follow back)
- [x] **Phase 5** — Post upload (photo + video) + delete + grid
- [x] **Phase 6** — Home feed + privacy enforcement
- [x] **Phase 7** — Likes + comments
- [x] **Phase 8** — Explore + notifications
- [x] **Phase 9** — Polish (responsive nav, loading/empty states, validation, a11y)

## 🗺️ Routes

| Page | Route |
|------|-------|
| Feed / landing | `/` |
| Login / Signup | `/login`, `/signup` |
| Profile | `/[username]` |
| Single post | `/post/[id]` |
| Upload | `/upload` |
| Explore | `/explore` |
| Activity | `/notifications` |
| Edit profile | `/settings` |

---

_Folo is an original project and is not affiliated with any existing social network._
