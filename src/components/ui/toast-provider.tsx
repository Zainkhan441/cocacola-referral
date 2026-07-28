"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { ToastViewport, TOAST_EXIT_DURATION_MS, type ToastItem, type ToastVariant } from "@/components/ui/toast";

const AUTO_DISMISS_MS = 4000;

type ToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

// App-wide toast notifications, mounted once at the root layout —
// `useToast().success("...")` etc. is the replacement for showing an
// alert() after a successful action, styled to match the rest of the app
// and auto-dismissing instead of blocking the page.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [leavingIds, setLeavingIds] = useState<ReadonlySet<string>>(new Set());
  const nextId = useRef(0);

  const dismiss = useCallback((id: string) => {
    setLeavingIds((prev) => new Set(prev).add(id));
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      setLeavingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, TOAST_EXIT_DURATION_MS);
  }, []);

  const show = useCallback(
    (variant: ToastVariant, message: string) => {
      const id = `toast-${Date.now()}-${nextId.current++}`;
      setToasts((prev) => [...prev, { id, variant, message }]);
      window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss],
  );

  const api: ToastApi = {
    success: (message) => show("success", message),
    error: (message) => show("error", message),
    warning: (message) => show("warning", message),
    info: (message) => show("info", message),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} leavingIds={leavingIds} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
