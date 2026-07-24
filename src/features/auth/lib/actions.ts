import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type ActionCodeSettings,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";
import { markUserEmailVerified } from "@/lib/firestore/users";
import { resolveReferrerByCode } from "@/lib/firestore/referral-codes";
import { ensureUserProfile } from "@/features/auth/lib/profile-setup";
import { siteConfig } from "@/config/site";

// Without this, Firebase sends its own hosted handler
// (https://<project>.firebaseapp.com/__/auth/action) with no way back into
// the app. handleCodeInApp: true instead sends the link straight to our own
// /verify-email route with ?mode=verifyEmail&oobCode=...&apiKey=... appended,
// which that page applies itself via applyActionCode(). siteConfig.url
// already resolves to http://localhost:3000 in local dev and the real
// deployed origin in production, so no extra branching is needed here —
// only the target production domain must be added to Firebase Console >
// Authentication > Settings > Authorized domains (localhost is authorized
// by every project by default).
const verifyEmailActionCodeSettings: ActionCodeSettings = {
  url: `${siteConfig.url}/verify-email`,
  handleCodeInApp: true,
};

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
  password: string,
  referralCode?: string | null,
) {
  const authInstance = requireAuth();
  const firestore = requireDb();

  const credential = await createUserWithEmailAndPassword(
    authInstance,
    email,
    password,
  );
  await updateProfile(credential.user, { displayName: name });

  const referrerInfo = referralCode
    ? await resolveReferrerByCode(firestore, referralCode)
    : null;

  // Profile creation must succeed before we consider signup successful — if
  // it throws, this function throws too, and the caller sees a real error
  // instead of a false "signup worked" impression. This is deliberately
  // ordered before sendEmailVerification below (previously it was after,
  // which is the root cause of a real bug: a network hiccup or transient
  // Firestore error here used to leave a fully verified Auth account with
  // no Firestore profile at all, since the verification email had already
  // been sent by that point).
  await ensureUserProfile(firestore, {
    uid: credential.user.uid,
    fullName: name,
    email,
    referredBy: referrerInfo?.uid ?? null,
    referrerAncestorChain: referrerInfo?.ancestorChain ?? [],
    emailVerified: credential.user.emailVerified,
  });

  try {
    await sendEmailVerification(credential.user, verifyEmailActionCodeSettings);
  } catch {
    // Non-fatal: the account and profile are already fully created at this
    // point, and /verify-email always offers a "Resend" button.
  }

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
    referredBy: null,
    referrerAncestorChain: [],
    emailVerified: currentUser.emailVerified,
  });
}

export async function loginWithEmail(email: string, password: string) {
  const authInstance = requireAuth();
  const credential = await signInWithEmailAndPassword(
    authInstance,
    email,
    password,
  );
  return credential.user;
}

export async function requestPasswordReset(email: string) {
  const authInstance = requireAuth();
  await sendPasswordResetEmail(authInstance, email);
}

export async function resendVerificationEmail() {
  const authInstance = requireAuth();
  if (!authInstance.currentUser) {
    throw new Error("No signed-in user to verify.");
  }
  await sendEmailVerification(authInstance.currentUser, verifyEmailActionCodeSettings);
}

// Reloads the current Firebase Auth user and, if verification completed,
// syncs the one-time-write Firestore copy of emailVerified so it doesn't
// stay permanently stale — the Auth SDK's own state remains the source of
// truth used for actual access gating.
export async function checkEmailVerified(): Promise<boolean> {
  const authInstance = requireAuth();
  const firestore = requireDb();
  const currentUser = authInstance.currentUser;
  if (!currentUser) {
    throw new Error("No signed-in user to verify.");
  }

  await currentUser.reload();
  if (currentUser.emailVerified) {
    // Best-effort sync only — if the Firestore profile doesn't exist yet
    // (the missing-profile case this same investigation fixed), this write
    // would fail, but that must never block the caller from knowing the
    // email itself really is verified.
    await markUserEmailVerified(firestore, currentUser.uid).catch(() => {});
    return true;
  }
  return false;
}

export async function logout() {
  const authInstance = requireAuth();
  await signOut(authInstance);
}
