"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import LogoutButton from "./LogoutButton";

type NavUser = { username: string; avatarUrl: string | null };

const links = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/explore", label: "Explore", icon: SearchIcon },
  { href: "/upload", label: "Create", icon: PlusIcon },
  { href: "/messages", label: "Messages", icon: MessageIcon },
  { href: "/notifications", label: "Activity", icon: HeartIcon },
];

export default function Nav({ user, unread = 0 }: { user: NavUser | null; unread?: number }) {
  const pathname = usePathname();
  if (!user) return null;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const Badge = ({ href }: { href: string }) =>
    href === "/messages" && unread > 0 ? (
      <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white">
        {unread > 9 ? "9+" : unread}
      </span>
    ) : null;

  return (
    <>
      {/* Top bar (desktop) */}
      <header className="sticky top-0 z-40 hidden border-b border-zinc-800 bg-zinc-900/90 backdrop-blur md:block">
        <nav className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link href="/" className="text-brand text-xl font-extrabold tracking-tight">
            Folo
          </Link>
          <div className="flex items-center gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive(l.href) ? "bg-indigo-950 text-indigo-400" : "text-zinc-300 hover:bg-zinc-800"
                }`}
              >
                <span className="relative">
                  <l.icon className="h-5 w-5" />
                  <Badge href={l.href} />
                </span>
                {l.label}
              </Link>
            ))}
            <Link
              href={`/${user.username}`}
              className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium transition ${
                pathname === `/${user.username}` ? "bg-indigo-950" : "hover:bg-zinc-800"
              }`}
            >
              <Avatar url={user.avatarUrl} username={user.username} />
            </Link>
            <LogoutButton className="ml-1 rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 hover:bg-zinc-800" />
          </div>
        </nav>
      </header>

      {/* Bottom bar (mobile) */}
      <nav className="fixed bottom-0 left-0 z-40 flex w-full items-center justify-around border-t border-zinc-800 bg-zinc-900/95 px-2 py-2 backdrop-blur md:hidden">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            aria-label={l.label}
            className={`relative rounded-lg p-2 ${isActive(l.href) ? "text-indigo-400" : "text-zinc-500"}`}
          >
            <l.icon className="h-6 w-6" />
            <Badge href={l.href} />
          </Link>
        ))}
        <Link href={`/${user.username}`} aria-label="Profile" className="rounded-lg p-1">
          <Avatar url={user.avatarUrl} username={user.username} />
        </Link>
      </nav>
    </>
  );
}

function Avatar({ url, username }: { url: string | null; username: string }) {
  if (url) {
    return (
      <Image
        src={url}
        alt={username}
        width={28}
        height={28}
        className="h-7 w-7 rounded-full object-cover ring-1 ring-zinc-800"
        unoptimized
      />
    );
  }
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-950 text-xs font-bold text-indigo-400">
      {username[0]?.toUpperCase()}
    </span>
  );
}

/* --- tiny inline icons (no extra deps) --- */
function HomeIcon(p: React.SVGProps<SVGSVGElement>) {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></svg>);
}
function SearchIcon(p: React.SVGProps<SVGSVGElement>) {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>);
}
function PlusIcon(p: React.SVGProps<SVGSVGElement>) {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><rect x="3" y="3" width="18" height="18" rx="5" /><path d="M12 8v8M8 12h8" /></svg>);
}
function HeartIcon(p: React.SVGProps<SVGSVGElement>) {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M12 21s-7-4.6-9.3-9.2C1 8.5 2.7 5 6 5c2 0 3.2 1.2 4 2.3C10.8 6.2 12 5 14 5c3.3 0 5 3.5 3.3 6.8C19 16.4 12 21 12 21z" /></svg>);
}
function MessageIcon(p: React.SVGProps<SVGSVGElement>) {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="m22 2-7 20-4-9-9-4 20-7z" /><path d="M22 2 11 13" /></svg>);
}
