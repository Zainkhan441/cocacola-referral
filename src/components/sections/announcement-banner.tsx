"use client";

import Link from "next/link";
import { usePublishedAnnouncements } from "@/features/pages/hooks/use-published-announcements";

// Site-wide announcement strip shown above the hero — renders nothing while
// loading or when there are no currently-active announcements, so it never
// shows placeholder content.
export function AnnouncementBanner() {
  const { announcements } = usePublishedAnnouncements();
  if (announcements.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 border-b border-white/10 bg-brand/10">
      {announcements.map((item) => {
        const isExternal = item.buttonUrl ? /^https?:\/\//i.test(item.buttonUrl) : false;
        return (
          <div
            key={item.id}
            className="flex flex-col items-center justify-center gap-2 px-6 py-2.5 text-center sm:flex-row sm:gap-3"
          >
            <p className="text-sm text-white">
              <span className="font-semibold">{item.title}</span>{" "}
              <span className="text-white/70">{item.message}</span>
            </p>
            {item.buttonLabel && item.buttonUrl && (
              <Link
                href={item.buttonUrl}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
                className="flex-shrink-0 text-xs font-semibold text-brand-light underline underline-offset-2"
              >
                {item.buttonLabel}
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}
