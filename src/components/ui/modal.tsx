"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// Kept in sync with the transition-duration classes below — the exit
// animation must finish playing before the parent's onClose actually
// unmounts this component, or it'd vanish instantly instead of fading out.
const EXIT_DURATION_MS = 180;

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type ModalProps = {
  onClose: () => void;
  title: string;
  children: ReactNode;
  // Some flows (e.g. a destructive confirmation) want an accidental click
  // outside the dialog to NOT dismiss it — defaults to true, matching every
  // existing caller's prior behavior.
  closeOnBackdropClick?: boolean;
};

// The single shared dialog shell — animated entrance/exit, ESC to close,
// a focus trap that cycles Tab/Shift+Tab within the dialog, and restores
// focus to whatever triggered it on close. Every specific dialog (confirm,
// delete-user, screenshot-delete, package purchase, etc.) is built on top
// of this one primitive so all of it only needs to be correct once.
export function Modal({ onClose, title, children, closeOnBackdropClick = true }: ModalProps) {
  const [entered, setEntered] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerElementRef = useRef<HTMLElement | null>(null);

  // Entrance animation: mount in the "closed" visual state, then flip to
  // "entered" one frame later so the transition classes actually animate
  // instead of snapping straight to their end state.
  useEffect(() => {
    triggerElementRef.current = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() => setEntered(true));
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = "";
      triggerElementRef.current?.focus?.();
    };
  }, []);

  // Exit animation: play the reverse transition, then call the real
  // onClose (which is what actually unmounts this component) once it's
  // finished — every internal dismissal path (ESC, backdrop, the X button)
  // routes through this so none of them just vanish instantly.
  function requestClose() {
    setEntered(false);
    window.setTimeout(onClose, EXIT_DURATION_MS);
  }

  useEffect(() => {
    // Only steal focus to the panel container if a child hasn't already
    // claimed it (e.g. a button with autoFocus) — this effect runs after
    // React applies autoFocus during mount, so checking first preserves
    // whichever specific control a caller wanted focused by default.
    if (!panelRef.current?.contains(document.activeElement)) {
      panelRef.current?.focus();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        requestClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const focusables = panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className={cn(
          "absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-200 ease-out",
          entered ? "opacity-100" : "opacity-0",
        )}
        onClick={closeOnBackdropClick ? requestClose : undefined}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        className={cn(
          "relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-white/10 bg-surface-2 shadow-2xl transition-all duration-200 ease-out",
          entered ? "translate-y-0 scale-100 opacity-100" : "translate-y-3 scale-95 opacity-0",
        )}
      >
        <div className="flex flex-shrink-0 items-center justify-between border-b border-white/10 px-6 py-4">
          <h2 id="modal-title" className="text-lg font-bold text-white">
            {title}
          </h2>
          <button
            type="button"
            onClick={requestClose}
            className="rounded-full p-1.5 text-white/50 transition-colors hover:bg-white/5 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}
