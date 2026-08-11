"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { userDocRef, type UserDoc } from "@/lib/firestore/users";
import { useAuth } from "@/features/auth/context/auth-provider";
import { useResetOnKeyChange } from "@/features/user/hooks/use-reset-on-key-change";

type UserProfileContextValue = {
  profile: UserDoc | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
};

const UserProfileContext = createContext<UserProfileContextValue | null>(null);

// The ONE onSnapshot subscription on users/{uid} for the entire app,
// mounted once in the root layout. Every page and AppHeader previously
// called useUserProfile() as a plain hook that opened its own independent
// listener on this exact document — since AppHeader renders on nearly
// every signed-in page (and most of those pages also call useUserProfile()
// themselves for their own gating), a typical page load was running two
// live listeners against identical data. useUserProfile() below now just
// reads from this shared subscription; its return shape is byte-identical
// to before, so no call site needed to change. Logic (loading/error/retry
// semantics, including the deliberate choice to NOT clear a stale profile
// value when uid changes) is unchanged from the original per-call-site hook.
export function UserProfileProvider({ children }: { children: ReactNode }) {
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

  return (
    <UserProfileContext.Provider value={{ profile, loading: canFetch ? loading : false, error, retry }}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile(): UserProfileContextValue {
  const ctx = useContext(UserProfileContext);
  if (!ctx) {
    throw new Error("useUserProfile must be used within a UserProfileProvider");
  }
  return ctx;
}
