"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { formatCurrency } from "@/lib/format";
import { VideoTaskPlayer } from "@/features/tasks/components/video-task-player";
import { setAutoBalancePreference } from "@/features/tasks/lib/actions";
import { isNewPakistanDay } from "@/lib/date-utils";
import type { useDailyTasks } from "@/features/tasks/hooks/use-daily-tasks";

type TaskRotationListProps = {
  uid: string;
  daily: ReturnType<typeof useDailyTasks>;
  packageEarning: number;
  rewardPerAd: number;
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
// (manual mode) or automatically (Auto Balance mode).
//
// Ad playback flow: activeTaskId tracks the single task currently open for
// watching — it's set ONLY by the user clicking that task's own "Watch ad"
// button, and it's only ever changed again by the user clicking a
// DIFFERENT task's "Watch ad" button. Completing an ad never resets it, so
// the just-completed video stays mounted and playable exactly as it was —
// no auto-close, no auto-pause, no auto-advance to the next task.
export function TaskRotationList({
  uid,
  daily,
  packageEarning,
  rewardPerAd,
  minimumWatchSeconds,
  autoBalanceAfterAds,
}: TaskRotationListProps) {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [autoBalance, setAutoBalanceState] = useState(autoBalanceAfterAds);
  const [toggleError, setToggleError] = useState<string | null>(null);
  // Shared with useDailyTasks — a live Pakistan-time clock, not a stale
  // mount-time snapshot, so a completion from before a midnight rollover
  // (tab left open) correctly stops showing as "completed today" and the
  // Watch button reappears without a manual reload.
  const now = daily.now;

  const totalReward = daily.requiredCount * rewardPerAd + packageEarning;

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-white">Today’s progress</p>
          <p className="text-sm text-white/60">
            {daily.completedTodayCount} / {daily.requiredCount} complete
          </p>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-brand transition-all"
            style={{
              width: `${daily.requiredCount > 0 ? Math.min(100, (daily.completedTodayCount / daily.requiredCount) * 100) : 0}%`,
            }}
          />
        </div>
        <p className="text-xs text-white/50">
          Complete all {daily.requiredCount} ad{daily.requiredCount === 1 ? "" : "s"} today to unlock{" "}
          {formatCurrency(totalReward)} — {formatCurrency(rewardPerAd)} per ad plus{" "}
          {formatCurrency(packageEarning)} in Coca-Cola Earning.
        </p>
      </div>

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
              className="self-start"
              disabled={!daily.allDoneToday || daily.claiming}
              onClick={() => daily.claim()}
            >
              {daily.claiming ? "Claiming…" : "Claim Reward"}
            </Button>
          </>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {daily.assignedTasks.map((task) => {
          const completion = daily.completions[task.id];
          const completedToday = Boolean(
            completion?.completedAt && !isNewPakistanDay(completion.completedAt.toMillis(), now),
          );
          const isActive = activeTaskId === task.id;

          return (
            <div key={task.id} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <p className="font-semibold text-white">{task.title}</p>
                  <p className="text-xs text-white/50">{task.description}</p>
                </div>
                {completedToday && <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-400" aria-hidden="true" />}
              </div>

              {(!completedToday || isActive) && (
                <p className="whitespace-pre-wrap text-sm text-white/60">{task.instructions}</p>
              )}

              {isActive ? (
                // Stays mounted (video keeps playing, uninterrupted) even
                // after this ad's own completion is recorded — completing
                // one ad must never auto-close/pause/stop its video or
                // auto-advance to the next one. The user leaves this ad
                // whenever THEY choose, by clicking a different task's own
                // "Watch ad" button below.
                <VideoTaskPlayer
                  uid={uid}
                  taskId={task.id}
                  videoUrl={task.videoUrl}
                  minimumWatchSeconds={minimumWatchSeconds}
                />
              ) : completedToday ? (
                <Alert variant="success">Completed for today.</Alert>
              ) : (
                <Button variant="outline" size="md" className="self-start" onClick={() => setActiveTaskId(task.id)}>
                  Watch ad
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
