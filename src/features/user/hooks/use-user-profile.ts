"use client";

import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { userDocRef, type UserDoc } from "@/lib/firestore/users";
import { useAuth } from "@/features/auth/context/auth-provider";
import { useResetOnKeyChange } from "@/features/user/hooks/use-reset-on-key-change";

type UseUserProfileResult = {
  profile: UserDoc | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
};

export function useUserProfile(): UseUserProfileResult {
  const { user, configured } = useAuth();
  const uid = user?.uid;
  const canFetch = Boolean(configured && db && uid);

  const [profile, setProfile] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(canFetch);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const fetchKey = canFetch ? `${uid}:${attempt}` : null;
  useResetOnKeyChange(fetchKey, () => {
    setLoading(Boolean(fetchKey));
    setError(null);
  });

  useEffect(() => {
    if (!canFetch || !db || !uid) return;

    const unsubscribe = onSnapshot(
      userDocRef(db, uid),
      (snapshot) => {
        setProfile(snapshot.exists() ? snapshot.data() : null);
        setError(null);
        setLoading(false);
      },
      () => {
        setError("We couldn’t load your profile. Please try again.");
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [canFetch, uid, attempt]);

  const retry = () => setAttempt((count) => count + 1);

  return { profile, loading: canFetch ? loading : false, error, retry };
}
