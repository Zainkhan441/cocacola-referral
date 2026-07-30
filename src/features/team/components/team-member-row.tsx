import { formatCurrency, formatDate } from "@/lib/format";
import type { TeamMemberWithId } from "@/features/user/hooks/use-team-members";

type TeamMemberRowProps = {
  member: TeamMemberWithId;
};

// Never shows member.level (the referral network's depth, 1-12) as a
// "Level N" badge — that's a completely different concept from the
// CocaCola Level System (src/lib/level.ts) and showing it here was
// confusing enough to be mistaken for it. The network-depth filter on
// TeamMemberList's own "All levels" dropdown is the only place that number
// is still surfaced. A referred user only ever counts toward the referring
// user's Active Direct Referral / Level progress once their package
// purchase has been APPROVED — packageId here is null for a registered-only
// or still-pending signup, and only ever set by the admin approval
// transaction (see approveDeposit), never by mere registration or a
// pending/rejected request. Packages never expire, so "active" is simply
// whether a package is currently assigned at all.
export function TeamMemberRow({ member }: TeamMemberRowProps) {
  const hasPackage = member.packageId != null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-semibold text-white">{member.memberName}</p>
        <span
          className={`w-fit flex-shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
            hasPackage
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-white/15 bg-white/5 text-white/50"
          }`}
        >
          {hasPackage ? "Active" : "Registered"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-white/10 pt-3 text-xs sm:grid-cols-4">
        <div>
          <p className="text-white/40">Package</p>
          <p className="font-medium text-white/80">{hasPackage ? member.packageName ?? "Package" : "No Package Yet"}</p>
        </div>
        <div>
          <p className="text-white/40">Join date</p>
          <p className="font-medium text-white/80">{formatDate(member.joinedAt)}</p>
        </div>
        {member.packageApprovedAt && (
          <div>
            <p className="text-white/40">Package approval date</p>
            <p className="font-medium text-white/80">{formatDate(member.packageApprovedAt)}</p>
          </div>
        )}
        {member.commissionEarned > 0 && (
          <div>
            <p className="text-white/40">Commission generated</p>
            <p className="font-medium text-emerald-400">{formatCurrency(member.commissionEarned)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
