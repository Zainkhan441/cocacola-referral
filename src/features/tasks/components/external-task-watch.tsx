"use client";

import { useEffect, useRef, useState } from "react";
import { FirebaseError } from "firebase/app";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { startTaskWatch, completeTaskWatch } from "@/features/tasks/lib/actions";
import { getAuthErrorMessage } from "@/features/auth/lib/auth-errors";
import { isNewPakistanDay } from "@/lib/date-utils";
import type { TaskCompletionDoc } from "@/lib/firestore/task-completions";

function taskErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError && error.code === "permission-denied") {
    return "This task couldn't be completed — please make sure enough time has passed since opening the video, then try again.";
  }
  return getAuthErrorMessage(error);
}

const MAX_RETRY_BACKOFF_MS = 8000;

type ExternalTaskWatchProps = {
  uid: string;
  taskId: string;
  // The one source of truth for "how many seconds after opening the video
  // unlock this task" — the real admin-configured value (settings/
  // taskRewards.minimumWatchSeconds), never hardcoded here.
  minimumWatchSeconds: number;
  // The live taskCompletions/{uid}_{taskId} doc, read from the SAME
  // onSnapshot listener use-daily-tasks.ts already keeps open for every
  // assigned task (daily.completions) — this component never opens a
  // second subscription of its own. This is the one authoritative source
  // for the real, server-recorded startedAt that every completion attempt
  // is timed against.
  completion: TaskCompletionDoc | undefined;
  // Shared live clock (ms) from the page — used only for the render-time
  // "is this already completed today" check below, so this component never
  // calls Date.now() directly while rendering. The actual completion-
  // eligibility checks (inside attemptRef, run from effects/timers, never
  // during render) still use a fresh Date.now() each time, which is what
  // needs to be exact.
  now: number;
  // Called the instant completeTaskWatch() resolves (or fails because it
  // was already completed elsewhere) — lets the parent flip the BOTTLE
  // icon (not just this panel's own message) immediately, without waiting
  // on daily.completions' onSnapshot echo. Firing it twice is harmless —
  // the parent's own update is idempotent (see handleTaskCompleted).
  onCompleted: () => void;
  // Called ~750ms after a genuine (live, in-this-session) completion — the
  // parent uses this to collapse/hide THIS bottle's own panel, leaving only
  // its now-green bottle icon behind. Never called for a bottle reopened
  // AFTER it was already completed (see alreadyDoneBeforeOpening in the
  // caller) — that static confirmation stays open until a different bottle
  // is selected, matching the pre-existing behavior for that case.
  onCollapse: () => void;
};

// The video plays entirely off-site now (opened in a new tab by the
// bottle's own onClick in task-rotation-list.tsx, which also fires the
// Start write immediately, in the same click). This component's job is
// narrow: attempt Complete the moment enough REAL time has passed since
// the server-recorded startedAt — recomputed fresh from Date.now() every
// time a check runs, never from an elapsed local countdown. A background
// tab's setInterval/setTimeout can be throttled by the browser, but that
// only delays WHEN a check happens to run; the check itself (server
// startedAt + minimumWatchSeconds vs. a fresh Date.now()) is always
// correct regardless of how long this tab sat in the background. Checks
// are triggered by: the completion doc changing (the live listener,
// covers another tab/device finishing first), this tab regaining focus or
// visibility (the moment a user returns from watching — fires immediately,
// not on a timer), a precise one-shot timeout scheduled for the exact
// remaining duration, and a 1s safety-net interval while this panel stays
// open.
//
// Honest limitation, unchanged from before: this can only prove real
// wall-clock time has elapsed since the link was opened — it has no way to
// observe whether the external site was actually watched.
export function ExternalTaskWatch({
  uid,
  taskId,
  minimumWatchSeconds,
  completion,
  now,
  onCompleted,
  onCollapse,
}: ExternalTaskWatchProps) {
  const completingRef = useRef(false);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const collapseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffAttemptRef = useRef(0);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  // Display-only countdown (UI text), updated once per second from the 1s
  // safety-net interval below — deliberately NOT the value the completion
  // logic itself schedules against (that always recomputes fresh from
  // Date.now() at attempt-time). This can lag by up to ~1s without any
  // correctness impact; it only affects what number the user sees tick
  // down, never when completion actually fires.
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  const startedAtMs = completion?.startedAt ? completion.startedAt.toMillis() : null;
  // `justSucceeded` makes THIS panel's own "Completed for today" message
  // flip the instant completeTaskWatch's own promise resolves — the
  // transaction has already committed server-side by that point, so this
  // never shows a false positive; it just avoids waiting on this
  // component's own onSnapshot listener to echo the write back down
  // (typically fast, but not instant) before showing what we already know
  // is true. The live `completion` prop remains the source of truth for
  // every OTHER consumer (e.g. the bottle icon in the list above it).
  const [justSucceeded, setJustSucceeded] = useState(false);
  const done =
    justSucceeded ||
    Boolean(completion?.completedAt && !isNewPakistanDay(completion.completedAt.toMillis(), now));

  // Defensive fallback only — task-rotation-list.tsx's onClick already
  // calls startTaskWatch() synchronously at click time, before this
  // component even mounts. Re-calling it here is a harmless no-op once
  // that write has landed (see actions.ts), and covers the rare case where
  // the click-time call itself failed silently.
  useEffect(() => {
    let cancelled = false;
    startTaskWatch(uid, taskId).catch((err) => {
      if (!cancelled) setStartError(taskErrorMessage(err));
    });
    return () => {
      cancelled = true;
    };
  }, [uid, taskId]);

  // Reassigned via an effect after every render (never during render
  // itself) so the trigger effects below — none of which re-subscribe when
  // props/state change — always call the current closure (fresh
  // startedAtMs/done/minimumWatchSeconds) instead of one captured at mount
  // time. Effects for a given commit all run before any timer/event
  // callback can fire, so by the time attemptRef.current() is actually
  // invoked (always asynchronously), this assignment has already landed.
  const attemptRef = useRef<() => void>(() => {});
  useEffect(() => {
    attemptRef.current = () => {
      if (done || completingRef.current || startedAtMs == null) return;
      // Stale record from before a Pakistan-midnight rollover — a fresh
      // Start (new startedAt) will replace it the next time this task is
      // opened; nothing to complete against this one anymore.
      if (isNewPakistanDay(startedAtMs, Date.now())) return;

      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }

      const remainingMs = startedAtMs + minimumWatchSeconds * 1000 - Date.now();
      if (remainingMs > 0) {
        retryTimeoutRef.current = setTimeout(() => attemptRef.current(), remainingMs + 50);
        return;
      }

      completingRef.current = true;
      setCompleting(true);
      setError(null);
      completeTaskWatch(uid, taskId)
        .then(() => {
          backoffAttemptRef.current = 0;
          // The transaction has already committed server-side by the time
          // this resolves — flip the panel's own message AND the bottle
          // icon above it (via onCompleted) immediately, rather than
          // waiting for either's onSnapshot listener to echo the write
          // back down. onCollapse fires after a short delay so the success
          // message is actually seen before this bottle's panel hides
          // itself, leaving just the now-green bottle behind.
          setJustSucceeded(true);
          onCompleted();
          if (collapseTimeoutRef.current) clearTimeout(collapseTimeoutRef.current);
          collapseTimeoutRef.current = setTimeout(() => onCollapse(), 750);
        })
        .catch((err) => {
          const message = err instanceof Error ? err.message : "";
          // Already completed (e.g. another tab won the race) — genuinely
          // done, just not by this attempt; show the same instant
          // confirmation rather than leaving the panel stuck mid-retry.
          if (message.includes("already completed")) {
            setJustSucceeded(true);
            onCompleted();
            if (collapseTimeoutRef.current) clearTimeout(collapseTimeoutRef.current);
            collapseTimeoutRef.current = setTimeout(() => onCollapse(), 750);
          } else {
            setError(taskErrorMessage(err));
            const delay = Math.min(1000 * 2 ** backoffAttemptRef.current, MAX_RETRY_BACKOFF_MS);
            backoffAttemptRef.current += 1;
            retryTimeoutRef.current = setTimeout(() => attemptRef.current(), delay);
          }
        })
        .finally(() => {
          completingRef.current = false;
          setCompleting(false);
        });
    };
  });

  // Display-only countdown, kept entirely separate from the completion
  // logic above (attemptRef never reads this state) — purely cosmetic, so
  // a hiccup here can never affect when completion actually fires. Not
  // reset to null once done/startedAtMs becomes unavailable — the render
  // branch below never reads remainingSeconds once `done` is true, so
  // there is nothing to clear.
  useEffect(() => {
    if (startedAtMs == null || done) return;
    const update = () => {
      setRemainingSeconds(Math.max(0, Math.ceil((startedAtMs + minimumWatchSeconds * 1000 - Date.now()) / 1000)));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startedAtMs, minimumWatchSeconds, done]);

  // Trigger: the completion doc's own startedAt/done changing — covers
  // both this task's Start finally landing, and another tab/device having
  // already completed it.
  useEffect(() => {
    attemptRef.current();
  }, [startedAtMs, done]);

  // Trigger: this tab regaining focus or visibility — the moment the user
  // returns from watching, re-check immediately against a fresh Date.now()
  // rather than waiting for any timer to catch up.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") attemptRef.current();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, []);

  // Trigger: a lightweight safety-net check every second while this panel
  // stays open and mounted — a backstop in case the precisely-scheduled
  // retry above is ever delayed.
  useEffect(() => {
    const interval = setInterval(() => attemptRef.current(), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      if (collapseTimeoutRef.current) clearTimeout(collapseTimeoutRef.current);
    };
  }, []);

  if (done) {
    return <Alert variant="success">Completed for today.</Alert>;
  }

  return (
    <div className="flex flex-col gap-2">
      {startError && <Alert variant="error">{startError}</Alert>}
      {error && <Alert variant="error">{error}</Alert>}
      <p className="flex items-center gap-2 text-xs text-white/50">
        {completing ? (
          <>
            <Spinner className="h-3.5 w-3.5" />
            Recording completion…
          </>
        ) : startedAtMs == null ? (
          "Starting…"
        ) : (
          <>
            <Spinner className="h-3.5 w-3.5" />
            Watching advertisement… {remainingSeconds != null && remainingSeconds > 0 ? `${remainingSeconds}s remaining` : "finishing up…"}
          </>
        )}
      </p>
    </div>
  );
}
