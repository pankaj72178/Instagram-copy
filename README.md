# 📸 Folo

**Folo is an Instagram-style social app** — sign up, post photos & videos, follow friends, like and comment, chat in DMs, and scroll a personalized feed.

🔗 **Live demo:** https://instagram-copy-beta.vercel.app
🧪 **Try it instantly:** log in with `ava@folo.test` / `password123`

Built with **Next.js (App Router) + TypeScript + Tailwind + Prisma + MongoDB**.

---

## 📖 Table of contents
1. [What you can do](#-what-you-can-do)
2. [How it works (plain English)](#-how-it-works-plain-english)
3. [Where the code lives](#-where-the-code-lives-a-map)
4. [Run it yourself](#-run-it-yourself)
5. [Environment variables](#-environment-variables)
6. [Tech stack](#-tech-stack)
7. [Good to know](#-good-to-know-limitations)

---

## ✨ What you can do

| Area | Features |
|---|---|
| **Accounts** | Email/password or **Sign in with Google** · forgot password via a **6-digit code emailed to you** · set a password later if you joined with Google |
| **Profile** | Avatar, bio, display name, **change your @username** (old links still work) · **public or private** account |
| **Following** | Follow public accounts instantly · private accounts get a **follow request** you approve/reject |
| **Posting** | Photos & videos · **swipeable multi-image posts** (up to 10) · captions with **#hashtags** and **@mentions** · edit caption · delete |
| **Feed & discovery** | Home feed (people you follow) · **Explore** (public posts) · **search** people · tap a hashtag to see all posts using it |
| **Engaging** | **Like** (or double-tap the photo) · **comment** · **save** posts to a private collection |
| **Messaging** | **Direct messages** (1:1), unread badge, live updates · messages are **encrypted in the database** |
| **Safety** | **Block** or **report** users and posts · admins get a **moderation dashboard** |
| **Notifications** | See who liked, commented, or followed you |
| **Looks** | Premium dark theme · **light/dark toggle** · smooth animations, toasts, skeletons |

---

## 🧠 How it works (plain English)

A quick tour of what happens behind each feature — no deep CS needed.

### 🔑 Logging in
When you log in, the server checks your password (stored **hashed**, never as plain text) and hands your browser a **signed token stored in a secure cookie**. Every page you open sends that cookie back, so the server knows it's you. Logging out just clears the cookie.
*Google login* works the same way — Google verifies who you are, then we issue the same kind of cookie.

### 🙈 Public vs private accounts
Every time the app is about to show someone's posts, it runs one check: **"is this viewer allowed to see this?"** Public account → yes. Private account → only you or your approved followers. This single check (`canViewContent`) guards profiles, the feed, individual posts, and even the raw image files.

### 🏠 The feed
Your home feed is simply: **posts from people you follow + your own**, newest first. It loads 10 at a time and fetches more as you scroll ("cursor pagination"). Because the list is built only from accounts you follow, privacy is automatic.

### 🖼️ Posting a photo
You pick up to 10 files. The server doesn't trust the file's label — it **reads the first few bytes to confirm it's really an image/video** (so you can't sneak in a disguised file), checks the size, then stores it. Small setups keep the bytes in MongoDB; if a **Vercel Blob** store is connected, it uses that CDN instead — the app auto-detects which.

### ❤️ Likes, comments, bookmarks
These are tiny records linking *you* → *a post*. Liking is **optimistic**: the heart fills instantly while the request happens in the background, and quietly reverts if it fails. Double-tapping a photo triggers the big heart animation. Bookmarks are private — only you see your **Saved** tab.

### 🔗 #hashtags and @mentions
When a caption is shown, the app scans the text and turns `#sunset` into a link to that hashtag's page and `@ava` into a link to that profile. Hashtag pages just search captions for that tag.

### 💬 Direct messages
Each pair of people shares one **conversation**. When you send a message, it's **encrypted (AES-256-GCM) before being saved**, so the raw database only contains scrambled text — a database leak wouldn't expose your chats. The app decrypts it again only when showing it to you or the recipient. The chat refreshes every few seconds so new messages appear without a reload, and an **unread badge** shows in the nav.

### 🚫 Blocking & reporting
Blocking someone **removes the follow both ways** and hides you from each other everywhere — feed, search, profile, and DMs. Reports get saved to a queue that **admins review** at `/admin/reports` and dismiss once handled.

### 🌗 Theme
Your dark/light choice is saved in the browser. A tiny script applies it **before the page paints**, so you never see a flash of the wrong theme.

---

## 🗺️ Where the code lives (a map)

```
src/
├─ app/                    # pages & API routes (Next.js App Router)
│  ├─ page.tsx             # home feed
│  ├─ login, signup, forgot-password   # auth screens
│  ├─ [username]/          # a profile (+ followers / following)
│  ├─ post/[id]/           # a single post
│  ├─ explore, saved, tags/[tag], notifications, settings
│  ├─ messages/            # DM inbox + a thread
│  ├─ admin/reports/       # moderation dashboard
│  └─ api/                 # all backend endpoints (auth, posts, follow,
│                          #   messages, bookmark, block, report, media…)
├─ components/             # UI pieces (PostCard, Thread, Avatar, Toast…)
└─ lib/                    # the "brains" — reusable logic:
   ├─ auth.ts              # login tokens & current user
   ├─ access.ts           # who-can-see-what + block checks
   ├─ posts.ts            # shaping posts for the UI
   ├─ dm.ts + crypto.ts    # conversations + message encryption
   ├─ storage.ts           # save/serve media (MongoDB or Blob)
   ├─ ratelimit.ts, mailer.ts, validation.ts, admin.ts
prisma/
└─ schema.prisma          # the database shape (User, Post, Follow, Like,
                          #   Comment, Bookmark, Block, Report, Conversation, Message…)
```

**Reading tip:** start at a page in `app/`, then follow the helpers it imports from `lib/`. For example `app/page.tsx` → `lib/posts.ts` → `lib/access.ts` shows the whole "build a private-aware feed" flow.

---

## 🚀 Run it yourself

```bash
npm install
# create a .env file (see the table below)
npm run db:push     # create the database tables/collections
npm run seed        # optional: demo users + posts
npm run dev         # open http://localhost:3000
```

You'll need a free **MongoDB Atlas** database for `DATABASE_URL`. Everything else is optional — the app degrades gracefully (e.g. reset codes print to the terminal until you add an email provider).

---

## 🔧 Environment variables

Put these in `.env` locally and in your Vercel project settings. **Only the first two are required.**

| Variable | Required | What it's for |
|---|:---:|---|
| `DATABASE_URL` | ✅ | MongoDB Atlas connection string |
| `JWT_SECRET` | ✅ | Signs login tokens (also encrypts DMs if `DM_ENCRYPTION_KEY` isn't set) |
| `GOOGLE_CLIENT_ID` · `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | – | "Sign in with Google" |
| `EMAIL_USER` · `EMAIL_PASS` | – | Gmail App Password → sends reset-code emails |
| `RESEND_API_KEY` · `EMAIL_FROM` | – | Resend (an easier alternative to Gmail) |
| `BLOB_READ_WRITE_TOKEN` | – | Store uploads on Vercel Blob instead of MongoDB |
| `UPSTASH_REDIS_REST_URL` · `UPSTASH_REDIS_REST_TOKEN` | – | Real rate-limiting across servers |
| `DM_ENCRYPTION_KEY` | – | Dedicated key for encrypting DMs |
| `ADMIN_EMAILS` | – | Comma-separated emails allowed into `/admin/reports` |
| `NEXT_PUBLIC_SITE_URL` | – | Your URL, for nice link previews when sharing |

> 🔒 `.env` is **gitignored** — your secrets never get pushed to GitHub. Set the same values in Vercel for the live site.

---

## 🧰 Tech stack

| Layer | Choice |
|---|---|
| Framework | **Next.js 16** (App Router, Turbopack) + TypeScript |
| Styling | **Tailwind CSS 4** |
| Database | **MongoDB Atlas** via **Prisma 6** |
| Auth | JWT (`jose`) in httpOnly cookies + `bcryptjs` |
| Media | MongoDB bytes **or** Vercel Blob (auto-detected) |
| Email | Resend **or** Gmail SMTP (`nodemailer`) |
| Hosting | Vercel |

### Scripts
| Command | Does |
|---|---|
| `npm run dev` | Start the local dev server |
| `npm run build` | Generate Prisma client + production build |
| `npm run db:push` | Sync the schema to MongoDB |
| `npm run seed` | Load demo data |

---

## ⚠️ Good to know (limitations)
- **DMs are encrypted at rest, but not end-to-end** — the server can technically decrypt them (it protects against a database leak, not a determined server admin).
- **DMs update by polling every 4s**, not instant push — simple and reliable on serverless; true real-time needs websockets.
- **Light theme** is a CSS remap of the dark palette, so a rare spot may look slightly off.
- **MongoDB has no automatic cascade deletes** — when something is removed, the app cleans up related records in code.
