"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { startTaskWatch, completeTaskWatch, TASK_MIN_WATCH_SECONDS } from "@/features/tasks/lib/actions";
import { getAuthErrorMessage } from "@/features/auth/lib/auth-errors";

function extractYouTubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtu.be") return parsed.pathname.slice(1) || null;
    if (host === "youtube.com") {
      if (parsed.pathname === "/watch") return parsed.searchParams.get("v");
      if (parsed.pathname.startsWith("/embed/")) return parsed.pathname.replace("/embed/", "");
      if (parsed.pathname.startsWith("/shorts/")) return parsed.pathname.replace("/shorts/", "");
    }
    return null;
  } catch {
    return null;
  }
}

// Loaded once per page, shared by every YouTube player on it.
let youTubeApiPromise: Promise<void> | null = null;
function loadYouTubeIframeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if ((window as unknown as { YT?: unknown }).YT) return Promise.resolve();
  if (youTubeApiPromise) return youTubeApiPromise;

  youTubeApiPromise = new Promise((resolve) => {
    const existingCallback = (window as unknown as { onYouTubeIframeAPIReady?: () => void })
      .onYouTubeIframeAPIReady;
    (window as unknown as { onYouTubeIframeAPIReady: () => void }).onYouTubeIframeAPIReady = () => {
      existingCallback?.();
      resolve();
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  });
  return youTubeApiPromise;
}

type VideoTaskPlayerProps = {
  uid: string;
  taskId: string;
  videoUrl: string;
  onCompleted: () => void;
};

export function VideoTaskPlayer({ uid, taskId, videoUrl, onCompleted }: VideoTaskPlayerProps) {
  const youTubeVideoId = extractYouTubeVideoId(videoUrl);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<{ destroy: () => void } | null>(null);

  const [ready, setReady] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(TASK_MIN_WATCH_SECONDS);
  const [videoEnded, setVideoEnded] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Start is fire-and-forget: safe to call on every mount, harmless no-op
  // if already started today (see startTaskWatch's own idempotency).
  useEffect(() => {
    startTaskWatch(uid, taskId).catch(() => {
      // Non-fatal — Complete will simply fail with a clear error if the
      // start genuinely never landed.
    });
  }, [uid, taskId]);

  // Generic fallback: a 10s countdown that only ticks while the tab is
  // actually visible/focused — a best-effort anti-tab-switch measure. The
  // real, unconditional floor is enforced server-side by firestore.rules
  // against the task-completions doc's own startedAt, regardless of what
  // this timer shows.
  useEffect(() => {
    if (youTubeVideoId) return;
    let remaining = TASK_MIN_WATCH_SECONDS;
    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      remaining -= 1;
      setSecondsRemaining(Math.max(remaining, 0));
      if (remaining <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [youTubeVideoId]);

  // YouTube: load the IFrame API and use the real ENDED event.
  useEffect(() => {
    if (!youTubeVideoId || !containerRef.current) return;
    let cancelled = false;

    loadYouTubeIframeApi().then(() => {
      if (cancelled || !containerRef.current) return;
      const YT = (
        window as unknown as {
          YT: {
            Player: new (element: HTMLElement, options: Record<string, unknown>) => { destroy: () => void };
            PlayerState: { ENDED: number };
          };
        }
      ).YT;
      const player = new YT.Player(containerRef.current, {
        videoId: youTubeVideoId,
        events: {
          onReady: () => setReady(true),
          onStateChange: (event: { data: number }) => {
            if (event.data === YT.PlayerState.ENDED) setVideoEnded(true);
          },
        },
      });
      playerRef.current = player;
    });

    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [youTubeVideoId]);

  const canComplete = youTubeVideoId ? videoEnded : secondsRemaining <= 0;

  async function handleComplete() {
    if (completing || !canComplete) return;
    setError(null);
    setCompleting(true);
    try {
      await completeTaskWatch(uid, taskId);
      setDone(true);
      onCompleted();
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setCompleting(false);
    }
  }

  if (done) {
    return <Alert variant="success">Task completed for today.</Alert>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black">
        {youTubeVideoId ? (
          <div ref={containerRef} className="h-full w-full" />
        ) : (
          <iframe
            src={videoUrl}
            className="h-full w-full"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        )}
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {!canComplete && (
        <p className="text-xs text-white/50">
          {youTubeVideoId
            ? ready
              ? "Watch the video until the end to unlock Complete."
              : "Loading video…"
            : `You can mark this complete in ${secondsRemaining}s.`}
        </p>
      )}

      <Button size="md" disabled={!canComplete || completing} onClick={handleComplete}>
        {completing ? <Spinner /> : "Mark task complete"}
      </Button>
    </div>
  );
}
