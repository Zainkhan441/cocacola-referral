"use client";

import { useState } from "react";
import { CheckCircle2, Gift } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { formatCurrency } from "@/lib/format";
import { VideoTaskPlayer } from "@/features/tasks/components/video-task-player";
import { isNewUtcDay } from "@/lib/date-utils";
import type { useDailyTasks } from "@/features/tasks/hooks/use-daily-tasks";

type TaskRotationListProps = {
  uid: string;
  daily: ReturnType<typeof useDailyTasks>;
  packageEarning: number;
  rewardPerAd: number;
};

export function TaskRotationList({ uid, daily, packageEarning, rewardPerAd }: TaskRotationListProps) {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  if (daily.assignedTasks.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 py-10 text-center">
        <p className="text-sm text-white/50">No ad tasks available right now. Check back soon.</p>
      </div>
    );
  }

  const totalTaskReward = daily.requiredCount * rewardPerAd;

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
          Complete all {daily.requiredCount} tasks to earn {formatCurrency(totalTaskReward)} +{" "}
          {formatCurrency(packageEarning)} — both credited together, once.
        </p>
      </div>

      {daily.alreadyClaimedToday ? (
        <Alert variant="success">Today’s reward has already been claimed. Come back tomorrow.</Alert>
      ) : daily.allDoneToday ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 sm:p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
            <Gift className="h-4 w-4" aria-hidden="true" />
            All tasks complete — claim your reward!
          </p>
          {daily.claimError && <Alert variant="error">{daily.claimError}</Alert>}
          <Button size="md" disabled={daily.claiming} onClick={daily.claim} className="self-start">
            {daily.claiming ? <Spinner /> : `Claim ${formatCurrency(totalTaskReward + packageEarning)}`}
          </Button>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        {daily.assignedTasks.map((task) => {
          const completion = daily.completions[task.id];
          const completedToday = Boolean(
            completion?.completedAt && !isNewUtcDay(completion.completedAt.toMillis(), now),
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

              {!completedToday && (
                <p className="whitespace-pre-wrap text-sm text-white/60">{task.instructions}</p>
              )}

              {completedToday ? (
                <Alert variant="success">Completed for today.</Alert>
              ) : isActive ? (
                <VideoTaskPlayer
                  uid={uid}
                  taskId={task.id}
                  videoUrl={task.videoUrl}
                  onCompleted={() => setActiveTaskId(null)}
                />
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
