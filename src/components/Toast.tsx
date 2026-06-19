"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

type ToastKind = "success" | "error" | "info";
type Toast = { id: number; message: string; kind: ToastKind };

type ToastApi = {
  toast: (message: string, kind?: ToastKind) => void;
  success: (message: string) => void;
  error: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

let counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, kind: ToastKind = "info") => {
      const id = ++counter;
      setToasts((t) => [...t, { id, message, kind }]);
      setTimeout(() => remove(id), 3500);
    },
    [remove]
  );

  const api: ToastApi = {
    toast,
    success: (m) => toast(m, "success"),
    error: (m) => toast(m, "error"),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[100] flex flex-col items-center gap-2 px-4 md:bottom-6">
        {toasts.map((t) => (
          <button
            key={t.id}
            onClick={() => remove(t.id)}
            className={`folo-toast pointer-events-auto flex max-w-sm items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium shadow-lg ring-1 backdrop-blur ${
              t.kind === "success"
                ? "bg-emerald-950/90 text-emerald-200 ring-emerald-800"
                : t.kind === "error"
                  ? "bg-red-950/90 text-red-200 ring-red-800"
                  : "bg-zinc-900/90 text-zinc-100 ring-zinc-700"
            }`}
          >
            <span aria-hidden>
              {t.kind === "success" ? "✓" : t.kind === "error" ? "⚠" : "ℹ"}
            </span>
            <span>{t.message}</span>
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
