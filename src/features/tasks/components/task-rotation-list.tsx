"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { ExternalTaskWatch } from "@/features/tasks/components/external-task-watch";
import { BottleIcon, type BottleState } from "@/features/tasks/components/bottle-icon";
import { setAutoBalancePreference, startTaskWatch } from "@/features/tasks/lib/actions";
import { isNewPakistanDay } from "@/lib/date-utils";
import type { TaskDoc } from "@/lib/firestore/tasks";
import type { TaskCompletionDoc } from "@/lib/firestore/task-completions";
import type { useDailyTasks } from "@/features/tasks/hooks/use-daily-tasks";

// Warms the connection to an external video's own origin the moment intent
// is signaled (hover/focus, and again defensively on click/tap for
// touch devices that never fire a hover event) — a preconnect is just a
// DNS+TCP+TLS handshake, not a resource fetch, so it can never itself
// waste bandwidth even if the user never actually opens that tab. Guarded
// by a module-level Set (not a DOM query) so repeatedly hovering the same
// bottle never re-inserts the same <link>, and origins for admin-configured
// videoUrls that don't resolve to a valid URL are silently skipped.
const preconnectedVideoOrigins = new Set<string>();
function preconnectToVideoOrigin(videoUrl: string) {
  if (typeof document === "undefined") return;
  let origin: string;
  try {
    origin = new URL(videoUrl).origin;
  } catch {
    return;
  }
  if (preconnectedVideoOrigins.has(origin)) return;
  preconnectedVideoOrigins.add(origin);
  const link = document.createElement("link");
  link.rel = "preconnect";
  link.href = origin;
  document.head.appendChild(link);
}

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
// clicking a DIFFERENT bottle. The ad itself now plays entirely off-site
// (opened in a new tab the instant an unfinished bottle is first clicked —
// see the bottle button's onClick below); this page's own panel just keeps
// tracking Start/Complete for whichever task is active. Completing a task
// never resets activeTaskId, so its panel stays mounted exactly as it was
// — no auto-close, no auto-advance to the next task. A bottle that's
// already completed today never remounts the interactive watch/claim
// machinery when clicked again (see ActiveTaskPanel below), never reopens
// a tab for it either — it only shows a confirmation, so it can never
// attempt (and fail, or worse, somehow duplicate) a second completion.
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
  // is what keeps ExternalTaskWatch mounted for the whole time a task
  // stays open, even the instant ITS OWN completion write lands — the
  // parent's realtime listener updating daily.completions must never
  // itself swap the panel away for a still-open bottle; only opening a
  // DIFFERENT (or the same, later) already-done bottle should ever show
  // the plain confirmation instead.
  const [activeTaskWasAlreadyDone, setActiveTaskWasAlreadyDone] = useState(false);
  const [autoBalance, setAutoBalanceState] = useState(autoBalanceAfterAds);
  const [toggleError, setToggleError] = useState<string | null>(null);
  // Per-task optimistic "just completed" timestamps (ms). ExternalTaskWatch
  // already knows the instant its own completeTaskWatch() call resolves —
  // this lets that instant flip the BOTTLE's own icon (green glow) too,
  // instead of waiting for daily.completions' onSnapshot echo to arrive
  // and trigger a second render. Storing the timestamp (not just a
  // taskId->true flag) and re-checking it against isNewPakistanDay in
  // bottleRows below is what makes this safe to never explicitly clear:
  // once a Pakistan day passes, the same check that already resets
  // completedToday from real Firestore data also stops honoring a stale
  // optimistic entry from the previous day.
  const [optimisticCompletions, setOptimisticCompletions] = useState<Record<string, number>>({});
  const handleTaskCompleted = useCallback((taskId: string) => {
    setOptimisticCompletions((prev) => ({ ...prev, [taskId]: Date.now() }));
  }, []);
  // Fires ~750ms after ExternalTaskWatch's own completeTaskWatch() call
  // resolves — collapses THIS bottle's panel back to nothing, leaving only
  // its now-green bottle behind. Guarded to only clear activeTaskId if it
  // still points at the task that just finished, in case the user already
  // switched to a different bottle before this delayed callback fires.
  const handleCollapseActiveTask = useCallback((taskId: string) => {
    setActiveTaskId((current) => (current === taskId ? null : current));
  }, []);
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

  // Derived once per actual data change, not on every re-render of this
  // component (e.g. toggling Auto Balance, a claim error appearing, or any
  // other local state change unrelated to the bottles themselves) — before
  // this, every one of those re-renders recomputed completedToday/isLocked/
  // state for every assigned task from scratch. Declared before the
  // "no tasks assigned" early return below so this Hook call is never
  // conditional.
  const bottleRows = useMemo(
    () =>
      daily.assignedTasks.map((task) => {
        const completion = daily.completions[task.id];
        const optimisticAtMs = optimisticCompletions[task.id];
        const completedToday =
          Boolean(completion?.completedAt && !isNewPakistanDay(completion.completedAt.toMillis(), now)) ||
          Boolean(optimisticAtMs != null && !isNewPakistanDay(optimisticAtMs, now));
        const isActive = activeTaskId === task.id;
        // "Locked" reuses the EXACT SAME live eligibility check
        // useDailyTasks already computes to decide what to assign
        // (task.status === "active", within its date window, package-
        // eligible) — never a new/invented rule. A task can only reach
        // this state if it was eligible when assigned today but has since
        // become unavailable (e.g. an admin disabled it, or its date
        // window closed) and hasn't already been completed.
        const isLocked = !completedToday && !daily.eligibleActiveTaskIds.includes(task.id);
        const state: BottleState = completedToday ? "completed" : isLocked ? "locked" : isActive ? "active" : "available";
        return { task, completedToday, isActive, isLocked, state };
      }),
    [daily.assignedTasks, daily.completions, daily.eligibleActiveTaskIds, activeTaskId, now, optimisticCompletions],
  );

  // Stable across re-renders unless uid or the active task itself changes
  // (toggling Auto Balance, a claim error appearing, etc. never recreates
  // this) — passed to the memoized BottleButton below so those unrelated
  // re-renders don't defeat its memoization via a fresh onSelect reference
  // every time.
  const handleBottleSelect = useCallback(
    (task: TaskDoc, completedToday: boolean, isLocked: boolean) => {
      if (isLocked) return;
      // The video plays entirely off-site — clicking an unfinished bottle
      // for the first time immediately records the authoritative Firestore
      // Start (fired synchronously, in this same click, so the
      // window.open call right after it still carries the user gesture
      // needed to bypass popup blockers) and opens its admin-configured
      // videoUrl in a new tab. Only fires on the transition INTO this task
      // being active (not on repeat clicks of an already-active bottle),
      // so reopening the active bottle's own panel never re-starts or
      // reopens a second tab for it.
      if (!completedToday && activeTaskId !== task.id) {
        // Defensive: covers touch devices, which generally never fire a
        // hover event before a tap — BottleButton's own onMouseEnter/
        // onFocus already does this ahead of time for pointer/keyboard
        // users, and the Set guard inside makes a repeat call here free.
        preconnectToVideoOrigin(task.videoUrl);
        void startTaskWatch(uid, task.id);
        window.open(task.videoUrl, "_blank", "noopener,noreferrer");
      }
      setActiveTaskId(task.id);
      setActiveTaskWasAlreadyDone(completedToday);
    },
    [uid, activeTaskId],
  );

  if (daily.assignedTasks.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 py-10 text-center">
        <p className="text-sm text-white/50">No ad tasks available right now. Check back soon.</p>
      </div>
    );
  }

  // Restores the correct in-progress bottle's panel after a page refresh
  // (activeTaskId is plain local state — it does NOT survive a reload on
  // its own). A render-time state adjustment (React's own recommended
  // pattern for "derive state from other state/props changing" — see
  // useResetOnKeyChange for the same technique elsewhere in this app),
  // not an effect: it naturally re-evaluates on every render, so it
  // self-heals even if this runs before every assigned task's completion
  // listener has delivered its first snapshot, without needing its own
  // dependency array. Excludes any task already known-complete via the
  // optimistic map (see handleTaskCompleted) even if the real Firestore
  // completion doc hasn't echoed that yet — without this, the exact task
  // that just auto-collapsed could immediately reopen itself. The timer
  // itself is never reset here — ExternalTaskWatch always recomputes "how
  // much time remains" fresh from the real startedAt, so resuming after a
  // refresh is inherently correct with no extra bookkeeping.
  if (activeTaskId == null) {
    const inProgressTask = daily.assignedTasks.find((task) => {
      if (optimisticCompletions[task.id] != null) return false;
      const completion = daily.completions[task.id];
      return (
        completion?.startedAt != null &&
        completion.completedAt == null &&
        !isNewPakistanDay(completion.startedAt.toMillis(), now)
      );
    });
    if (inProgressTask) {
      setActiveTaskId(inProgressTask.id);
      setActiveTaskWasAlreadyDone(false);
    }
  }

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
        ever close. Two consecutive PLAIN bottles keep the tight negative
        top-margin pull that closes that transparent space (~6px mobile,
        ~6px desktop residual gap). The one bottle with its OWN panel open
        breaks that assumption — the wrapper's real bottom edge is now the
        panel's card, which has no such transparent padding — so the gap
        immediately AFTER an open panel uses a normal positive margin
        instead, sized for real card-to-bottle breathing room. Each bottle
        + its own conditional panel live in one wrapper, keyed by task.id,
        so React mounts/unmounts a panel's whole timer/listener subtree
        exactly when that specific bottle becomes/stops being active —
        never any other bottle's.
      */}
      <div className="flex flex-col items-center py-2">
        {bottleRows.map(({ task, completedToday, isActive, isLocked, state }, index) => {
          const panelOpenHere = activeTaskId === task.id;
          const previousPanelOpen = index > 0 && activeTaskId === bottleRows[index - 1].task.id;
          const completion = daily.completions[task.id];
          return (
            <div
              key={task.id}
              className={cn(
                "flex w-full flex-col items-center",
                index === 0 ? undefined : previousPanelOpen ? "mt-6" : "-mt-[66px] sm:-mt-[80px]",
              )}
            >
              <BottleButton
                task={task}
                completedToday={completedToday}
                isActive={isActive}
                isLocked={isLocked}
                state={state}
                // Above-the-fold hint for the first bottle only — every
                // bottle shares the same source image, so this is the one
                // that matters for how quickly the page's first meaningful
                // paint shows real artwork instead of nothing.
                priority={index === 0}
                onSelect={handleBottleSelect}
              />
              {panelOpenHere && (
                <div className="mt-3 w-full">
                  <ActiveTaskPanel
                    uid={uid}
                    task={task}
                    minimumWatchSeconds={minimumWatchSeconds}
                    alreadyDoneBeforeOpening={activeTaskWasAlreadyDone}
                    completion={completion}
                    now={now}
                    onCompleted={handleTaskCompleted}
                    onCollapse={handleCollapseActiveTask}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {activeTaskId == null && (
        <div className="rounded-2xl border border-dashed border-white/10 py-8 text-center">
          <p className="text-sm text-white/50">Tap a bottle above to start watching.</p>
        </div>
      )}
    </div>
  );
}

type BottleButtonProps = {
  task: TaskDoc;
  completedToday: boolean;
  isActive: boolean;
  isLocked: boolean;
  state: BottleState;
  priority: boolean;
  onSelect: (task: TaskDoc, completedToday: boolean, isLocked: boolean) => void;
};

// Memoized: TaskRotationList re-renders on every unrelated state change
// (toggling Auto Balance, a claim error appearing, the active panel
// updating) — without this, every bottle button in the list would
// re-render alongside it even though only one row's props (if any)
// actually changed. Relies on handleBottleSelect (the `onSelect` prop)
// being referentially stable across those same unrelated re-renders (see
// its useCallback above) — otherwise this memoization would be silently
// defeated by a fresh callback on every render.
const BottleButton = memo(function BottleButton({
  task,
  completedToday,
  isActive,
  isLocked,
  state,
  priority,
  onSelect,
}: BottleButtonProps) {
  // Warms the connection to this task's own video origin the moment intent
  // is signaled — a mouse hover or keyboard focus — well before the actual
  // click/tap, so by the time window.open() fires the new tab's own
  // navigation has less connection-setup latency left to pay. Never fires
  // for a locked or already-completed bottle, since neither will open a
  // tab when selected.
  const handleIntentSignal = useCallback(() => {
    if (isLocked || completedToday) return;
    preconnectToVideoOrigin(task.videoUrl);
  }, [isLocked, completedToday, task.videoUrl]);

  return (
    <button
      type="button"
      disabled={isLocked}
      onClick={() => onSelect(task, completedToday, isLocked)}
      onMouseEnter={handleIntentSignal}
      onFocus={handleIntentSignal}
      className="group flex w-full flex-col items-center gap-3 rounded-2xl p-2 transition-colors duration-300 ease-out hover:enabled:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-not-allowed"
      aria-pressed={isActive}
      aria-label={isLocked ? "Task locked" : `${task.title}${completedToday ? " — completed for today" : ""}`}
    >
      <BottleIcon state={state} priority={priority} className="h-56 w-36 sm:h-64 sm:w-40" />
    </button>
  );
});

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
  // The live taskCompletions/{uid}_{taskId} doc for this task, read
  // straight from daily.completions (the one onSnapshot listener
  // use-daily-tasks.ts already keeps open for every assigned task) and
  // passed down to ExternalTaskWatch — never a second subscription.
  completion: TaskCompletionDoc | undefined;
  // Shared live Pakistan-time clock (see the `now` comment at the top of
  // TaskRotationList) — passed down so ExternalTaskWatch never calls
  // Date.now() directly while rendering.
  now: number;
  // Called the instant ExternalTaskWatch's own completeTaskWatch() call
  // resolves (or fails because it was already completed elsewhere) — lets
  // the BOTTLE icon in the list above flip to "completed" immediately,
  // without waiting for daily.completions' onSnapshot echo to arrive and
  // trigger a second render. Referentially stable (see handleTaskCompleted
  // in TaskRotationList), so it never defeats this panel's own memoization.
  onCompleted: (taskId: string) => void;
  // Called ~750ms after a genuine, live completion — collapses THIS
  // bottle's own panel back to nothing (see handleCollapseActiveTask).
  // Never fires for a bottle reopened after it was already completed
  // earlier (alreadyDoneBeforeOpening below skips mounting ExternalTaskWatch
  // entirely in that case, so there's nothing to collapse from).
  onCollapse: (taskId: string) => void;
};

// Deliberately never mounts ExternalTaskWatch for a task that was ALREADY
// completed today before this bottle was opened — reopening a finished
// bottle only shows a confirmation, never the interactive watch/completion
// flow, so a completed bottle can structurally never attempt (and
// therefore never duplicate) a second completion. A task that's genuinely
// in progress, or completes DURING this viewing, keeps ExternalTaskWatch
// mounted the whole time — it already handles staying visible after its
// own completion internally, with no auto-advance.
//
// Memoized: its own props (task, completion, now, ...) are referentially
// stable unless something about THIS specific active task actually
// changed, so there's no reason for this panel — the most expensive
// subtree here, via ExternalTaskWatch's timers/listeners — to re-render
// just because the Auto Balance toggle or a claim error changed elsewhere
// on the page.
const ActiveTaskPanel = memo(function ActiveTaskPanel({
  uid,
  task,
  minimumWatchSeconds,
  alreadyDoneBeforeOpening,
  completion,
  now,
  onCompleted,
  onCollapse,
}: ActiveTaskPanelProps) {
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
          <ExternalTaskWatch
            uid={uid}
            taskId={task.id}
            minimumWatchSeconds={minimumWatchSeconds}
            completion={completion}
            now={now}
            onCompleted={() => onCompleted(task.id)}
            onCollapse={() => onCollapse(task.id)}
          />
        </>
      )}
    </div>
  );
});
