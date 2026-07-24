import { formatCurrency, formatDate } from "@/lib/format";
import type { ReferralRewardWithId } from "@/features/admin/hooks/use-admin-referral-rewards";

type ReferralRewardRowProps = {
  reward: ReferralRewardWithId;
};

export function ReferralRewardRow({ reward }: ReferralRewardRowProps) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-white">{reward.earnerName}</p>
          <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/50">
            Level {reward.level}
          </span>
        </div>
        <p className="text-xs text-white/50">
          From {reward.sourceName}&apos;s package purchase ({formatCurrency(reward.packagePrice)}) ·{" "}
          {reward.rewardType === "percentage"
            ? `${reward.rewardValue}%`
            : `Rs ${reward.rewardValue} flat`}{" "}
          · {formatDate(reward.createdAt)}
        </p>
      </div>
      <p className="text-lg font-bold text-emerald-400">+{formatCurrency(reward.amount)}</p>
    </div>
  );
}
