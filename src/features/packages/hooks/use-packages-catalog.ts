"use client";

import { useEffect, useState } from "react";
import { onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { packagesCollection, allPackagesQuery, type PackageDoc } from "@/lib/firestore/packages";

type UsePackagesCatalogResult = {
  packages: PackageDoc[];
  loading: boolean;
  error: string | null;
  retry: () => void;
};

// filter "active": only packages users can currently purchase.
// filter "all": every package regardless of status — reuses the exact same
// allPackagesQuery the admin package list already uses, so the public
// packages page and the admin panel never diverge on how "all packages" is
// defined.
export function usePackagesCatalog(filter: "active" | "all"): UsePackagesCatalogResult {
  const canFetch = Boolean(db);

  const [packages, setPackages] = useState<PackageDoc[]>([]);
  const [loading, setLoading] = useState(canFetch);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!canFetch || !db) return;

    const firestoreQuery =
      filter === "active" ? query(packagesCollection(db), where("isActive", "==", true)) : allPackagesQuery(db);

    const unsubscribe = onSnapshot(
      firestoreQuery,
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
  }, [canFetch, filter, attempt]);

  const retry = () => setAttempt((count) => count + 1);

  return { packages, loading: canFetch ? loading : false, error, retry };
}
