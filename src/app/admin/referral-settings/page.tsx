"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminReferralSettings } from "@/features/admin/hooks/use-admin-referral-settings";
import { ReferralLevelSettingRow } from "@/features/admin/components/referral-level-setting-row";
import { TeamBackfillButton } from "@/features/admin/components/team-backfill-button";

export default function AdminReferralSettingsPage() {
  const { rows, loading, error, retry } = useAdminReferralSettings();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Referral settings</h1>
        <p className="text-sm text-white/50">
          Configure the reward paid at each of the 12 referral levels. Rewards only trigger when a
          referred user&apos;s package purchase is approved.
        </p>
      </div>

      {loading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-surface-2 p-6">
          <Alert variant="error">{error}</Alert>
          <Button variant="outline" size="sm" onClick={retry}>
            Retry
          </Button>
        </div>
      )}

      {!loading && !error && (
        <div className="flex flex-col gap-3">
          {rows.map((row) => (
            <ReferralLevelSettingRow key={row.level} row={row} />
          ))}
        </div>
      )}

      <TeamBackfillButton />
    </div>
  );
}
