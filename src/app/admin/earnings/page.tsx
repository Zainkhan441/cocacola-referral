"use client";

import { useState } from "react";
import { Gift } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/format";
import { useAuth } from "@/features/auth/context/auth-provider";
import { useGlobalSettings } from "@/features/earnings/hooks/use-global-settings";
import { setDailyClaimsEnabledAction } from "@/features/admin/lib/settings-actions";
import { useAdminDailyRewards } from "@/features/admin/hooks/use-admin-daily-rewards";
import { LoadMoreButton } from "@/features/admin/components/load-more-button";

export default function AdminEarningsPage() {
  const { user } = useAuth();
  const { settings, loading: settingsLoading, error: settingsError, retry: retrySettings } =
    useGlobalSettings();
  const { rewards, loading, loadingMore, error, hasMore, loadMore, retry } =
    useAdminDailyRewards();

  const [toggling, setToggling] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const dailyClaimsEnabled = settings ? settings.dailyClaimsEnabled : true;

  async function handleToggle() {
    if (!user || toggling) return;
    setToggling(true);
    setToggleError(null);
    try {
      await setDailyClaimsEnabledAction(!dailyClaimsEnabled, {
        adminUid: user.uid,
        adminName: user.displayName ?? user.email ?? "Admin",
      });
      retrySettings();
    } catch (err) {
      setToggleError(err instanceof Error ? err.message : "Couldn’t update this setting.");
    } finally {
      setToggling(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-white">Earnings</h1>

      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white">Daily claims (platform-wide)</h2>
            <p className="text-xs text-white/50">
              Individual packages can still be paused separately on the Packages page.
            </p>
          </div>
          {settingsLoading ? (
            <Skeleton className="h-9 w-24" />
          ) : (
            <Button variant="outline" size="sm" disabled={toggling} onClick={handleToggle}>
              {toggling ? (
                <Spinner />
              ) : dailyClaimsEnabled ? (
                "Disable claims"
              ) : (
                "Enable claims"
              )}
            </Button>
          )}
        </div>
        {settingsError && <Alert variant="error">{settingsError}</Alert>}
        {toggleError && <Alert variant="error">{toggleError}</Alert>}
        <span
          className={`w-fit rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide ${
            dailyClaimsEnabled
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-amber-500/30 bg-amber-500/10 text-amber-300"
          }`}
        >
          {dailyClaimsEnabled ? "Enabled" : "Disabled"}
        </span>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-6">
        <h2 className="text-sm font-semibold text-white">Earning logs</h2>

        {loading && (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-start gap-3">
            <Alert variant="error">{error}</Alert>
            <Button variant="outline" size="sm" onClick={retry}>
              Retry
            </Button>
          </div>
        )}

        {!loading && !error && rewards.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/10 py-10 text-center">
            <Gift className="h-6 w-6 text-white/30" aria-hidden="true" />
            <p className="text-sm text-white/50">No claims yet.</p>
          </div>
        )}

        {!loading && !error && rewards.length > 0 && (
          <div className="flex flex-col gap-2">
            <ul className="flex flex-col divide-y divide-white/10">
              {rewards.map((reward, index) => (
                <li key={`${reward.uid}-${index}`} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <p className="truncate text-sm font-medium text-white">{reward.uid}</p>
                    <p className="text-xs text-white/50">
                      {formatDate(reward.createdAt)} · {reward.rewardDate}
                    </p>
                  </div>
                  <p className="flex-shrink-0 text-sm font-semibold text-emerald-400">
                    +{formatCurrency(reward.amount)}
                  </p>
                </li>
              ))}
            </ul>
            <LoadMoreButton hasMore={hasMore} loading={loadingMore} onClick={loadMore} />
          </div>
        )}
      </div>
    </div>
  );
}
