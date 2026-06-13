"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Initial = {
  username: string;
  displayName: string;
  bio: string | null;
  isPrivate: boolean;
  avatarUrl: string | null;
};

export default function EditProfileForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [bio, setBio] = useState(initial.bio ?? "");
  const [isPrivate, setIsPrivate] = useState(initial.isPrivate);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("displayName", displayName);
      fd.set("bio", bio);
      fd.set("isPrivate", String(isPrivate));
      if (avatar) fd.set("avatar", avatar);

      const res = await fetch("/api/profile", { method: "PATCH", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not save");
        return;
      }
      setSaved(true);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "w-full rounded-xl border border-zinc-700 px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200";

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-600">{error}</p>}
      {saved && <p className="rounded-lg bg-green-50 p-3 text-sm font-medium text-green-700">Profile saved ✓</p>}

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-200">Display name</label>
        <input className={inputCls} value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={50} required />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-200">Bio</label>
        <textarea className={inputCls} rows={3} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={160} placeholder="Tell people about yourself" />
        <p className="mt-1 text-right text-xs text-zinc-400">{bio.length}/160</p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-200">Avatar</label>
        <input type="file" accept="image/*" onChange={(e) => setAvatar(e.target.files?.[0] ?? null)} className="block w-full text-sm text-zinc-300 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-950 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-indigo-400" />
      </div>

      <label className="flex cursor-pointer items-center justify-between rounded-xl bg-zinc-950 p-4 ring-1 ring-zinc-800">
        <span>
          <span className="block font-medium">Private account</span>
          <span className="block text-sm text-zinc-500">Only approved followers can see your posts.</span>
        </span>
        <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} className="h-5 w-5 accent-indigo-600" />
      </label>

      <button type="submit" disabled={busy} className="w-full rounded-xl bg-indigo-600 py-2.5 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60">
        {busy ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
