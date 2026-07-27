"use client";

import { Package as PackageIcon } from "lucide-react";
import { formatDate } from "@/lib/format";
import { usePackagePurchaseHistory } from "@/features/packages/hooks/use-package-purchase-history";
import { HistoryCard, HistoryListRow } from "@/features/dashboard/components/history-card";

const NEUTRAL_BADGE = "border-white/15 bg-white/5 text-white/70";

export function PackagePurchaseHistory() {
  const { purchases, loading, error, retry } = usePackagePurchaseHistory();

  return (
    <HistoryCard
      title="Purchase history"
      loading={loading}
      error={error}
      retry={retry}
      items={purchases}
      emptyMessage="No package purchases yet."
      emptyIcon={PackageIcon}
      itemKey={(purchase, index) => `${purchase.depositId}-${index}`}
      renderItem={(purchase) => (
        <HistoryListRow
          title={purchase.packageName}
          subtitle={`Activated ${formatDate(purchase.activatedAt)}`}
          amount={purchase.price}
          direction="out"
          status="activated"
          statusClassName={NEUTRAL_BADGE}
        />
      )}
    />
  );
}
