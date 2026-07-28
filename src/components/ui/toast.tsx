"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastVariant = "success" | "error" | "warning" | "info";

export type ToastItem = {
  id: string;
  variant: ToastVariant;
  message: string;
};

const VARIANT_STYLES: Record<ToastVariant, { icon: typeof CheckCircle2; className: string }> = {
  success: { icon: CheckCircle2, className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" },
  error: { icon: XCircle, className: "border-red-500/30 bg-red-500/10 text-red-300" },
  warning: { icon: AlertTriangle, className: "border-amber-500/30 bg-amber-500/10 text-amber-300" },
  info: { icon: Info, className: "border-sky-500/30 bg-sky-500/10 text-sky-300" },
};

const EXIT_DURATION_MS = 200;

type ToastCardProps = {
  toast: ToastItem;
  leaving: boolean;
  onDismiss: (id: string) => void;
};

// A single animated toast — slides/fades in on mount, and plays the reverse
// transition for EXIT_DURATION_MS before the parent actually removes it
// from the list (whether dismissed manually or auto-expired).
function ToastCard({ toast, leaving, onDismiss }: ToastCardProps) {
  const [entered, setEntered] = useState(false);
  const { icon: Icon, className } = VARIANT_STYLES[toast.variant];

  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const visible = entered && !leaving;

  return (
    <div
      role="status"
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border bg-surface-2 p-4 shadow-2xl backdrop-blur-sm transition-all duration-200 ease-out",
        className,
        visible ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0",
      )}
    >
      <Icon className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden="true" />
      <p className="flex-1 text-sm text-white/90">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="flex-shrink-0 rounded-full p-1 text-white/40 transition-colors hover:bg-white/5 hover:text-white"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

type ToastViewportProps = {
  toasts: ToastItem[];
  leavingIds: ReadonlySet<string>;
  onDismiss: (id: string) => void;
};

export function ToastViewport({ toasts, leavingIds, onDismiss }: ToastViewportProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2 sm:bottom-6 sm:right-6"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} leaving={leavingIds.has(toast.id)} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

export { EXIT_DURATION_MS as TOAST_EXIT_DURATION_MS };
