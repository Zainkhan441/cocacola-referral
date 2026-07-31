"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { VideoTaskPlayer } from "@/features/tasks/components/video-task-player";
import { BottleIcon, type BottleState } from "@/features/tasks/components/bottle-icon";
import { setAutoBalancePreference } from "@/features/tasks/lib/actions";
import { isNewPakistanDay } from "@/lib/date-utils";
import type { useDailyTasks } from "@/features/tasks/hooks/use-daily-tasks";

type TaskRotationListProps = {
  uid: string;
  daily: ReturnType<typeof useDailyTasks>;
  minimumWatchSeconds: number;
  // Persisted profile.autoBalanceAfterAds (defaults to false for accounts
  // predating this field) — the toggle below optimistically flips local
  // state, then persists via setAutoBalancePreference; use-daily-tasks.ts's
  // own effect reacts to the resulting profile change and auto-claims if
  // already eligible.
  autoBalanceAfterAds: boolean;
};

// Bundled claim model (Phase 4): watching an ad only records completion —
// no money moves per task. Once every required task is done today, the sum
// of each task's rewardPerAd plus the package's own daily earning is
// credited together, exactly once, either via the "Claim Reward" button
// (manual mode) or automatically (Auto Balance mode). This view no longer
// displays a reward breakdown itself — the Top section was trimmed down
// to Auto Balance + Claim only — but the underlying claim math (still
// computed from the live package/settings docs inside claimDailyTaskReward)
// is completely untouched.
//
// Bottle layout: one task per bottle, stacked in a single vertical column
// (mobile-style width on every screen size, never a multi-column grid) —
// matching the reference layout. The exact count and which tasks they map
// to come entirely from daily.assignedTasks (itself driven by the user's
// own package dailyTaskLimit and the admin-managed task pool), never
// hardcoded. activeTaskId tracks the single task currently open — it's set
// ONLY by the user clicking a bottle, and only ever changed again by
// clicking a DIFFERENT bottle. Completing an ad never resets it, so the
// just-completed video stays mounted and playable exactly as it was — no
// auto-close, no auto-pause, no auto-advance to the next task. A bottle
// that's already completed today never remounts the interactive
// video/claim machinery when clicked again (see ActiveTaskPanel below) —
// it only shows a confirmation, so it can never attempt (and fail, or
// worse, somehow duplicate) a second completion.
export function TaskRotationList({
  uid,
  daily,
  minimumWatchSeconds,
  autoBalanceAfterAds,
}: TaskRotationListProps) {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  // Captures whether the clicked bottle was ALREADY completed for today at
  // the moment it was opened — frozen for as long as it stays the active
  // bottle, deliberately NOT recomputed live from daily.completions. This
  // is what keeps VideoTaskPlayer mounted (still playing, still visible)
  // for the whole time a task stays open, even the instant ITS OWN
  // completion write lands — the parent's realtime listener updating
  // daily.completions must never itself swap the video away for a
  // still-open bottle; only opening a DIFFERENT (or the same, later)
  // already-done bottle should ever show the plain confirmation instead.
  const [activeTaskWasAlreadyDone, setActiveTaskWasAlreadyDone] = useState(false);
  const [autoBalance, setAutoBalanceState] = useState(autoBalanceAfterAds);
  const [toggleError, setToggleError] = useState<string | null>(null);
  // Shared with useDailyTasks — a live Pakistan-time clock, not a stale
  // mount-time snapshot, so a completion from before a midnight rollover
  // (tab left open) correctly stops showing as "completed today" and the
  // bottle reappears as available without a manual reload.
  const now = daily.now;

  async function handleAutoBalanceToggle(enabled: boolean) {
    setToggleError(null);
    setAutoBalanceState(enabled);
    try {
      await setAutoBalancePreference(uid, enabled);
    } catch (err) {
      setAutoBalanceState(!enabled);
      setToggleError(err instanceof Error ? err.message : "Couldn’t update this preference.");
    }
  }

  if (daily.assignedTasks.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 py-10 text-center">
        <p className="text-sm text-white/50">No ad tasks available right now. Check back soon.</p>
      </div>
    );
  }

  const activeTask = daily.assignedTasks.find((task) => task.id === activeTaskId) ?? null;

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-white/80">Auto balance after ad watching</p>
            <p className="text-xs text-white/40">
              Automatically claim today’s reward the instant every ad is complete.
            </p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={autoBalance}
              onChange={(event) => handleAutoBalanceToggle(event.target.checked)}
              className="peer sr-only"
            />
            <div className="h-6 w-11 rounded-full bg-white/10 transition-colors peer-checked:bg-brand" />
            <div className="absolute left-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
          </label>
        </div>
        {toggleError && <Alert variant="error">{toggleError}</Alert>}

        {daily.alreadyClaimedToday ? (
          <Alert variant="success">
            Today’s reward has already been credited. Come back tomorrow for a new assignment.
          </Alert>
        ) : autoBalance ? (
          daily.allDoneToday && (
            <p className="flex items-center gap-2 text-xs text-white/50">
              <Spinner className="h-3.5 w-3.5" />
              Crediting your reward…
            </p>
          )
        ) : (
          <>
            {daily.claimError && <Alert variant="error">{daily.claimError}</Alert>}
            <Button
              variant="primary"
              size="md"
              className={cn(
                "self-start transition-transform duration-200 ease-out hover:enabled:-translate-y-0.5",
                // Draws attention the instant the button becomes genuinely
                // clickable (all ads done, not already claiming) — stops
                // immediately once claimed, since alreadyClaimedToday being
                // true swaps this whole branch out for the success Alert
                // above, and never shows at all in Auto Balance mode, since
                // this branch only renders when autoBalance is off. Purely
                // a CSS animation; does not touch disabled/enabled logic.
                daily.allDoneToday && !daily.claiming && "animate-claim-glow",
              )}
              disabled={!daily.allDoneToday || daily.claiming}
              onClick={() => daily.claim()}
            >
              {daily.claiming ? "Claiming…" : "Claim Reward"}
            </Button>
          </>
        )}
      </div>

      {/*
        The bottle PNG itself has ~9% transparent padding above the bottle
        and ~13% below it (measured directly from the file's alpha
        channel), and object-contain letterboxes a bit more on top of that
        inside each h-56/w-36 (mobile) and h-64/w-40 (desktop) wrapper —
        together far more invisible space than any small flex `gap` could
        ever close. So the column gap is dropped to 0 and a per-breakpoint
        negative margin (space-y) pulls the *wrapper boxes* together
        instead, closing exactly that measured transparent/letterbox
        space while leaving a small residual visible gap between the
        actual bottle shapes (~6px mobile, ~6px desktop) — comfortably
        short of any overlap, since the negative margin is smaller than
        the total empty space it's compensating for.
      */}
      <div className="flex flex-col items-center py-2 -space-y-[66px] sm:-space-y-[80px]">
        {daily.assignedTasks.map((task) => {
          const completion = daily.completions[task.id];
          const completedToday = Boolean(
            completion?.completedAt && !isNewPakistanDay(completion.completedAt.toMillis(), now),
          );
          const isActive = activeTaskId === task.id;
          // "Locked" reuses the EXACT SAME live eligibility check
          // useDailyTasks already computes to decide what to assign
          // (task.status === "active", within its date window, package-
          // eligible) — never a new/invented rule. A task can only reach
          // this state if it was eligible when assigned today but has
          // since become unavailable (e.g. an admin disabled it, or its
          // date window closed) and hasn't already been completed.
          const isLocked = !completedToday && !daily.eligibleActiveTaskIds.includes(task.id);
          const state: BottleState = completedToday ? "completed" : isLocked ? "locked" : isActive ? "active" : "available";

          return (
            <button
              key={task.id}
              type="button"
              disabled={isLocked}
              onClick={() => {
                if (isLocked) return;
                setActiveTaskId(task.id);
                setActiveTaskWasAlreadyDone(completedToday);
              }}
              className="group flex w-full flex-col items-center gap-3 rounded-2xl p-2 transition-colors duration-300 ease-out hover:enabled:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-not-allowed"
              aria-pressed={isActive}
              aria-label={isLocked ? "Task locked" : `${task.title}${completedToday ? " — completed for today" : ""}`}
            >
              <BottleIcon state={state} className="h-56 w-36 sm:h-64 sm:w-40" />
            </button>
          );
        })}
      </div>

      {activeTask ? (
        <ActiveTaskPanel
          uid={uid}
          task={activeTask}
          minimumWatchSeconds={minimumWatchSeconds}
          alreadyDoneBeforeOpening={activeTaskWasAlreadyDone}
        />
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 py-8 text-center">
          <p className="text-sm text-white/50">Tap a bottle above to start watching.</p>
        </div>
      )}
    </div>
  );
}

type ActiveTaskPanelProps = {
  uid: string;
  task: ReturnType<typeof useDailyTasks>["assignedTasks"][number];
  minimumWatchSeconds: number;
  // Whether this bottle was ALREADY completed today at the moment it was
  // clicked open — frozen at click-time by the parent, never recomputed
  // live while this stays the active bottle (see task-rotation-list.tsx's
  // own comment for why: recomputing live would swap the video away the
  // instant its own completion write lands, undoing "video stays visible
  // after completion").
  alreadyDoneBeforeOpening: boolean;
};

// Deliberately never mounts VideoTaskPlayer for a task that was ALREADY
// completed today before this bottle was opened — reopening a finished
// bottle only shows a confirmation, never the interactive watch/completion
// flow, so a completed bottle can structurally never attempt (and
// therefore never duplicate) a second completion. A task that's genuinely
// in progress, or completes DURING this viewing, keeps VideoTaskPlayer
// mounted the whole time — it already handles staying visible/playing
// after its own completion internally, with no auto-advance.
function ActiveTaskPanel({ uid, task, minimumWatchSeconds, alreadyDoneBeforeOpening }: ActiveTaskPanelProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="font-semibold text-white">{task.title}</p>
          <p className="text-xs text-white/50">{task.description}</p>
        </div>
        {alreadyDoneBeforeOpening && <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-400" aria-hidden="true" />}
      </div>

      {alreadyDoneBeforeOpening ? (
        <Alert variant="success">Completed for today.</Alert>
      ) : (
        <>
          <p className="whitespace-pre-wrap text-sm text-white/60">{task.instructions}</p>
          <VideoTaskPlayer
            uid={uid}
            taskId={task.id}
            videoUrl={task.videoUrl}
            minimumWatchSeconds={minimumWatchSeconds}
          />
        </>
      )}
    </div>
  );
}
