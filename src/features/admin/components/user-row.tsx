import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { STATUS_BADGE_STYLES } from "@/features/admin/components/user-status-actions";
import type { UserDoc } from "@/lib/firestore/users";

type UserRowProps = {
  user: UserDoc;
  packageNameById: Record<string, string>;
};

export function UserRow({ user, packageNameById }: UserRowProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-white">{user.fullName}</p>
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${STATUS_BADGE_STYLES[user.accountStatus]}`}
          >
            {user.accountStatus}
          </span>
        </div>
        <p className="text-xs text-white/50">
          {user.email} · Referral code {user.referralCode} · Package{" "}
          {user.package ? (packageNameById[user.package] ?? "unknown") : "none"}
        </p>
      </div>

      <div className="flex flex-shrink-0 items-center gap-4">
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wide text-white/40">Total earnings</p>
          <p className="text-sm font-semibold text-white">{formatCurrency(user.totalEarnings)}</p>
        </div>
        <Link href={`/admin/users/${user.uid}`}>
          <Button variant="outline" size="sm">
            Manage
          </Button>
        </Link>
      </div>
    </div>
  );
}
