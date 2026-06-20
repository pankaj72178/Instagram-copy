"use client";

import Image from "next/image";
import { useState } from "react";

// Same-origin dynamic media (/api/media, /uploads) is served as-is; only remote
// CDN images (Vercel Blob, Google) go through Next's optimizer.
function isRemote(url: string) {
  return /^https?:\/\//.test(url);
}

const SIZES: Record<string, string> = {
  xs: "h-7 w-7 text-xs",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-11 w-11 text-base",
  xl: "h-20 w-20 text-3xl sm:h-24 sm:w-24",
};
const PX: Record<string, number> = { xs: 28, sm: 32, md: 40, lg: 44, xl: 96 };

export default function Avatar({
  url,
  username,
  size = "sm",
  className = "",
  ring = false,
}: {
  url: string | null;
  username: string;
  size?: keyof typeof SIZES;
  className?: string;
  ring?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  const dim = SIZES[size];
  const px = PX[size];

  const inner =
    url && !broken ? (
      <Image
        src={url}
        alt={username}
        width={px}
        height={px}
        unoptimized={!isRemote(url)}
        onError={() => setBroken(true)}
        className={`${dim} rounded-full object-cover ${ring ? "" : "ring-1 ring-zinc-800"} ${className}`}
      />
    ) : (
      // Fallback: first letter on a tinted disc.
      <span
        className={`flex ${dim} items-center justify-center rounded-full bg-indigo-950 font-bold text-indigo-400 ${className}`}
        aria-label={username}
      >
        {username[0]?.toUpperCase() || "?"}
      </span>
    );

  if (ring) {
    return <span className="story-ring inline-block">{inner}</span>;
  }
  return inner;
}
