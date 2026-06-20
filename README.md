# Folo

A full-stack, Instagram-style social app — built with the Next.js App Router, TypeScript, Tailwind CSS, Prisma, and MongoDB.

**Live:** https://instagram-copy-beta.vercel.app

## Features

### Social
- **Auth** — email/password, **Sign in with Google**, JWT in httpOnly cookies, bcrypt hashing
- **Password reset** via emailed **6-digit OTP** (Gmail SMTP or Resend)
- **Profiles** — editable username (with old-link redirects), display name, bio, avatar, public/private toggle
- **Follows** — instant for public accounts, **follow requests** + approve for private
- **Posts** — photos & videos, **multi-image carousel** (up to 10), captions, edit caption, delete
- **Feed** — people you follow + yourself, cursor pagination, privacy-enforced
- **Explore** — recent posts from public accounts + **user search**
- **Likes** (double-tap with heart-burst), **comments**
- **Bookmarks** + a private **Saved** tab
- **@mentions & #hashtags** — clickable, with hashtag pages
- **Direct messages** — 1:1 chats, unread badges, live polling, **encrypted at rest**
- **Notifications** — likes, comments, new followers, follow requests
- **Block / report** users and posts, with an admin **moderation dashboard**

### Polish & UX
- Premium dark UI — gradient brand, glassmorphism, story-ring avatars, spring animations
- **Light / dark theme** toggle (persisted, no flash)
- Toasts, loading skeletons, image lightbox, broken-image fallbacks, optimistic UI, smooth page transitions
- Fully responsive (mobile bottom nav + desktop top bar)

### Security & hardening
- Privacy-gated media (`/api/media`), magic-byte file validation, upload size limits
- Rate limiting (in-memory, **Upstash Redis** when configured)
- DM message text **AES-256-GCM encrypted at rest**
- SEO / Open Graph link previews for public posts & profiles

## Tech stack

| Layer | Choice |
|---|---|
| Framework | **Next.js 16** (App Router, Turbopack) + TypeScript |
| Styling | **Tailwind CSS 4** |
| ORM / DB | **Prisma 6** + **MongoDB Atlas** |
| Auth | JWT (`jose`) in httpOnly cookies + `bcryptjs` |
| Media | MongoDB (bytes) or **Vercel Blob** (auto-detected) |
| Email | Resend or Gmail SMTP (`nodemailer`) |
| Rate limit | In-memory or Upstash Redis |
| Hosting | Vercel |

## Getting started

```bash
npm install
# create .env with the values below
npm run db:push           # push the Prisma schema to MongoDB
npm run seed              # optional: demo users + posts
npm run dev               # http://localhost:3000
```

### Environment variables (`.env`)

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | ✅ | MongoDB Atlas connection string |
| `JWT_SECRET` | ✅ | Signs auth tokens (also derives the DM key if `DM_ENCRYPTION_KEY` is unset) |
| `GOOGLE_CLIENT_ID` / `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | – | Sign in with Google |
| `EMAIL_USER` / `EMAIL_PASS` | – | Gmail App Password for reset emails |
| `RESEND_API_KEY` / `EMAIL_FROM` | – | Resend (alternative to Gmail) |
| `BLOB_READ_WRITE_TOKEN` | – | Use Vercel Blob for uploads (else MongoDB) |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | – | Distributed rate limiting |
| `DM_ENCRYPTION_KEY` | – | Dedicated key for DM encryption at rest |
| `ADMIN_EMAILS` | – | Comma-separated emails that can access `/admin/reports` |
| `NEXT_PUBLIC_SITE_URL` | – | Canonical URL for Open Graph previews |

> `.env` is gitignored — keep all secrets there and in your Vercel project settings, never in git.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | `prisma generate` + production build |
| `npm run db:push` | Push schema to MongoDB |
| `npm run seed` | Seed demo data |

## Notes
- MongoDB has no DB-level cascades — relational cleanup is handled in app code.
- DMs poll every 4s (simple + reliable on serverless); swap for SSE/websockets for true real-time.
- The light theme is a CSS remap of the dark palette, not a full per-component variant.
