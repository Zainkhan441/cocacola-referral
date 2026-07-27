import { formatCurrency, formatDate, maskEmail } from "@/lib/format";
import type { TeamMemberWithId } from "@/features/user/hooks/use-team-members";

type DirectReferralRowProps = {
  member: TeamMemberWithId;
};

// Packages never expire, so "Active" is simply whether a package is
// currently assigned — there is no time-based "Inactive" transition in
// this business model (see PackageStatusCard). "Registered" covers both a
// brand-new signup and one whose package purchase is still awaiting admin
// review — this app doesn't denormalize a separate "payment pending" flag
// onto teamMembers (that would require a new cross-user write path from
// the referred member's own client), so the two states are shown together
// rather than fabricated.
export function DirectReferralRow({ member }: DirectReferralRowProps) {
  const hasPackage = member.packageId != null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <p className="font-semibold text-white">{member.memberName}</p>
          <p className="text-xs text-white/50">{maskEmail(member.memberEmail)}</p>
        </div>
        <span
          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
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
          <p className="text-white/40">Joined</p>
          <p className="font-medium text-white/80">{formatDate(member.joinedAt)}</p>
        </div>
        <div>
          <p className="text-white/40">Package</p>
          <p className="font-medium text-white/80">{member.packageName ?? "None yet"}</p>
        </div>
        <div>
          <p className="text-white/40">Package price</p>
          <p className="font-medium text-white/80">
            {member.packagePrice != null ? formatCurrency(member.packagePrice) : "—"}
          </p>
        </div>
        <div>
          <p className="text-white/40">Commission earned</p>
          <p className="font-medium text-emerald-400">{formatCurrency(member.commissionEarned)}</p>
        </div>
      </div>

      {member.packageApprovedAt && (
        <p className="text-xs text-white/40">Approved {formatDate(member.packageApprovedAt)}</p>
      )}
    </div>
  );
}
