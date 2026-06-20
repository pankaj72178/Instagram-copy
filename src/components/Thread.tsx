"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import { useToast } from "@/components/Toast";

type Message = { id: string; text: string; mine: boolean; createdAt: string };

export default function Thread({
  other,
  initialMessages,
}: {
  other: { username: string; displayName: string; avatarUrl: string | null };
  initialMessages: Message[];
}) {
  const toast = useToast();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () =>
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });

  useEffect(scrollToBottom, [messages.length]);

  // Poll for new messages every 4s (also marks the other's messages read).
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/messages/${other.username}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        setMessages((prev) =>
          data.messages.length !== prev.length ? data.messages : prev
        );
      } catch {
        /* ignore transient poll errors */
      }
    }, 4000);
    return () => clearInterval(id);
  }, [other.username]);

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

  return (
    <main className="mx-auto flex h-[calc(100vh-3.5rem-5rem)] w-full max-w-xl flex-1 flex-col md:h-[calc(100vh-3.5rem)]">
      {/* header */}
      <header className="flex items-center gap-3 border-b border-zinc-800 px-4 py-3">
        <Link href="/messages" aria-label="Back to messages" className="text-zinc-400 hover:text-zinc-100 md:hidden">
          ‹
        </Link>
        <Link href={`/${other.username}`} className="flex items-center gap-3">
          <Avatar url={other.avatarUrl} username={other.username} size="md" />
          <span>
            <span className="block text-sm font-semibold">{other.username}</span>
            <span className="block text-xs text-zinc-500">{other.displayName}</span>
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
              <span
                className={`max-w-[75%] whitespace-pre-line break-words rounded-2xl px-4 py-2 text-sm ${
                  m.mine
                    ? "bg-indigo-600 text-white"
                    : "bg-zinc-800 text-zinc-100"
                }`}
              >
                {m.text}
              </span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* composer */}
      <form onSubmit={send} className="flex items-center gap-2 border-t border-zinc-800 px-4 py-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
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
    </main>
  );
}
