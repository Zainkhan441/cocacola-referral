"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
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

// All state styling (dimming, highlight ring, glow) is applied as CSS
// layered on top of the single <img> reference above — never baked into
// the artwork itself — so any future replacement image (whatever its own
// colors/style) automatically gets correct locked/active/completed
// treatment with no code change beyond the one constant above. Deliberately
// renders no separate corner badges/marks — locked/completed protection is
// enforced purely by the caller's disabled/click-guard logic, not by any
// visible indicator on the bottle itself.
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
    <div
      className={cn(
        "relative flex items-center justify-center",
        // Gentle idle float — active bottles only (the ones a user still
        // needs to act on); completed/locked/available stay perfectly
        // still. Lives on this wrapper (not the <Image> below) so it
        // composes independently of the Image's own hover
        // scale/drop-shadow transform rather than fighting over a single
        // `transform` property. Hovering pauses it (rather than fighting
        // it) via the ancestor button's `group` class, so the hover scale
        // reads as a clean, deliberate reaction instead of jittering
        // against ongoing motion.
        state === "active" && "animate-bottle-float group-hover:[animation-play-state:paused]",
        className,
      )}
    >
      <Image
        src={BOTTLE_IMAGE_SRC}
        alt=""
        aria-hidden="true"
        fill
        sizes="160px"
        className={cn(
          // Every state change (active/completed/locked/available) eases
          // through this same 300ms ease-out transition — no sudden jumps.
          "object-contain transition-all duration-300 ease-out",
          state === "locked" && "cursor-not-allowed opacity-30 grayscale",
          state === "available" && "cursor-pointer text-white/70 opacity-90",
          state === "active" && "cursor-pointer scale-105 text-brand-light drop-shadow-[0_0_14px_rgba(230,57,70,0.55)]",
          // Fully visible, original colors — only a soft, low-intensity
          // green glow is added (not a color/opacity change to the bottle
          // itself), and it persists for as long as state stays
          // "completed" (i.e. until the Pakistan daily reset clears the
          // underlying completedToday flag upstream).
          state === "completed" && "cursor-pointer drop-shadow-[0_0_11px_rgba(16,185,129,0.4)]",
          // Hover feedback only for genuinely clickable, not-yet-completed
          // bottles (available/active) — completed bottles deliberately
          // keep their steady glow without any extra hover scaling, and
          // locked bottles get no hover treatment at all.
          (state === "available" || state === "active") &&
            "group-hover:scale-105 group-hover:drop-shadow-[0_0_16px_rgba(226,35,26,0.5)]",
          // The existing one-time completion pulse — stronger and brief,
          // overrides the soft persistent glow above for ~280ms via
          // tailwind-merge's normal last-wins conflict resolution, then
          // settles back into it. Unchanged from before.
          justCompleted && "scale-110 drop-shadow-[0_0_22px_rgba(16,185,129,0.85)]",
        )}
      />

      {state === "active" && (
        <span
          className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-brand/70 ring-offset-2 ring-offset-surface-2"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
