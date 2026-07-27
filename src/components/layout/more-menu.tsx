"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type MoreMenuLink = {
  label: string;
  href: string;
};

type MoreMenuProps = {
  links: readonly MoreMenuLink[];
  pathname: string;
};

// Matches the panel's own w-56 (14rem) and the margin kept from the
// viewport edge when clamping its position.
const MENU_WIDTH_PX = 224;
const VIEWPORT_MARGIN_PX = 16;

// Shared "More" dropdown — used by both the user-facing AppHeader and the
// AdminShell so every secondary nav link stays reachable without growing
// the primary pill row unbounded.
//
// Both headers wrap their pill row in an `overflow-x-auto` nav (the mobile
// edge-fade scroll affordance) — per the CSS overflow spec, setting
// overflow-x to anything but `visible` forces overflow-y to become a
// clipping context too if it isn't set explicitly, which was silently
// clipping this dropdown's panel every time it opened. Rendered through a
// portal into document.body instead: a fixed-position panel positioned from
// the trigger button's own measured rect, so it always escapes that (or any
// future) clipping/stacking ancestor entirely, regardless of overflow,
// transform, or filter on anything in between.
export function MoreMenu({ links, pathname }: MoreMenuProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isActive = links.some((link) => pathname === link.href || pathname.startsWith(`${link.href}/`));

  function updatePosition() {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    // Left-align with the button by default; flip to right-align with it
    // instead whenever that would overflow the viewport's right edge (the
    // common case for a "More" pill sitting near the end of the row).
    let left = rect.left;
    if (left + MENU_WIDTH_PX > window.innerWidth - VIEWPORT_MARGIN_PX) {
      left = rect.right - MENU_WIDTH_PX;
    }
    left = Math.max(VIEWPORT_MARGIN_PX, left);
    setPosition({ top: rect.bottom + 8, left });
  }

  // Runs before paint so the very first open never flashes at (0, 0).
  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    // capture: true so this also catches scrolling inside the overflow-x-auto
    // nav itself, not just window-level scroll.
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  return (
    <div className="relative flex-shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium transition-colors",
          isActive ? "bg-brand text-white" : "text-white/60 hover:bg-white/5 hover:text-white",
        )}
      >
        More
        <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      {open && position &&
        createPortal(
          <div
            ref={menuRef}
            style={{ top: position.top, left: position.left }}
            className="animate-fade-in-up fixed z-50 max-h-[70vh] w-56 overflow-y-auto rounded-2xl border border-white/10 bg-surface-2 p-1.5 shadow-xl"
          >
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "block rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                  pathname === link.href
                    ? "bg-brand text-white"
                    : "text-white/70 hover:bg-white/5 hover:text-white",
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
