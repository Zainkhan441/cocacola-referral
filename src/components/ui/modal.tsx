"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

type ModalProps = {
  onClose: () => void;
  title: string;
  children: ReactNode;
};

export function Modal({ onClose, title, children }: ModalProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-white/10 bg-surface-2 shadow-2xl">
        <div className="flex flex-shrink-0 items-center justify-between border-b border-white/10 px-6 py-4">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
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
