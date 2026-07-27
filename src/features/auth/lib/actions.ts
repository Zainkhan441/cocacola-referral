import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { resolveReferrerByCode } from "@/lib/firestore/referral-codes";
import { ensureUserProfile } from "@/features/auth/lib/profile-setup";
import { userDocRef } from "@/lib/firestore/users";

// Email is trimmed and lowercased before ever reaching Firebase, on both
// signup and login — the exact same normalization both times, so a user who
// types (or an autofill that inserts) different casing or stray whitespace
// between the two can never end up with a "wrong password" that's actually
// a mismatched identifier. Password is passed through completely untouched
// on every path below — never trimmed, transformed, or logged — a leading/
// trailing space in a password is a real character Firebase must see
// exactly as typed.
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function requireAuth() {
  if (!auth) {
    throw new Error(
      "Firebase is not configured yet. Add your Firebase credentials to .env.local.",
    );
  }
  return auth;
}

function requireDb() {
  if (!db) {
    throw new Error(
      "Firebase is not configured yet. Add your Firebase credentials to .env.local.",
    );
  }
  return db;
}

export async function registerWithEmail(
  name: string,
  email: string,
  mobileNumber: string,
  password: string,
  referralCode?: string | null,
) {
  const authInstance = requireAuth();
  const firestore = requireDb();
  const normalizedEmail = normalizeEmail(email);

  // createUserWithEmailAndPassword signs the new user in immediately — no
  // separate "log in after signup" step is needed.
  const credential = await createUserWithEmailAndPassword(
    authInstance,
    normalizedEmail,
    password,
  );
  await updateProfile(credential.user, { displayName: name });

  const referrerInfo = referralCode
    ? await resolveReferrerByCode(firestore, referralCode)
    : null;

  // Profile creation must succeed before we consider signup successful — if
  // it throws, this function throws too, and the caller sees a real error
  // instead of a false "signup worked" impression.
  await ensureUserProfile(firestore, {
    uid: credential.user.uid,
    fullName: name,
    email: normalizedEmail,
    mobileNumber,
    referredBy: referrerInfo?.uid ?? null,
    referrerAncestorChain: referrerInfo?.ancestorChain ?? [],
  });

  return credential.user;
}

// Recovers an Auth account whose Firestore profile is missing or
// incomplete (e.g. signup was interrupted between account creation and
// profile creation before this was fixed to be atomic). Safe to call any
// number of times — ensureUserProfile only ever creates documents that
// don't already exist, never overwriting real profile or wallet data.
export async function recoverMissingProfile(): Promise<void> {
  const authInstance = requireAuth();
  const firestore = requireDb();
  const currentUser = authInstance.currentUser;
  if (!currentUser) {
    throw new Error("You need to be signed in to recover your profile.");
  }
  if (!currentUser.email) {
    throw new Error("Your account has no email on file. Please contact support.");
  }

  await ensureUserProfile(firestore, {
    uid: currentUser.uid,
    fullName: currentUser.displayName ?? currentUser.email,
    email: currentUser.email,
    mobileNumber: "",
    referredBy: null,
    referrerAncestorChain: [],
  });
}

export type LoginResult = {
  uid: string;
  isAdmin: boolean;
};

export async function loginWithEmail(email: string, password: string): Promise<LoginResult> {
  const authInstance = requireAuth();
  const firestore = requireDb();
  const credential = await signInWithEmailAndPassword(
    authInstance,
    normalizeEmail(email),
    password,
  );

  // Best-effort role lookup purely to decide the post-login destination
  // (admins land on /admin, never /packages, since an admin account never
  // owns a package — see useAppAccessGate). This is never the security
  // boundary: every actual admin read/write is independently re-checked by
  // firestore.rules against this same role field server-side.
  const profileSnap = await getDoc(userDocRef(firestore, credential.user.uid)).catch(() => null);
  const isAdmin = profileSnap?.exists() ? profileSnap.data().role === "admin" : false;

  return { uid: credential.user.uid, isAdmin };
}

export async function requestPasswordReset(email: string) {
  const authInstance = requireAuth();
  await sendPasswordResetEmail(authInstance, normalizeEmail(email));
}

export async function logout() {
  const authInstance = requireAuth();
  await signOut(authInstance);
}
