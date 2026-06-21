"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import Lightbox from "@/components/Lightbox";
import { useToast } from "@/components/Toast";
import { timeAgo } from "@/lib/format";

type Message = {
  id: string;
  text: string;
  imageUrl: string | null;
  mine: boolean;
  createdAt: string;
};

export default function Thread({
  other,
  initialMessages,
  initialOnline = false,
}: {
  other: { username: string; displayName: string; avatarUrl: string | null };
  initialMessages: Message[];
  initialOnline?: boolean;
}) {
  const toast = useToast();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [online, setOnline] = useState(initialOnline);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [zoom, setZoom] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lastTypingPing = useRef(0);

  const scrollToBottom = () =>
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  useEffect(scrollToBottom, [messages.length, typing]);

  // Poll for new messages + presence/typing every 4s.
  useEffect(() => {
    const tick = async () => {
      try {
        const res = await fetch(`/api/messages/${other.username}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        setMessages((prev) => (data.messages.length !== prev.length ? data.messages : prev));
        setTyping(!!data.typing);
        setOnline(!!data.other?.online);
        setLastSeen(data.other?.lastActiveAt ?? null);
      } catch {}
    };
    const id = setInterval(tick, 4000);
    return () => clearInterval(id);
  }, [other.username]);

  function onType(v: string) {
    setText(v);
    const now = Date.now();
    if (now - lastTypingPing.current > 3000) {
      lastTypingPing.current = now;
      fetch(`/api/messages/${other.username}/typing`, { method: "POST" }).catch(() => {});
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    setText("");
    try {
      const res = await fetch(`/api/messages/${other.username}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Couldn't send message");
        setText(value);
        return;
      }
      setMessages((m) => [...m, data.message]);
    } finally {
      setSending(false);
    }
  }

  async function sendImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSending(true);
    try {
      const fd = new FormData();
      fd.set("media", file);
      const res = await fetch(`/api/messages/${other.username}`, { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) toast.error(data.error || "Couldn't send image");
      else setMessages((m) => [...m, data.message]);
    } finally {
      setSending(false);
      e.target.value = "";
    }
  }

  const status = typing
    ? "typing…"
    : online
      ? "Active now"
      : lastSeen
        ? `Active ${timeAgo(lastSeen)}`
        : other.displayName;

  return (
    <main className="mx-auto flex h-[calc(100vh-3.5rem-5rem)] w-full max-w-xl flex-1 flex-col md:h-[calc(100vh-3.5rem)]">
      {/* header */}
      <header className="flex items-center gap-3 border-b border-zinc-800 px-4 py-3">
        <Link href="/messages" aria-label="Back to messages" className="text-zinc-400 hover:text-zinc-100 md:hidden">
          ‹
        </Link>
        <Link href={`/${other.username}`} className="flex items-center gap-3">
          <span className="relative">
            <Avatar url={other.avatarUrl} username={other.username} size="md" />
            {online && (
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-zinc-950" />
            )}
          </span>
          <span>
            <span className="block text-sm font-semibold">{other.username}</span>
            <span className={`block text-xs ${typing ? "text-indigo-400" : "text-zinc-500"}`}>{status}</span>
          </span>
        </Link>
      </header>

      {/* messages */}
      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-zinc-500">
            <span className="text-3xl">👋</span>
            <p className="text-sm">Say hi to @{other.username}</p>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
              {m.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.imageUrl}
                  alt=""
                  onClick={() => setZoom(m.imageUrl)}
                  className="max-h-72 max-w-[75%] cursor-zoom-in rounded-2xl object-cover"
                />
              ) : (
                <span
                  className={`max-w-[75%] whitespace-pre-line break-words rounded-2xl px-4 py-2 text-sm ${
                    m.mine ? "bg-indigo-600 text-white" : "bg-zinc-800 text-zinc-100"
                  }`}
                >
                  {m.text}
                </span>
              )}
            </div>
          ))
        )}
        {typing && (
          <div className="flex justify-start">
            <span className="rounded-2xl bg-zinc-800 px-4 py-2 text-sm text-zinc-400">typing…</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* composer */}
      <form onSubmit={send} className="flex items-center gap-2 border-t border-zinc-800 px-4 py-3">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={sending}
          aria-label="Send a photo"
          className="shrink-0 rounded-full bg-zinc-800 p-2.5 text-zinc-300 hover:bg-zinc-700 disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="4" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" />
          </svg>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={sendImage}
          className="hidden"
        />
        <input
          value={text}
          onChange={(e) => onType(e.target.value)}
          placeholder={`Message @${other.username}…`}
          maxLength={2000}
          className="flex-1 rounded-full bg-zinc-800 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="rounded-full bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
        >
          Send
        </button>
      </form>

      {zoom && <Lightbox src={zoom} alt="" onClose={() => setZoom(null)} />}
    </main>
  );
}
