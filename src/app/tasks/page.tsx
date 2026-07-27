"use client";

import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/context/auth-provider";
import { useUserProfile } from "@/features/user/hooks/use-user-profile";
import { usePackageLimits } from "@/features/wallet/hooks/use-package-limits";
import { useAppAccessGate } from "@/features/auth/hooks/use-app-access-gate";
import { FirebaseSetupNotice } from "@/features/auth/components/firebase-setup-notice";
import { AppHeader } from "@/components/layout/app-header";
import { MissingProfileRecovery } from "@/features/dashboard/components/missing-profile-recovery";
import { useAvailableTasks } from "@/features/tasks/hooks/use-available-tasks";
import { useDailyTasks } from "@/features/tasks/hooks/use-daily-tasks";
import { useTaskRewardSettings } from "@/features/admin/hooks/use-task-reward-settings";
import { TaskRotationList } from "@/features/tasks/components/task-rotation-list";
import { DEFAULT_TASK_REWARD_PER_AD } from "@/lib/firestore/settings";

export default function TasksPage() {
  const { user, loading: authLoading, configured } = useAuth();
  const {
    profile,
    loading: profileLoading,
    error: profileError,
    retry: retryProfile,
  } = useUserProfile();
  const { tasks, loading: tasksLoading, error: tasksError, retry: retryTasks } = useAvailableTasks();
  const { packageInfo } = usePackageLimits(profile?.package ?? null);
  const { settings: rewardSettings } = useTaskRewardSettings();
  const { gateLoading } = useAppAccessGate({ configured, authLoading, user, profile, profileLoading });

  const daily = useDailyTasks(user?.uid, profile, packageInfo, tasks, tasksLoading);
  const rewardPerAd = rewardSettings?.rewardPerAd ?? DEFAULT_TASK_REWARD_PER_AD;
  const packageEarning = profile?.packageDailyEarning ?? packageInfo?.dailyEarning ?? 0;

  const hasQualifyingPackage = Boolean(profile?.package);

  if (!configured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-6">
        <FirebaseSetupNotice />
      </div>
    );
  }

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
          <div className="flex flex-col gap-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-40 w-full rounded-2xl" />
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
                Watch every assigned ad today to unlock your task reward and your daily Coca-Cola
                earning together.
              </p>
            </div>

            {!hasQualifyingPackage && (
              <Alert variant="info">
                You need an active package to complete tasks. Visit the Packages page to purchase one.
              </Alert>
            )}

            {hasQualifyingPackage && daily.error && (
              <div className="flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-surface-2 p-6">
                <Alert variant="error">{daily.error}</Alert>
              </div>
            )}

            {hasQualifyingPackage && !daily.error && (tasksLoading || daily.loading) && (
              <div className="flex flex-col gap-4">
                {Array.from({ length: 2 }).map((_, index) => (
                  <Skeleton key={index} className="h-40 w-full rounded-2xl" />
                ))}
              </div>
            )}

            {hasQualifyingPackage && !daily.error && !tasksLoading && !daily.loading && tasksError && (
              <div className="flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-surface-2 p-6">
                <Alert variant="error">{tasksError}</Alert>
                <Button variant="outline" size="sm" onClick={retryTasks}>
                  Retry
                </Button>
              </div>
            )}

            {hasQualifyingPackage && !daily.error && !tasksLoading && !daily.loading && !tasksError && (
              <TaskRotationList
                uid={user!.uid}
                daily={daily}
                packageEarning={packageEarning}
                rewardPerAd={rewardPerAd}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
