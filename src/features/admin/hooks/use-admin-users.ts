"use client";

import { useEffect, useState } from "react";
import { getDocs, type QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  searchUsersByEmailQuery,
  searchUsersByNameQuery,
  searchUsersByReferralCodeQuery,
  usersPageQuery,
  USERS_PAGE_SIZE,
  type UserDoc,
} from "@/lib/firestore/users";
import { useResetOnKeyChange } from "@/features/user/hooks/use-reset-on-key-change";

const REFERRAL_CODE_PATTERN = /^[A-Z0-9]{8}$/i;

type UseAdminUsersResult = {
  users: UserDoc[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  isSearching: boolean;
  loadMore: () => void;
  retry: () => void;
};

// Search is exact-match on email/referral code, or a prefix match on name —
// Firestore has no full-text search. Search results are a single page (no
// "load more"); the default unfiltered list paginates normally.
export function useAdminUsers(searchTerm: string): UseAdminUsersResult {
  const canFetch = Boolean(db);
  const trimmed = searchTerm.trim();
  const isSearching = trimmed.length > 0;

  const [users, setUsers] = useState<UserDoc[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<UserDoc> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(canFetch);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const fetchKey = canFetch ? `${trimmed}:${attempt}` : null;
  useResetOnKeyChange(fetchKey, () => {
    setLoading(Boolean(fetchKey));
    setError(null);
    setUsers([]);
    setCursor(null);
    setHasMore(true);
  });

  useEffect(() => {
    if (!canFetch || !db) return;
    const firestore = db;

    let cancelled = false;

    async function run() {
      if (trimmed.length === 0) {
        const snapshot = await getDocs(usersPageQuery(firestore, null));
        if (cancelled) return;
        setUsers(snapshot.docs.map((doc) => doc.data()));
        setCursor(snapshot.docs.at(-1) ?? null);
        setHasMore(snapshot.docs.length === USERS_PAGE_SIZE);
        return;
      }

      const searchQuery = trimmed.includes("@")
        ? searchUsersByEmailQuery(firestore, trimmed)
        : REFERRAL_CODE_PATTERN.test(trimmed)
          ? searchUsersByReferralCodeQuery(firestore, trimmed)
          : searchUsersByNameQuery(firestore, trimmed);

      const snapshot = await getDocs(searchQuery);
      if (cancelled) return;
      setUsers(snapshot.docs.map((doc) => doc.data()));
      setCursor(null);
      setHasMore(false);
    }

    run()
      .then(() => {
        if (!cancelled) setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("We couldn’t load users. Please try again.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canFetch, trimmed, attempt]);

  async function loadMore() {
    if (!db || !cursor || loadingMore || isSearching) return;
    setLoadingMore(true);
    try {
      const snapshot = await getDocs(usersPageQuery(db, cursor));
      setUsers((prev) => [...prev, ...snapshot.docs.map((doc) => doc.data())]);
      setCursor(snapshot.docs.at(-1) ?? cursor);
      setHasMore(snapshot.docs.length === USERS_PAGE_SIZE);
    } catch {
      setError("We couldn’t load more users. Please try again.");
    } finally {
      setLoadingMore(false);
    }
  }

  const retry = () => setAttempt((count) => count + 1);

  return {
    users,
    loading: canFetch ? loading : false,
    loadingMore,
    error,
    hasMore,
    isSearching,
    loadMore,
    retry,
  };
}
