"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDownToLine, ArrowLeft, ArrowUpFromLine, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { SelectField } from "@/components/ui/select-field";
import { formatCurrency, formatDate } from "@/lib/format";
import { calculateLevel, levelLabel } from "@/lib/level";
import { useAuth } from "@/features/auth/context/auth-provider";
import { useAdminUserProfile } from "@/features/admin/hooks/use-admin-user-profile";
import { useAdminUserWalletHistory } from "@/features/admin/hooks/use-admin-user-wallet-history";
import { useAdminPackages } from "@/features/admin/hooks/use-admin-packages";
import { useAdminReferralInsights } from "@/features/admin/hooks/use-admin-referral-insights";
import { setUserPackageAction } from "@/features/admin/lib/user-actions";
import { HistoryCard, HistoryListRow } from "@/features/dashboard/components/history-card";
import { WalletAdjustmentForm } from "@/features/admin/components/wallet-adjustment-form";
import { UserStatusActions, STATUS_BADGE_STYLES } from "@/features/admin/components/user-status-actions";
import { transactionDirectionFor } from "@/lib/transaction-direction";
import { DeleteUserModal } from "@/features/admin/components/delete-user-modal";

const NEUTRAL_BADGE = "border-white/15 bg-white/5 text-white/70";

type UserDetailClientProps = {
  uid: string;
};

export function UserDetailClient({ uid }: UserDetailClientProps) {
  const { user: adminUser } = useAuth();
  const router = useRouter();
  const { profile, loading, error, retry } = useAdminUserProfile(uid);
  const history = useAdminUserWalletHistory(uid);
  const { packages } = useAdminPackages();
  const {
    insights,
    loading: insightsLoading,
    error: insightsError,
    retry: retryInsights,
  } = useAdminReferralInsights(uid, profile?.referredBy ?? null);

  const [selectedPackage, setSelectedPackage] = useState("");
  const [packageBusy, setPackageBusy] = useState(false);
  const [packageError, setPackageError] = useState<string | null>(null);
  const [packageSuccess, setPackageSuccess] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  function reviewer() {
    if (!adminUser) throw new Error("Not signed in.");
    return { adminUid: adminUser.uid, adminName: adminUser.displayName ?? adminUser.email ?? "Admin" };
  }

  async function handleChangePackage() {
    if (!profile || packageBusy) return;
    setPackageBusy(true);
    setPackageError(null);
    setPackageSuccess(false);
    try {
      const packageId = selectedPackage || null;
      const packageName = packageId ? (packages.find((pkg) => pkg.id === packageId)?.name ?? null) : null;
      await setUserPackageAction(uid, profile.fullName, packageId, packageName, reviewer());
      setPackageSuccess(true);
    } catch (err) {
      setPackageError(err instanceof Error ? err.message : "Couldn’t change this user’s package.");
    } finally {
      setPackageBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-surface-2 p-6">
        <Alert variant="error">{error}</Alert>
        <Button variant="outline" size="sm" onClick={retry}>
          Retry
        </Button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-2xl border border-white/10 bg-surface-2 p-6">
        <Alert variant="info">This user could not be found.</Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/users"
        className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to users
      </Link>

      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">{profile.fullName}</h1>
            <p className="text-sm text-white/50">
              {profile.email} · Referral code {profile.referralCode}
            </p>
          </div>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide ${STATUS_BADGE_STYLES[profile.accountStatus]}`}
          >
            {profile.accountStatus}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <div>
            <p className="text-xs text-white/50">Legacy Wallet Balance</p>
            <p className="text-lg font-bold text-white">{formatCurrency(profile.walletBalance)}</p>
          </div>
          <div>
            <p className="text-xs text-white/50">Current Balance</p>
            <p className="text-lg font-bold text-white">{formatCurrency(profile.currentBalance)}</p>
          </div>
          <div>
            <p className="text-xs text-white/50">Coca-Cola Earning</p>
            <p className="text-lg font-bold text-white">{formatCurrency(profile.cocaColaEarning)}</p>
          </div>
          <div>
            <p className="text-xs text-white/50">Staff Earning (legacy field)</p>
            <p className="text-lg font-bold text-white">{formatCurrency(profile.staffEarning)}</p>
          </div>
          <div>
            <p className="text-xs text-white/50">Package</p>
            <p className="text-lg font-bold text-white">
              {profile.package
                ? (packages.find((pkg) => pkg.id === profile.package)?.name ?? "Unknown")
                : "None"}
            </p>
          </div>
        </div>

        <UserStatusActions
          uid={uid}
          userName={profile.fullName}
          accountStatus={profile.accountStatus}
          reviewer={reviewer}
          onChanged={retry}
        />
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-6">
        <h2 className="text-sm font-semibold text-white">Referral</h2>
        {insightsLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-10 w-full animate-pulse rounded-lg bg-white/5" />
            ))}
          </div>
        ) : insightsError ? (
          <div className="flex flex-col items-start gap-3">
            <Alert variant="error">{insightsError}</Alert>
            <Button variant="outline" size="sm" onClick={retryInsights}>
              Retry
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-white/50">Referred by</p>
              <p className="text-sm font-bold text-white">
                {insights?.referrerName ?? (profile.referredBy ? "Unknown" : "No referrer")}
              </p>
              {insights?.referrerEmail && <p className="text-xs text-white/40">{insights.referrerEmail}</p>}
            </div>
            <div>
              <p className="text-xs text-white/50">Direct referrals</p>
              <p className="text-lg font-bold text-white">{insights?.directTotal ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-white/50">Active direct referrals</p>
              <p className="text-lg font-bold text-white">{insights?.directActive ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-white/50">Total commission generated</p>
              <p className="text-lg font-bold text-white">
                {formatCurrency(insights?.totalCommissionGenerated ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/50">Current Level</p>
              <p className="text-lg font-bold text-white">
                {(() => {
                  const level = calculateLevel(insights?.directActive ?? 0);
                  return level.level != null ? levelLabel(level.level) : "No Level";
                })()}
              </p>
              {insights && calculateLevel(insights.directActive).nextLevel != null && (
                <p className="text-xs text-white/40">
                  {calculateLevel(insights.directActive).referralsNeeded} more for{" "}
                  {levelLabel(calculateLevel(insights.directActive).nextLevel!)}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <WalletAdjustmentForm uid={uid} userName={profile.fullName} reviewer={reviewer} onAdjusted={retry} />

      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-6">
        <h2 className="text-sm font-semibold text-white">Change package</h2>
        {packageError && <Alert variant="error">{packageError}</Alert>}
        {packageSuccess && <Alert variant="success">Package updated.</Alert>}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <SelectField
            label="Package"
            value={selectedPackage}
            onChange={(event) => setSelectedPackage(event.target.value)}
            className="sm:max-w-xs"
          >
            <option value="">None</option>
            {packages.map((pkg) => (
              <option key={pkg.id} value={pkg.id}>
                {pkg.name}
              </option>
            ))}
          </SelectField>
          <Button size="md" disabled={packageBusy} onClick={handleChangePackage}>
            {packageBusy ? <Spinner /> : "Save"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <HistoryCard
          title="Transactions"
          loading={history.loading}
          error={history.error}
          retry={history.retry}
          items={history.transactions}
          emptyMessage="No transactions yet."
          emptyIcon={Receipt}
          itemKey={(transaction, index) => `${transaction.uid}-${index}`}
          renderItem={(transaction) => (
            <HistoryListRow
              title={transaction.type}
              subtitle={formatDate(transaction.createdAt)}
              amount={transaction.amount}
              direction={transactionDirectionFor(transaction)}
              status={transaction.status}
              statusClassName={NEUTRAL_BADGE}
            />
          )}
        />
        <HistoryCard
          title="Deposits"
          loading={history.loading}
          error={history.error}
          retry={history.retry}
          items={history.deposits}
          emptyMessage="No deposits yet."
          emptyIcon={ArrowDownToLine}
          itemKey={(deposit, index) => `${deposit.referenceId}-${index}`}
          renderItem={(deposit) => (
            <HistoryListRow
              title={`Ref: ${deposit.referenceId}`}
              subtitle={formatDate(deposit.createdAt)}
              amount={deposit.amount}
              direction="in"
              status={deposit.status}
              statusClassName={NEUTRAL_BADGE}
            />
          )}
        />
        <HistoryCard
          title="Withdrawals"
          loading={history.loading}
          error={history.error}
          retry={history.retry}
          items={history.withdrawals}
          emptyMessage="No withdrawals yet."
          emptyIcon={ArrowUpFromLine}
          itemKey={(withdrawal, index) => `${withdrawal.accountNumber}-${index}`}
          renderItem={(withdrawal) => (
            <HistoryListRow
              title={withdrawal.accountNumber}
              subtitle={formatDate(withdrawal.createdAt)}
              amount={withdrawal.amount}
              direction="out"
              status={withdrawal.status}
              statusClassName={NEUTRAL_BADGE}
            />
          )}
        />
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-red-500/20 bg-surface-2 p-4 sm:p-6">
        <div>
          <h2 className="text-sm font-semibold text-white">Danger zone</h2>
          <p className="text-xs text-white/50">
            Permanently deletes this user&apos;s sign-in account and profile. Financial and referral
            history is preserved. This cannot be undone.
          </p>
        </div>
        <Button
          variant="destructive"
          size="sm"
          className="self-start"
          onClick={() => setDeleteModalOpen(true)}
        >
          Permanently delete account
        </Button>
      </div>

      {deleteModalOpen && (
        <DeleteUserModal
          uid={uid}
          userName={profile.fullName}
          userEmail={profile.email}
          onClose={() => setDeleteModalOpen(false)}
          onDeleted={() => router.push("/admin/users")}
        />
      )}
    </div>
  );
}
