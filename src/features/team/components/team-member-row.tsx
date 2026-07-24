import { formatDate } from "@/lib/format";
import type { TeamMemberWithId } from "@/features/user/hooks/use-team-members";

type TeamMemberRowProps = {
  member: TeamMemberWithId;
  now: number;
};

export function TeamMemberRow({ member, now }: TeamMemberRowProps) {
  const isActive = member.packageExpiresAt != null && now < member.packageExpiresAt.toMillis();
  const hasPackage = member.packageId != null;

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-white">{member.memberName}</p>
          <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/50">
            Level {member.level}
          </span>
        </div>
        <p className="text-xs text-white/50">
          {hasPackage ? member.packageName ?? "Package" : "No package yet"} · Joined{" "}
          {formatDate(member.joinedAt)}
        </p>
      </div>
      <span
        className={`w-fit flex-shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
          !hasPackage
            ? "border-white/15 bg-white/5 text-white/50"
            : isActive
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-red-500/30 bg-red-500/10 text-red-300"
        }`}
      >
        {!hasPackage ? "No package" : isActive ? "Active" : "Expired"}
      </span>
    </div>
  );
}
