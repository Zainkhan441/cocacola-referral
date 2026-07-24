"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase/client";
import { getPackageDocument, type PackageDoc } from "@/lib/firestore/packages";
import { useResetOnKeyChange } from "@/features/user/hooks/use-reset-on-key-change";

type UsePackageLimitsResult = {
  packageInfo: PackageDoc | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
};

// packageId is null for every user until the package-purchase milestone
// ships — in that case this resolves immediately with packageInfo: null,
// which callers should treat as "no withdrawal limit available yet", not 0.
export function usePackageLimits(packageId: string | null): UsePackageLimitsResult {
  const canFetch = Boolean(db && packageId);

  const [packageInfo, setPackageInfo] = useState<PackageDoc | null>(null);
  const [loading, setLoading] = useState(canFetch);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const fetchKey = canFetch ? `${packageId}:${attempt}` : null;
  useResetOnKeyChange(fetchKey, () => {
    setLoading(Boolean(fetchKey));
    setError(null);
  });

  useEffect(() => {
    if (!canFetch || !db || !packageId) return;

    let cancelled = false;

    getPackageDocument(db, packageId)
      .then((result) => {
        if (cancelled) return;
        setPackageInfo(result);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("We couldn’t load your package limits. Please try again.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canFetch, packageId, attempt]);

  const retry = () => setAttempt((count) => count + 1);

  return { packageInfo, loading: canFetch ? loading : false, error, retry };
}
