import { FirebaseError } from "firebase/app";

const MESSAGES: Record<string, string> = {
  "auth/email-already-in-use":
    "This email is already registered. Try logging in instead.",
  "auth/invalid-email": "That email address doesn’t look right.",
  "auth/weak-password":
    "Please choose a stronger password (at least 8 characters).",
  "auth/user-not-found": "We couldn’t find an account with that email.",
  "auth/wrong-password": "Incorrect password. Please try again.",
  "auth/invalid-credential": "Incorrect email or password.",
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
    return MESSAGES[error.code] ?? "Something went wrong. Please try again.";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Something went wrong. Please try again.";
}
