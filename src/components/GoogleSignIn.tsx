"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// Renders the official Google Sign-In button (Google Identity Services, loaded
// in the root layout). On success it posts the credential to /api/auth/google.
// Renders nothing if NEXT_PUBLIC_GOOGLE_CLIENT_ID isn't set.
declare global {
  interface Window {
    google?: any;
  }
}

export default function GoogleSignIn() {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId) return;
    let tries = 0;
    const timer = setInterval(() => {
      if (window.google?.accounts?.id && ref.current) {
        clearInterval(timer);
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (resp: { credential: string }) => {
            const res = await fetch("/api/auth/google", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ credential: resp.credential }),
            });
            if (res.ok) {
              router.push("/");
              router.refresh();
            }
          },
        });
        window.google.accounts.id.renderButton(ref.current, {
          theme: "outline",
          size: "large",
          width: 300,
          text: "continue_with",
          shape: "pill",
        });
      } else if (++tries > 50) {
        clearInterval(timer);
      }
    }, 100);
    return () => clearInterval(timer);
  }, [clientId, router]);

  if (!clientId) return null;
  return (
    <div className="my-4">
      <div className="mb-3 flex items-center gap-3 text-xs uppercase tracking-wide text-zinc-400">
        <span className="h-px flex-1 bg-zinc-700" /> or <span className="h-px flex-1 bg-zinc-700" />
      </div>
      <div ref={ref} className="flex justify-center" />
    </div>
  );
}
