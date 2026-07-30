"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { CheckCircle2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

// THE single place the bottle artwork is referenced. This now points at
// the final bottle photo (public/images/task-bottle.png) — to swap it
// again later, replace that file (keep the same filename/extension, or
// update this one constant if the replacement uses a different
// name/format) — nothing else in the task system needs to change.
export const BOTTLE_IMAGE_SRC = "/images/task-bottle.png";

export type BottleState = "locked" | "available" | "active" | "completed";

type BottleIconProps = {
  state: BottleState;
  className?: string;
};

// All state styling (dimming, highlight ring, completed badge) is applied
// as CSS layered on top of the single <img> reference above — never baked
// into the artwork itself — so any future replacement image (whatever its
// own colors/style) automatically gets correct locked/active/completed
// treatment with no code change beyond the one constant above.
export function BottleIcon({ state, className }: BottleIconProps) {
  // A brief, one-time scale+glow pulse exactly when this bottle transitions
  // INTO "completed" — never replays on every re-render (e.g. a parent
  // refresh, or reopening an already-completed bottle later), only on the
  // real state change, and it never touches any reward/timer/Firestore
  // logic — purely a CSS class applied for ~280ms.
  const prevStateRef = useRef(state);
  const [justCompleted, setJustCompleted] = useState(false);

  useEffect(() => {
    if (state === "completed" && prevStateRef.current !== "completed") {
      setJustCompleted(true);
      const timeout = setTimeout(() => setJustCompleted(false), 280);
      prevStateRef.current = state;
      return () => clearTimeout(timeout);
    }
    prevStateRef.current = state;
  }, [state]);

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <Image
        src={BOTTLE_IMAGE_SRC}
        alt=""
        aria-hidden="true"
        fill
        sizes="160px"
        className={cn(
          "object-contain transition-all duration-200",
          state === "locked" && "opacity-30 grayscale",
          state === "available" && "text-white/70 opacity-90",
          state === "active" && "scale-105 text-brand-light drop-shadow-[0_0_14px_rgba(230,57,70,0.55)]",
          state === "completed" && "text-emerald-400 opacity-95",
          justCompleted && "scale-110 drop-shadow-[0_0_22px_rgba(16,185,129,0.85)]",
        )}
      />

      {state === "active" && (
        <span
          className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-brand/70 ring-offset-2 ring-offset-surface-2"
          aria-hidden="true"
        />
      )}

      {state === "completed" && (
        // Deliberately overlaps the bottle's own top-right corner (not
        // tucked fully outside it) so it reads immediately as "attached to
        // this bottle" rather than a separate floating badge — stays
        // visible until the Pakistan daily reset naturally clears the
        // underlying completedToday flag upstream.
        <span
          className={cn(
            "absolute -right-1.5 -top-1.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface-2 bg-emerald-500 text-white shadow-lg transition-transform duration-300",
            justCompleted && "scale-110",
          )}
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        </span>
      )}

      {state === "locked" && (
        <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-white/50">
          <Lock className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      )}
    </div>
  );
}
