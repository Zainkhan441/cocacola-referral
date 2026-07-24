import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  updateProfile,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";
import {
  updateFullName,
  setNotificationsEnabled,
  setThemePreference,
  setLanguagePreference,
  type UserDoc,
} from "@/lib/firestore/users";

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

// Keeps both the Firestore profile (fullName/fullNameLower, used for admin
// search and everywhere the app reads a user's own profile doc) and Firebase
// Auth's own displayName in sync — several existing submission flows
// (deposits, withdrawals, task/bonus claims) read `user.displayName` from
// the Auth SDK directly as the denormalized "userName" on their records, so
// letting the two drift apart would silently break those.
export async function updateProfileAction(uid: string, fullName: string): Promise<void> {
  const authInstance = requireAuth();
  const firestore = requireDb();
  if (!authInstance.currentUser) {
    throw new Error("You need to be signed in to update your profile.");
  }

  await updateFullName(firestore, uid, fullName);
  await updateProfile(authInstance.currentUser, { displayName: fullName });
}

export async function changePasswordAction(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const authInstance = requireAuth();
  const currentUser = authInstance.currentUser;
  if (!currentUser || !currentUser.email) {
    throw new Error("You need to be signed in to change your password.");
  }

  const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
  await reauthenticateWithCredential(currentUser, credential);
  await updatePassword(currentUser, newPassword);
}

export async function updateNotificationPreferenceAction(uid: string, enabled: boolean): Promise<void> {
  const firestore = requireDb();
  await setNotificationsEnabled(firestore, uid, enabled);
}

export async function updateThemePreferenceAction(
  uid: string,
  theme: UserDoc["themePreference"],
): Promise<void> {
  const firestore = requireDb();
  await setThemePreference(firestore, uid, theme);
}

export async function updateLanguagePreferenceAction(
  uid: string,
  language: UserDoc["languagePreference"],
): Promise<void> {
  const firestore = requireDb();
  await setLanguagePreference(firestore, uid, language);
}
