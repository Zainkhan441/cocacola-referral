import { FirebaseError } from "firebase/app";

// Each code gets its own accurate, distinct message — never a single
// catch-all "Wrong password" for every failure. Firebase Auth's newer SDK
// versions return the unified "auth/invalid-credential" for both a wrong
// password AND a nonexistent email (to avoid leaking which one it was, for
// account-enumeration protection) — that one is intentionally phrased to
// cover both cases; "auth/wrong-password"/"auth/user-not-found" are kept
// here too for older SDK/backend responses that still return them distinctly.
const MESSAGES: Record<string, string> = {
  "auth/email-already-in-use":
    "This email is already registered. Try logging in instead.",
  "auth/invalid-email": "That email address doesn’t look right.",
  "auth/weak-password":
    "Please choose a stronger password (at least 8 characters).",
  "auth/user-not-found": "We couldn’t find an account with that email.",
  "auth/wrong-password": "Incorrect password. Please try again.",
  "auth/invalid-credential": "Incorrect email or password. Please try again.",
  "auth/user-disabled": "This account has been disabled. Please contact support.",
  "auth/missing-password": "Password is required.",
  "auth/too-many-requests":
    "Too many attempts. Please wait a moment and try again.",
  "auth/network-request-failed":
    "Network error. Check your connection and try again.",
  "auth/invalid-action-code":
    "This link has expired or has already been used. Please request a new one.",
  "auth/expired-action-code":
    "This link has expired. Please request a new one.",
};

export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    // The user-facing text above is deliberately generic/friendly for
    // security codes like invalid-credential — the real code is logged here
    // so it's still visible while developing/debugging, never hidden.
    if (process.env.NODE_ENV !== "production") {
      console.error(`[auth] ${error.code}:`, error.message);
    }
    return MESSAGES[error.code] ?? "Something went wrong. Please try again.";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Something went wrong. Please try again.";
}
