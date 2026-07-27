"use client";

import { Users } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTeamMembers } from "@/features/user/hooks/use-team-members";
import { DirectReferralRow } from "@/features/team/components/direct-referral-row";
import { LoadMoreButton } from "@/features/admin/components/load-more-button";

// Direct (level 1) referrals only — the Staff Earning section's referral
// list. Deliberately a separate component from TeamMemberList (the
// existing 12-level network browser still shown further down this page)
// since only level 1 ever carries package price/commission/approval data.
export function DirectReferralList() {
  const { members, loading, loadingMore, error, hasMore, loadMore, retry } = useTeamMembers(1);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-sm font-semibold text-white">Your direct referrals</h2>

      {loading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-2xl" />
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

      {!loading && !error && members.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/10 py-10 text-center">
          <Users className="h-6 w-6 text-white/30" aria-hidden="true" />
          <p className="text-sm text-white/50">
            No direct referrals yet. Share your referral link to get started.
          </p>
        </div>
      )}

      {!loading && !error && members.length > 0 && (
        <div className="flex flex-col gap-3">
          {members.map((member) => (
            <DirectReferralRow key={member.id} member={member} />
          ))}
          <LoadMoreButton hasMore={hasMore} loading={loadingMore} onClick={loadMore} />
        </div>
      )}
    </div>
  );
}
