"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAdminStats } from "@/features/admin/hooks/use-admin-stats";
import { StatCard, StatCardSkeleton } from "@/features/admin/components/stat-card";
import { formatCurrency } from "@/lib/format";

export default function AdminDashboardPage() {
  const { stats, loading, error, retry } = useAdminStats();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>

      {loading && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, index) => (
            <StatCardSkeleton key={index} />
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

      {!loading && !error && stats && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <StatCard label="Total users" value={stats.totalUsers.toLocaleString()} />
          <StatCard label="Active users" value={stats.activeUsers.toLocaleString()} />
          <StatCard label="Total deposits" value={formatCurrency(stats.totalDeposits)} />
          <StatCard label="Pending deposits" value={stats.pendingDeposits.toLocaleString()} />
          <StatCard label="Approved deposits" value={stats.approvedDeposits.toLocaleString()} />
          <StatCard label="Total withdrawals" value={formatCurrency(stats.totalWithdrawals)} />
          <StatCard label="Pending withdrawals" value={stats.pendingWithdrawals.toLocaleString()} />
          <StatCard label="Total revenue" value={formatCurrency(stats.totalRevenue)} />
          <StatCard
            label="Total referral rewards"
            value={formatCurrency(stats.totalReferralRewards)}
          />
        </div>
      )}
    </div>
  );
}
