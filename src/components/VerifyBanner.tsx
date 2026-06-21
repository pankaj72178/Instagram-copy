"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Thin reminder shown to signed-in users who haven't verified their email.
export default function VerifyBanner() {
  const pathname = usePathname();
  if (pathname === "/verify-email") return null;
  return (
    <div className="bg-amber-950/60 px-4 py-2 text-center text-sm text-amber-200 ring-1 ring-amber-900/60">
      Verify your email to secure your account.{" "}
      <Link href="/verify-email" className="font-semibold underline hover:text-amber-100">
        Verify now
      </Link>
    </div>
  );
}
