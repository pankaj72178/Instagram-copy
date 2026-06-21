"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Avatar from "@/components/Avatar";
import { useToast } from "@/components/Toast";

type StoryItem = { id: string; mediaUrl: string; mediaType: string; createdAt: string; seen: boolean };
type StoryGroup = {
  username: string;
  avatarUrl: string | null;
  isMe: boolean;
  hasUnseen: boolean;
  stories: StoryItem[];
};

export default function Stories({ myUsername, myAvatar }: { myUsername: string; myAvatar: string | null }) {
  const toast = useToast();
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [viewerAt, setViewerAt] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/stories", { cache: "no-store" });
      if (r.ok) setGroups((await r.json()).groups);
    } catch {}
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function addStory(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setAdding(true);
    try {
      const fd = new FormData();
      fd.set("media", f);
      const res = await fetch("/api/stories", { method: "POST", body: fd });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) toast.error(d.error || "Couldn't add story");
      else {
        toast.success("Story added");
        await load();
      }
    } finally {
      setAdding(false);
      e.target.value = "";
    }
  }

  const myGroup = groups.find((g) => g.isMe);
  const others = groups.filter((g) => !g.isMe);

  return (
    <>
      <div className="mb-4 flex gap-4 overflow-x-auto pb-1">
        {/* Your story */}
        <div className="flex shrink-0 flex-col items-center gap-1">
          <button
            onClick={() => (myGroup ? setViewerAt(groups.indexOf(myGroup)) : fileRef.current?.click())}
            className="relative"
            disabled={adding}
            aria-label={myGroup ? "View your story" : "Add a story"}
          >
            <Avatar url={myAvatar} username={myUsername} size="lg" ring={!!myGroup} />
            <span
              onClick={(e) => {
                e.stopPropagation();
                fileRef.current?.click();
              }}
              className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white ring-2 ring-zinc-950"
            >
              +
            </span>
          </button>
          <span className="text-xs text-zinc-400">{adding ? "Adding…" : "Your story"}</span>
        </div>

        {others.map((g) => (
          <button
            key={g.username}
            onClick={() => setViewerAt(groups.indexOf(g))}
            className="flex shrink-0 flex-col items-center gap-1"
          >
            <Avatar url={g.avatarUrl} username={g.username} size="lg" ring={g.hasUnseen} />
            <span className="max-w-16 truncate text-xs text-zinc-400">{g.username}</span>
          </button>
        ))}

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
          onChange={addStory}
          className="hidden"
        />
      </div>

      {viewerAt !== null && groups[viewerAt] && (
        <StoryViewer
          groups={groups}
          startGroup={viewerAt}
          myUsername={myUsername}
          onClose={() => {
            setViewerAt(null);
            load();
          }}
        />
      )}
    </>
  );
}

function StoryViewer({
  groups,
  startGroup,
  myUsername,
  onClose,
}: {
  groups: StoryGroup[];
  startGroup: number;
  myUsername: string;
  onClose: () => void;
}) {
  const [gi, setGi] = useState(startGroup);
  const [si, setSi] = useState(0);
  const group = groups[gi];
  const story = group?.stories[si];

  const advance = useCallback(() => {
    setSi((prevSi) => {
      const g = groups[gi];
      if (prevSi < g.stories.length - 1) return prevSi + 1;
      // move to next group
      if (gi < groups.length - 1) {
        setGi(gi + 1);
        return 0;
      }
      onClose();
      return prevSi;
    });
  }, [gi, groups, onClose]);

  function back() {
    setSi((prevSi) => {
      if (prevSi > 0) return prevSi - 1;
      if (gi > 0) {
        const pg = groups[gi - 1];
        setGi(gi - 1);
        return pg.stories.length - 1;
      }
      return 0;
    });
  }

  // Mark viewed + auto-advance images after 5s.
  useEffect(() => {
    if (!story) return;
    fetch(`/api/stories/${story.id}/view`, { method: "POST" }).catch(() => {});
    if (story.mediaType === "IMAGE") {
      const t = setTimeout(advance, 5000);
      return () => clearTimeout(t);
    }
  }, [story, advance]);

  // Esc to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") advance();
      if (e.key === "ArrowLeft") back();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advance]);

  async function deleteStory() {
    if (!story || !confirm("Delete this story?")) return;
    await fetch(`/api/stories/${story.id}`, { method: "DELETE" });
    advance();
  }

  if (!group || !story) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black">
      <div className="relative h-full w-full max-w-md">
        {/* progress bars */}
        <div className="absolute inset-x-0 top-2 z-20 flex gap-1 px-3">
          {group.stories.map((s, i) => (
            <div key={s.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
              <div
                className={`h-full bg-white ${i < si ? "w-full" : i === si ? "story-progress" : "w-0"}`}
                key={i === si ? `${gi}-${si}` : s.id}
              />
            </div>
          ))}
        </div>

        {/* header */}
        <div className="absolute inset-x-0 top-5 z-20 flex items-center gap-2 px-3 pt-2 text-white">
          <Avatar url={group.avatarUrl} username={group.username} size="sm" />
          <span className="text-sm font-semibold">{group.username}</span>
          <span className="ml-auto flex items-center gap-3">
            {group.username === myUsername && (
              <button onClick={deleteStory} aria-label="Delete story" className="text-sm hover:text-red-400">
                Delete
              </button>
            )}
            <button onClick={onClose} aria-label="Close" className="text-2xl leading-none">
              ×
            </button>
          </span>
        </div>

        {/* media */}
        {story.mediaType === "VIDEO" ? (
          <video
            key={story.id}
            src={story.mediaUrl}
            autoPlay
            playsInline
            onEnded={advance}
            className="h-full w-full bg-black object-contain"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={story.id} src={story.mediaUrl} alt="" className="h-full w-full object-contain" />
        )}

        {/* tap zones */}
        <button onClick={back} aria-label="Previous" className="absolute inset-y-0 left-0 z-10 w-1/3" />
        <button onClick={advance} aria-label="Next" className="absolute inset-y-0 right-0 z-10 w-2/3" />
      </div>
    </div>
  );
}
