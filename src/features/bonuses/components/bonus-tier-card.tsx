import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import type { BonusTierDoc } from "@/lib/firestore/bonus-tiers";
import type { TeamSummary } from "@/features/user/hooks/use-team-summary";

type BonusTierCardProps = {
  tier: BonusTierDoc;
  summary: TeamSummary | null;
  packageId: string | null;
  awarded: boolean;
  pending: boolean;
  submitting: boolean;
  onClaim: () => void;
};

function ProgressRow({ label, have, need }: { label: string; have: number; need: number }) {
  const met = have >= need;
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-white/50">{label}</span>
      <span className={met ? "font-medium text-emerald-400" : "font-medium text-white/70"}>
        {have.toLocaleString()} / {need.toLocaleString()}
      </span>
    </div>
  );
}

export function BonusTierCard({
  tier,
  summary,
  packageId,
  awarded,
  pending,
  submitting,
  onClaim,
}: BonusTierCardProps) {
  const directReferrals = summary?.levelCounts[1] ?? 0;
  const totalTeam = summary?.total ?? 0;
  const activeTeam = summary?.active ?? 0;

  const packageOk = tier.requiredPackageId == null || packageId === tier.requiredPackageId;
  const eligible =
    directReferrals >= tier.requiredDirectReferrals &&
    totalTeam >= tier.requiredTotalTeam &&
    activeTeam >= tier.requiredActiveTeam &&
    packageOk;

  let buttonLabel = "Claim bonus";
  let disabled = submitting;
  if (awarded) {
    buttonLabel = "Already received";
    disabled = true;
  } else if (pending) {
    buttonLabel = "Awaiting review";
    disabled = true;
  } else if (!eligible) {
    buttonLabel = "Not yet eligible";
    disabled = true;
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-surface-2 p-5">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-lg font-bold text-white">{tier.name}</h3>
        <span className="flex-shrink-0 rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/60">
          {tier.recurrence === "recurring" ? "Recurring" : "One-time"}
        </span>
      </div>

      <p className="text-2xl font-bold text-white">{formatCurrency(tier.bonusAmount)}</p>

      <div className="flex flex-col gap-1.5 border-t border-white/10 pt-3">
        <ProgressRow label="Direct referrals" have={directReferrals} need={tier.requiredDirectReferrals} />
        <ProgressRow label="Total team" have={totalTeam} need={tier.requiredTotalTeam} />
        <ProgressRow label="Active team" have={activeTeam} need={tier.requiredActiveTeam} />
        {tier.requiredPackageId && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/50">Package</span>
            <span className={packageOk ? "font-medium text-emerald-400" : "font-medium text-white/70"}>
              {packageOk ? "Qualifies" : "Doesn't qualify"}
            </span>
          </div>
        )}
      </div>

      <Button size="md" disabled={disabled} onClick={onClaim} className="mt-auto">
        {buttonLabel}
      </Button>
    </div>
  );
}
