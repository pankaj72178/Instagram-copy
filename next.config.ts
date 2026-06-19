import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project (a stray lockfile elsewhere on the
  // machine otherwise confuses Next's root inference).
  turbopack: {
    root: dirname(fileURLToPath(import.meta.url)),
  },
  // Optimize remote CDN images (Vercel Blob + Google avatars). Same-origin
  // /api/media and /uploads keep `unoptimized` (set per-<Image> in Avatar).
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
