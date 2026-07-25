"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/context/auth-provider";
import { useUserProfile } from "@/features/user/hooks/use-user-profile";
import { usePackageLimits } from "@/features/wallet/hooks/use-package-limits";
import { FirebaseSetupNotice } from "@/features/auth/components/firebase-setup-notice";
import { AppHeader } from "@/components/layout/app-header";
import { MissingProfileRecovery } from "@/features/dashboard/components/missing-profile-recovery";
import { useAvailableTasks } from "@/features/tasks/hooks/use-available-tasks";
import { TaskCard } from "@/features/tasks/components/task-card";
import { TaskSubmissionForm } from "@/features/tasks/components/task-submission-form";
import { TaskSubmissionHistory } from "@/features/tasks/components/task-submission-history";
import type { TaskDoc, TaskFrequency } from "@/lib/firestore/tasks";

type FrequencyFilter = TaskFrequency | "all";

export default function TasksPage() {
  const { user, loading: authLoading, configured } = useAuth();
  const router = useRouter();
  const {
    profile,
    loading: profileLoading,
    error: profileError,
    retry: retryProfile,
  } = useUserProfile();
  const { tasks, loading: tasksLoading, error: tasksError, retry: retryTasks } = useAvailableTasks();
  const { packageInfo } = usePackageLimits(profile?.package ?? null);

  const [search, setSearch] = useState("");
  const [frequencyFilter, setFrequencyFilter] = useState<FrequencyFilter>("all");
  const [selectedTask, setSelectedTask] = useState<TaskDoc | null>(null);
  // One-time snapshot at mount, not re-read on every render — the actual
  // enforcement is server-side (firestore.rules), this is just UI gating.
  const [now] = useState(() => Date.now());

  useEffect(() => {
    if (!configured || authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!user.emailVerified) {
      router.replace("/verify-email");
    }
  }, [configured, authLoading, user, router]);

  const hasQualifyingPackage = Boolean(
    profile?.package &&
      profile.packageExpiresAt &&
      now < profile.packageExpiresAt.toMillis() &&
      packageInfo?.isActive,
  );

  function disabledReasonFor(task: TaskDoc): string | null {
    if (!hasQualifyingPackage) return "Requires an active package";
    if (task.requiredPackageId && profile?.package !== task.requiredPackageId) {
      return "Package doesn't qualify";
    }
    if (task.minPackagePrice != null && (packageInfo?.price ?? 0) < task.minPackagePrice) {
      return "Package doesn't qualify";
    }
    return null;
  }

  const visibleTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (task.status !== "active") return false;
      if (now < task.startDate.toMillis()) return false;
      if (task.endDate && now > task.endDate.toMillis()) return false;
      if (frequencyFilter !== "all" && task.frequency !== frequencyFilter) return false;
      if (search.trim() && !task.title.toLowerCase().includes(search.trim().toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [tasks, frequencyFilter, search, now]);

  if (!configured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-6">
        <FirebaseSetupNotice />
      </div>
    );
  }

  const gateLoading = authLoading || !user || !user.emailVerified;

  return (
    <div className="min-h-screen bg-black">
      <AppHeader />

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10 sm:py-14">
        {gateLoading && (
          <div className="flex min-h-[60vh] items-center justify-center">
            <Spinner className="h-6 w-6" />
          </div>
        )}

        {!gateLoading && profileLoading && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-64 w-full rounded-2xl" />
            ))}
          </div>
        )}

        {!gateLoading && !profileLoading && profileError && (
          <div className="flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-surface-2 p-6">
            <Alert variant="error">{profileError}</Alert>
            <Button variant="outline" size="sm" onClick={retryProfile}>
              Retry
            </Button>
          </div>
        )}

        {!gateLoading && !profileLoading && !profileError && !profile && (
          <MissingProfileRecovery onRetry={retryProfile} />
        )}

        {!gateLoading && !profileLoading && !profileError && profile && (
          <>
            <div>
              <div className="flex items-center gap-2">
                <ClipboardList className="h-6 w-6 text-brand-light" aria-hidden="true" />
                <h1 className="text-2xl font-bold text-white">Tasks</h1>
              </div>
              <p className="text-sm text-white/50">
                Complete tasks to earn extra rewards. Submissions are reviewed before payout.
              </p>
            </div>

            {!hasQualifyingPackage && (
              <Alert variant="info">
                You need an active package to complete tasks. Visit the Packages page to purchase one.
              </Alert>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <input
                type="text"
                placeholder="Search tasks…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-xl border border-white/15 bg-surface-3 px-4 py-2.5 text-sm text-white placeholder:text-white/30 transition-colors focus:border-brand focus:outline-none sm:max-w-xs"
              />
              <select
                value={frequencyFilter}
                onChange={(event) => setFrequencyFilter(event.target.value as FrequencyFilter)}
                className="rounded-xl border border-white/15 bg-surface-3 px-4 py-2.5 text-sm text-white transition-colors focus:border-brand focus:outline-none"
              >
                <option value="all">All frequencies</option>
                <option value="one_time">One-time</option>
                <option value="daily">Daily</option>
              </select>
            </div>

            {tasksLoading && (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-64 w-full rounded-2xl" />
                ))}
              </div>
            )}

            {!tasksLoading && tasksError && (
              <div className="flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-surface-2 p-6">
                <Alert variant="error">{tasksError}</Alert>
                <Button variant="outline" size="sm" onClick={retryTasks}>
                  Retry
                </Button>
              </div>
            )}

            {!tasksLoading && !tasksError && visibleTasks.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 py-10 text-center">
                <p className="text-sm text-white/50">No tasks match right now.</p>
              </div>
            )}

            {!tasksLoading && !tasksError && visibleTasks.length > 0 && (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {visibleTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    disabledReason={disabledReasonFor(task)}
                    onSelect={() => setSelectedTask(task)}
                  />
                ))}
              </div>
            )}

            {selectedTask && (
              <TaskSubmissionForm
                task={selectedTask}
                onDone={() => setSelectedTask(null)}
                onCancel={() => setSelectedTask(null)}
              />
            )}

            <TaskSubmissionHistory />
          </>
        )}
      </main>
    </div>
  );
}
