"use client";

import { useEffect, useRef, useState } from "react";
import { FirebaseError } from "firebase/app";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { startTaskWatch, completeTaskWatch } from "@/features/tasks/lib/actions";
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

// A permission-denied at THIS specific step (server rejected a completion
// the client thought was valid) gets a clear, task-specific explanation
// instead of getAuthErrorMessage's generic auth-flow fallback ("Something
// went wrong. Please try again.") — the exact gap that produced an
// unhelpful "[auth] permission-denied" console-only error with nothing
// useful shown to the user.
function taskErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError && error.code === "permission-denied") {
    return "This task couldn't be completed — please make sure you watched the required time without switching away, then try again.";
  }
  return getAuthErrorMessage(error);
}

type VideoTaskPlayerProps = {
  uid: string;
  taskId: string;
  videoUrl: string;
  // The one source of truth for "how many genuinely-watched seconds unlock
  // this task" — the real admin-configured value (settings/taskRewards.
  // minimumWatchSeconds, default 7), passed down from the page that already
  // loaded it. Never a separate hard-coded constant.
  minimumWatchSeconds: number;
  onCompleted: () => void;
};

export function VideoTaskPlayer({ uid, taskId, videoUrl, minimumWatchSeconds, onCompleted }: VideoTaskPlayerProps) {
  const youTubeVideoId = extractYouTubeVideoId(videoUrl);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<{ destroy: () => void } | null>(null);
  const completingRef = useRef(false);

  // Gates when local watch-time accumulation may begin — only once Start
  // is CONFIRMED server-side, never from local mount time. Starting the
  // countdown at mount (before the server round-trip lands) is what
  // previously let Complete fire a fraction of a second before the real,
  // server-recorded floor had genuinely elapsed — a race that surfaced as
  // an intermittent permission-denied right after "finishing" a video.
  const [started, setStarted] = useState(false);
  const [ready, setReady] = useState(false);
  const [watchedSeconds, setWatchedSeconds] = useState(0);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    startTaskWatch(uid, taskId)
      .then(() => {
        if (!cancelled) setStarted(true);
      })
      .catch((err) => {
        if (!cancelled) setError(taskErrorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [uid, taskId]);

  // Generic (non-YouTube) fallback: no cross-origin player API exists to
  // observe real play/pause/buffering state for an arbitrary iframe, so
  // this remains a best-effort, tab-visibility-gated timer — paused time
  // when the tab is hidden doesn't count, but a genuinely-paused video in a
  // visible tab can't be distinguished from a playing one. This limitation
  // is unchanged from before; only the threshold and the auto-complete
  // behavior are new.
  useEffect(() => {
    if (youTubeVideoId || !started) return;
    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      setWatchedSeconds((seconds) => Math.min(seconds + 1, minimumWatchSeconds));
    }, 1000);
    return () => clearInterval(interval);
  }, [youTubeVideoId, started, minimumWatchSeconds]);

  // YouTube: load the IFrame API and accumulate real watched time ONLY
  // while the player reports PLAYING — paused, buffering, cued, and ended
  // states all stop the count, satisfying "do not count paused/buffering
  // time" precisely instead of approximately.
  useEffect(() => {
    if (!youTubeVideoId || !containerRef.current || !started) return;
    let cancelled = false;
    let tickInterval: ReturnType<typeof setInterval> | null = null;

    loadYouTubeIframeApi().then(() => {
      if (cancelled || !containerRef.current) return;
      const YT = (
        window as unknown as {
          YT: {
            Player: new (element: HTMLElement, options: Record<string, unknown>) => { destroy: () => void };
            PlayerState: { PLAYING: number };
          };
        }
      ).YT;
      const player = new YT.Player(containerRef.current, {
        videoId: youTubeVideoId,
        events: {
          onReady: () => setReady(true),
          onStateChange: (event: { data: number }) => {
            if (event.data === YT.PlayerState.PLAYING) {
              if (tickInterval) clearInterval(tickInterval);
              tickInterval = setInterval(() => {
                setWatchedSeconds((seconds) => Math.min(seconds + 1, minimumWatchSeconds));
              }, 1000);
            } else if (tickInterval) {
              clearInterval(tickInterval);
              tickInterval = null;
            }
          },
        },
      });
      playerRef.current = player;
    });

    return () => {
      cancelled = true;
      if (tickInterval) clearInterval(tickInterval);
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [youTubeVideoId, started, minimumWatchSeconds]);

  // Fully automatic — the instant genuinely-watched time reaches the
  // configured floor, mark the task complete without any button click. This
  // only RECORDS completion (see completeTaskWatch) — no money moves here;
  // the bundled reward claim (task rewards + package earning, atomic) is a
  // separate step once every required task for the day is done, either via
  // a manual "Claim Reward" button or automatically if the user has Auto
  // Balance turned on (see use-daily-tasks.ts / TaskRotationList).
  // completingRef guards against firing twice from rapid successive ticks;
  // the underlying transaction is also independently idempotent
  // server-side regardless.
  useEffect(() => {
    if (done || completingRef.current || watchedSeconds < minimumWatchSeconds) return;
    completingRef.current = true;
    setCompleting(true);
    setError(null);
    completeTaskWatch(uid, taskId)
      .then(() => {
        setDone(true);
        onCompleted();
      })
      .catch((err) => {
        setError(taskErrorMessage(err));
        completingRef.current = false;
      })
      .finally(() => setCompleting(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedSeconds, minimumWatchSeconds, done]);

  if (done) {
    return <Alert variant="success">Completed for today.</Alert>;
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

      <p className="flex items-center gap-2 text-xs text-white/50">
        {completing ? (
          <>
            <Spinner className="h-3.5 w-3.5" />
            Recording completion…
          </>
        ) : !started ? (
          "Starting…"
        ) : youTubeVideoId && !ready ? (
          "Loading video…"
        ) : (
          `${Math.min(watchedSeconds, minimumWatchSeconds)} / ${minimumWatchSeconds} seconds watched`
        )}
      </p>
    </div>
  );
}
