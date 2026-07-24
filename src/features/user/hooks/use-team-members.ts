"use client";

import { useEffect, useState } from "react";
import { getDocs, type QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  teamMembersPageQuery,
  TEAM_MEMBERS_PAGE_SIZE,
  type TeamMemberDoc,
  type TeamLevelFilter,
} from "@/lib/firestore/team-members";
import { useAuth } from "@/features/auth/context/auth-provider";
import { useResetOnKeyChange } from "@/features/user/hooks/use-reset-on-key-change";

export type TeamMemberWithId = TeamMemberDoc & { id: string };

type UseTeamMembersResult = {
  members: TeamMemberWithId[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  retry: () => void;
};

export function useTeamMembers(levelFilter: TeamLevelFilter): UseTeamMembersResult {
  const { user, configured } = useAuth();
  const uid = user?.uid;
  const canFetch = Boolean(configured && db && uid);

  const [members, setMembers] = useState<TeamMemberWithId[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<TeamMemberDoc> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(canFetch);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const fetchKey = canFetch ? `${uid}:${levelFilter}:${attempt}` : null;
  useResetOnKeyChange(fetchKey, () => {
    setLoading(Boolean(fetchKey));
    setError(null);
    setMembers([]);
    setCursor(null);
    setHasMore(true);
  });

  useEffect(() => {
    if (!canFetch || !db || !uid) return;
    const firestore = db;

    let cancelled = false;
    getDocs(teamMembersPageQuery(firestore, uid, levelFilter, null))
      .then((snapshot) => {
        if (cancelled) return;
        setMembers(snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
        setCursor(snapshot.docs.at(-1) ?? null);
        setHasMore(snapshot.docs.length === TEAM_MEMBERS_PAGE_SIZE);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("We couldn’t load your team. Please try again.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canFetch, uid, levelFilter, attempt]);

  async function loadMore() {
    if (!db || !uid || !cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const snapshot = await getDocs(teamMembersPageQuery(db, uid, levelFilter, cursor));
      setMembers((prev) => [...prev, ...snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }))]);
      setCursor(snapshot.docs.at(-1) ?? cursor);
      setHasMore(snapshot.docs.length === TEAM_MEMBERS_PAGE_SIZE);
    } catch {
      setError("We couldn’t load more team members. Please try again.");
    } finally {
      setLoadingMore(false);
    }
  }

  const retry = () => setAttempt((count) => count + 1);

  return {
    members,
    loading: canFetch ? loading : false,
    loadingMore,
    error,
    hasMore,
    loadMore,
    retry,
  };
}
