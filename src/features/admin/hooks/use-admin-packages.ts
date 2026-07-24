"use client";

import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { allPackagesQuery, type PackageDoc } from "@/lib/firestore/packages";

type UseAdminPackagesResult = {
  packages: PackageDoc[];
  loading: boolean;
  error: string | null;
  retry: () => void;
};

export function useAdminPackages(): UseAdminPackagesResult {
  const canFetch = Boolean(db);

  const [packages, setPackages] = useState<PackageDoc[]>([]);
  const [loading, setLoading] = useState(canFetch);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!canFetch || !db) return;

    const unsubscribe = onSnapshot(
      allPackagesQuery(db),
      (snapshot) => {
        setPackages(snapshot.docs.map((doc) => doc.data()));
        setError(null);
        setLoading(false);
      },
      () => {
        setError("We couldn’t load packages. Please try again.");
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [canFetch, attempt]);

  const retry = () => setAttempt((count) => count + 1);

  return { packages, loading: canFetch ? loading : false, error, retry };
}
