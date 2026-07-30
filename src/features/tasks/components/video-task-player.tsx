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
  // minimumWatchSeconds; 7 is only the fallback shown before an admin has
  // ever saved this setting, never a hard-coded override of a real
  // configured value), passed down from the page that already loaded it.
  minimumWatchSeconds: number;
};

export function VideoTaskPlayer({ uid, taskId, videoUrl, minimumWatchSeconds }: VideoTaskPlayerProps) {
  const youTubeVideoId = extractYouTubeVideoId(videoUrl);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<{ destroy: () => void } | null>(null);
  const completingRef = useRef(false);
  // Read by the tick intervals below instead of closing over the prop
  // directly, so neither timer-creating effect needs minimumWatchSeconds in
  // its dependency array — see the comment on the YouTube effect for why
  // that dependency was the actual root cause of a blank/broken player.
  const minimumWatchSecondsRef = useRef(minimumWatchSeconds);
  useEffect(() => {
    minimumWatchSecondsRef.current = minimumWatchSeconds;
  }, [minimumWatchSeconds]);

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
      setWatchedSeconds((seconds) => Math.min(seconds + 1, minimumWatchSecondsRef.current));
    }, 1000);
    return () => clearInterval(interval);
  }, [youTubeVideoId, started]);

  // YouTube: load the IFrame API and accumulate real watched time ONLY
  // while the player reports PLAYING — paused, buffering, cued, and ended
  // states all stop the count, satisfying "do not count paused/buffering
  // time" precisely instead of approximately.
  //
  // Root cause of the "blank player / video never starts" bug: `new
  // YT.Player(node, ...)` REPLACES `node` in the live DOM with the actual
  // <iframe> (documented YouTube IFrame API behavior), and
  // `player.destroy()` removes that iframe again on cleanup. If this
  // effect ever runs more than once for the same mount — which it
  // reliably does in local dev, since Next.js's App Router runs React in
  // Strict Mode by default (mount → cleanup → mount again) — the second
  // invocation used to hand `new YT.Player()` the SAME `containerRef.current`
  // node, but that node had already been swapped out and removed on the
  // first pass, leaving it detached from the document. Creating a player
  // against a detached node renders nothing, so every task looked
  // permanently blank on localhost — and would have broken in production
  // too the moment minimumWatchSeconds changed after its initial fallback
  // value, since that was also in this effect's own dependency array.
  // Fixed by targeting a brand-new child element created fresh on every
  // invocation, inside the OUTER container React itself owns and never
  // mutates — so any re-run, for any reason, always has a live, attached
  // node to render into.
  useEffect(() => {
    if (!youTubeVideoId || !containerRef.current || !started) return;
    let cancelled = false;
    let tickInterval: ReturnType<typeof setInterval> | null = null;

    const mountNode = document.createElement("div");
    mountNode.style.height = "100%";
    mountNode.style.width = "100%";
    containerRef.current.appendChild(mountNode);

    loadYouTubeIframeApi().then(() => {
      if (cancelled) return;
      const YT = (
        window as unknown as {
          YT: {
            Player: new (element: HTMLElement, options: Record<string, unknown>) => { destroy: () => void };
            PlayerState: { PLAYING: number };
          };
        }
      ).YT;
      const player = new YT.Player(mountNode, {
        videoId: youTubeVideoId,
        events: {
          onReady: () => setReady(true),
          onStateChange: (event: { data: number }) => {
            if (event.data === YT.PlayerState.PLAYING) {
              if (tickInterval) clearInterval(tickInterval);
              tickInterval = setInterval(() => {
                setWatchedSeconds((seconds) => Math.min(seconds + 1, minimumWatchSecondsRef.current));
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
      mountNode.remove();
    };
  }, [youTubeVideoId, started]);

  // Fully automatic — the instant genuinely-watched time reaches the
  // configured floor, mark the task complete without any button click, and
  // without touching the video in any way: no pause, no stop, no close, no
  // auto-advance to another task. This only RECORDS completion (see
  // completeTaskWatch) — no money moves here; the bundled reward claim
  // (task rewards + package earning, atomic) is a separate step once every
  // required task for the day is done, either via a manual "Claim Reward"
  // button or automatically if the user has Auto Balance turned on (see
  // use-daily-tasks.ts / TaskRotationList). completingRef guards against
  // firing twice from rapid successive ticks; the underlying transaction is
  // also independently idempotent server-side regardless.
  useEffect(() => {
    if (done || completingRef.current || watchedSeconds < minimumWatchSeconds) return;
    completingRef.current = true;
    setCompleting(true);
    setError(null);
    completeTaskWatch(uid, taskId)
      .then(() => {
        setDone(true);
      })
      .catch((err) => {
        setError(taskErrorMessage(err));
        completingRef.current = false;
      })
      .finally(() => setCompleting(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedSeconds, minimumWatchSeconds, done]);

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

      {done ? (
        // The video itself is left exactly as it is — still mounted, still
        // playable — only a status line is added underneath. Completing
        // this ad never closes, pauses, or stops it, and never advances to
        // another task on its own.
        <Alert variant="success">Completed for today — feel free to keep watching.</Alert>
      ) : (
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
      )}
    </div>
  );
}
