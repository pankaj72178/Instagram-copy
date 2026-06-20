"use client";

import { useEffect, useState } from "react";

type Theme = "dark" | "light";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const saved = (localStorage.getItem("theme") as Theme) || "dark";
    setTheme(saved);
  }, []);

  function apply(t: Theme) {
    setTheme(t);
    try {
      localStorage.setItem("theme", t);
    } catch {}
    document.documentElement.classList.toggle("light", t === "light");
  }

  return (
    <div className="flex items-center justify-between rounded-xl bg-zinc-950 p-4 ring-1 ring-zinc-800">
      <div>
        <p className="font-medium">Appearance</p>
        <p className="text-sm text-zinc-500">Switch between dark and light themes.</p>
      </div>
      <div className="flex rounded-lg bg-zinc-800 p-1 ring-1 ring-zinc-700">
        {(["dark", "light"] as Theme[]).map((t) => (
          <button
            key={t}
            onClick={() => apply(t)}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold capitalize transition ${
              theme === t ? "bg-indigo-600 text-white" : "text-zinc-300 hover:text-zinc-100"
            }`}
          >
            {t === "dark" ? "🌙 Dark" : "☀️ Light"}
          </button>
        ))}
      </div>
    </div>
  );
}
