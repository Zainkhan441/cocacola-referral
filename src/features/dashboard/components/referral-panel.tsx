"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { UserDoc } from "@/lib/firestore/users";
import { formatCurrency } from "@/lib/format";
import { getReferralLink } from "@/lib/referral/code";
import { useReferralEarnings } from "@/features/user/hooks/use-referral-earnings";
import { useDirectReferralCounts } from "@/features/user/hooks/use-direct-referral-counts";

type ReferralPanelProps = {
  profile: UserDoc;
};

export function ReferralPanel({ profile }: ReferralPanelProps) {
  const [copied, setCopied] = useState(false);
  const {
    total: referralEarnings,
    loading: earningsLoading,
    error: earningsError,
    retry: retryEarnings,
  } = useReferralEarnings();
  // Live direct-referral counts — deliberately not profile.totalReferrals/
  // activeReferrals, which are never written by anything and always read 0.
  const {
    counts: referralCounts,
    loading: countsLoading,
    error: countsError,
    retry: retryCounts,
  } = useDirectReferralCounts();

  async function handleCopy() {
    await navigator.clipboard.writeText(getReferralLink(profile.referralCode));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-white/50">Your referral link</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <code className="flex-1 truncate rounded-xl border border-white/10 bg-black px-4 py-2.5 text-sm text-white/80">
            {getReferralLink(profile.referralCode)}
          </code>
          <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
            {copied ? (
              <Check className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Copy className="h-4 w-4" aria-hidden="true" />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <p className="text-xs text-white/40">
          Referral code: <span className="font-semibold text-white/70">{profile.referralCode}</span>
        </p>
      </div>

      <div className="flex flex-col gap-3 border-t border-white/10 pt-5 sm:grid sm:grid-cols-3">
        <div className="flex items-center justify-between sm:flex-col sm:items-start sm:gap-1">
          <p className="text-xs font-medium uppercase tracking-wide text-white/50">
            Total referrals
          </p>
          {countsLoading ? (
            <Skeleton className="h-6 w-10" />
          ) : countsError ? (
            <button
              type="button"
              onClick={retryCounts}
              className="text-left text-xs text-red-400 underline decoration-dotted underline-offset-2"
            >
              Retry
            </button>
          ) : (
            <p className="text-lg font-bold text-white sm:text-xl">
              {(referralCounts?.total ?? 0).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex items-center justify-between sm:flex-col sm:items-start sm:gap-1">
          <p className="text-xs font-medium uppercase tracking-wide text-white/50">
            Active referrals
          </p>
          {countsLoading ? (
            <Skeleton className="h-6 w-10" />
          ) : countsError ? (
            <p className="text-xs text-white/40">—</p>
          ) : (
            <p className="text-lg font-bold text-white sm:text-xl">
              {(referralCounts?.active ?? 0).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex items-center justify-between sm:flex-col sm:items-start sm:gap-1">
          <p className="text-xs font-medium uppercase tracking-wide text-white/50">
            Referral earnings
          </p>
          {earningsLoading ? (
            <Skeleton className="h-6 w-16" />
          ) : earningsError ? (
            <button
              type="button"
              onClick={retryEarnings}
              className="text-left text-xs text-red-400 underline decoration-dotted underline-offset-2"
            >
              Retry
            </button>
          ) : (
            <p className="text-lg font-bold text-white sm:text-xl">
              {formatCurrency(referralEarnings ?? 0)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function ReferralPanelSkeleton() {
  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="flex flex-col gap-3 border-t border-white/10 pt-5 sm:grid sm:grid-cols-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}
