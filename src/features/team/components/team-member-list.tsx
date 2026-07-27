"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTeamMembers } from "@/features/user/hooks/use-team-members";
import { TeamMemberRow } from "@/features/team/components/team-member-row";
import { LoadMoreButton } from "@/features/admin/components/load-more-button";
import { REFERRAL_LEVELS } from "@/lib/firestore/team-members";
import type { TeamLevelFilter } from "@/lib/firestore/team-members";

type StatusFilter = "all" | "active" | "none";

export function TeamMemberList() {
  const [levelFilter, setLevelFilter] = useState<TeamLevelFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const { members, loading, loadingMore, error, hasMore, loadMore, retry } =
    useTeamMembers(levelFilter);

  // Packages never expire — "active" is simply whether a package is
  // currently assigned at all (see team-members.ts).
  const filteredMembers = members.filter((member) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "none") return member.packageId == null;
    return member.packageId != null;
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-semibold text-white">Team members</h2>
        <div className="flex gap-2">
          <select
            value={levelFilter === "all" ? "all" : String(levelFilter)}
            onChange={(event) =>
              setLevelFilter(event.target.value === "all" ? "all" : Number(event.target.value))
            }
            className="rounded-xl border border-white/15 bg-surface-3 px-3 py-2 text-sm text-white transition-colors focus:border-brand focus:outline-none"
          >
            <option value="all">All levels</option>
            {Array.from({ length: REFERRAL_LEVELS }, (_, index) => index + 1).map((level) => (
              <option key={level} value={level}>
                Level {level}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="rounded-xl border border-white/15 bg-surface-3 px-3 py-2 text-sm text-white transition-colors focus:border-brand focus:outline-none"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="none">No package</option>
          </select>
        </div>
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

      {!loading && !error && filteredMembers.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/10 py-10 text-center">
          <p className="text-sm text-white/50">
            {members.length === 0
              ? "No one has joined your team yet. Share your referral link to get started."
              : "No team members match this filter."}
          </p>
        </div>
      )}

      {!loading && !error && filteredMembers.length > 0 && (
        <div className="flex flex-col gap-3">
          {filteredMembers.map((member) => (
            <TeamMemberRow key={member.id} member={member} />
          ))}
          <LoadMoreButton hasMore={hasMore} loading={loadingMore} onClick={loadMore} />
        </div>
      )}
    </div>
  );
}
