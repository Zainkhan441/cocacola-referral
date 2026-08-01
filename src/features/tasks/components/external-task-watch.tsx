"use client";

import { useEffect, useRef, useState } from "react";
import { FirebaseError } from "firebase/app";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { startTaskWatch, completeTaskWatch } from "@/features/tasks/lib/actions";
import { getAuthErrorMessage } from "@/features/auth/lib/auth-errors";

function taskErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError && error.code === "permission-denied") {
    return "This task couldn't be completed — please make sure enough time has passed since opening the video, then try again.";
  }
  return getAuthErrorMessage(error);
}

type ExternalTaskWatchProps = {
  uid: string;
  taskId: string;
  // The one source of truth for "how many seconds after opening the video
  // unlock this task" — the real admin-configured value (settings/
  // taskRewards.minimumWatchSeconds), passed down from the page that
  // already loaded it. The actual video now plays entirely off-site (the
  // bottle's own onClick in task-rotation-list.tsx opens task.videoUrl in
  // a new tab the instant it's clicked) — this component owns only what
  // happens on this site while that tab is open.
  minimumWatchSeconds: number;
};

// completeTaskWatch's own server-side check against the real,
// Firestore-recorded startedAt (never this local countdown) is what
// actually enforces the watch-time floor — this countdown only decides
// when to ATTEMPT the write, exactly mirroring the floor the old embedded
// player counted down to, just without any way to observe the other tab's
// real playback (no cross-origin signal exists for an arbitrary external
// site, same acknowledged limitation as before).
export function ExternalTaskWatch({ uid, taskId, minimumWatchSeconds }: ExternalTaskWatchProps) {
  const completingRef = useRef(false);
  const [started, setStarted] = useState(false);
  const [remaining, setRemaining] = useState(minimumWatchSeconds);
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

  // Counts down unconditionally once Start is confirmed — deliberately NOT
  // gated on this tab's own visibility (unlike the old generic-iframe
  // fallback): the user is expected to be on the NEW tab watching the
  // video, which makes THIS tab hidden the whole time, so pausing on
  // "hidden" would mean the timer never runs at all.
  useEffect(() => {
    if (!started || done) return;
    const interval = setInterval(() => {
      setRemaining((seconds) => Math.max(seconds - 1, 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [started, done]);

  useEffect(() => {
    if (done || completingRef.current || !started || remaining > 0) return;
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
  }, [remaining, started, done, uid, taskId]);

  if (done) {
    return <Alert variant="success">Completed for today.</Alert>;
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <Alert variant="error">{error}</Alert>}
      <p className="flex items-center gap-2 text-xs text-white/50">
        {completing ? (
          <>
            <Spinner className="h-3.5 w-3.5" />
            Recording completion…
          </>
        ) : !started ? (
          "Starting…"
        ) : (
          `Video opened in a new tab — completes automatically in ${remaining}s`
        )}
      </p>
    </div>
  );
}
