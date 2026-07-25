"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, CheckCircle2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/context/auth-provider";
import { useUserProfile } from "@/features/user/hooks/use-user-profile";
import { usePackageLimits } from "@/features/wallet/hooks/use-package-limits";
import { useAvailableTasks } from "@/features/tasks/hooks/use-available-tasks";
import { useDailyTaskQuota } from "@/features/tasks/hooks/use-daily-task-quota";
import { FirebaseSetupNotice } from "@/features/auth/components/firebase-setup-notice";
import { AppHeader } from "@/components/layout/app-header";
import { MissingProfileRecovery } from "@/features/dashboard/components/missing-profile-recovery";
import { DailyClaimCard, DailyClaimCardSkeleton } from "@/features/dashboard/components/daily-claim-card";
import { ClaimHistory } from "@/features/dashboard/components/claim-history";
import { TaskCard } from "@/features/tasks/components/task-card";
import { TaskSubmissionForm } from "@/features/tasks/components/task-submission-form";
import type { TaskDoc } from "@/lib/firestore/tasks";

// The daily ritual home: today's automatic Coca-Cola earning status (passive
// display only — no claim button, that rule is unchanged from Milestone 18)
// plus today's task quota, both reusing their existing engines/components
// exactly as built. This page adds no new business logic — it only composes
// DailyClaimCard, useAvailableTasks, and useDailyTaskQuota into one screen so
// a user has a single daily destination instead of two separate pages.
export default function WorkRoomPage() {
  const { user, loading: authLoading, configured } = useAuth();
  const router = useRouter();
  const {
    profile,
    loading: profileLoading,
    error: profileError,
    retry: retryProfile,
  } = useUserProfile();
  const { packageInfo, loading: packageLoading } = usePackageLimits(profile?.package ?? null);
  const { tasks, loading: tasksLoading, error: tasksError, retry: retryTasks } = useAvailableTasks();
  const { usedToday, loading: quotaLoading } = useDailyTaskQuota();

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

  const dailyTaskLimit = packageInfo?.dailyTaskLimit ?? 0;
  const quotaReached = hasQualifyingPackage && usedToday >= dailyTaskLimit;

  const availableNow = useMemo(() => {
    if (!hasQualifyingPackage) return [];
    return tasks.filter((task) => {
      if (task.status !== "active") return false;
      if (now < task.startDate.toMillis()) return false;
      if (task.endDate && now > task.endDate.toMillis()) return false;
      if (task.requiredPackageId && profile?.package !== task.requiredPackageId) return false;
      if (task.minPackagePrice != null && (packageInfo?.price ?? 0) < task.minPackagePrice) {
        return false;
      }
      return true;
    });
  }, [tasks, now, profile, packageInfo, hasQualifyingPackage]);

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

      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10 sm:py-14">
        {gateLoading && (
          <div className="flex min-h-[60vh] items-center justify-center">
            <Spinner className="h-6 w-6" />
          </div>
        )}

        {!gateLoading && profileLoading && (
          <div className="flex flex-col gap-6">
            <DailyClaimCardSkeleton />
            <Skeleton className="h-32 w-full rounded-2xl" />
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
                <Briefcase className="h-6 w-6 text-brand-light" aria-hidden="true" />
                <h1 className="text-2xl font-bold text-white">Work Room</h1>
              </div>
              <p className="text-sm text-white/50">
                Your daily earning ritual — check today’s Coca-Cola earning and complete
                today’s tasks.
              </p>
            </div>

            <DailyClaimCard profile={profile} />

            {!hasQualifyingPackage && (
              <div className="rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-6">
                <Alert variant="info">
                  You need an active package to complete tasks. Visit the Packages page to
                  purchase one.
                </Alert>
              </div>
            )}

            {hasQualifyingPackage && (
              <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-white">Today’s task quota</h2>
                  {!packageLoading && !quotaLoading && (
                    <p className="text-sm font-medium text-white/70">
                      {Math.min(usedToday, dailyTaskLimit)} / {dailyTaskLimit}
                    </p>
                  )}
                </div>
                {packageLoading || quotaLoading ? (
                  <Skeleton className="h-2 w-full rounded-full" />
                ) : (
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-brand transition-all"
                      style={{
                        width: `${dailyTaskLimit > 0 ? Math.min(100, (usedToday / dailyTaskLimit) * 100) : 0}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {hasQualifyingPackage && quotaReached && (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/10 py-10 text-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-400" aria-hidden="true" />
                <p className="text-sm text-white/70">
                  You’ve completed today’s task quota. Come back tomorrow for more.
                </p>
              </div>
            )}

            {hasQualifyingPackage && !quotaReached && tasksLoading && (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {Array.from({ length: 2 }).map((_, index) => (
                  <Skeleton key={index} className="h-64 w-full rounded-2xl" />
                ))}
              </div>
            )}

            {hasQualifyingPackage && !quotaReached && !tasksLoading && tasksError && (
              <div className="flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-surface-2 p-6">
                <Alert variant="error">{tasksError}</Alert>
                <Button variant="outline" size="sm" onClick={retryTasks}>
                  Retry
                </Button>
              </div>
            )}

            {hasQualifyingPackage && !quotaReached && !tasksLoading && !tasksError && (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {availableNow.length === 0 ? (
                  <p className="text-sm text-white/50">No tasks available right now.</p>
                ) : (
                  availableNow.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      disabledReason={null}
                      onSelect={() => setSelectedTask(task)}
                    />
                  ))
                )}
              </div>
            )}

            {selectedTask && (
              <TaskSubmissionForm
                task={selectedTask}
                onDone={() => setSelectedTask(null)}
                onCancel={() => setSelectedTask(null)}
              />
            )}

            <ClaimHistory />
          </>
        )}
      </main>
    </div>
  );
}
