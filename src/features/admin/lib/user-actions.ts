import { writeBatch, serverTimestamp } from "firebase/firestore";
import { auth } from "@/lib/firebase/client";
import { userDocRef, setUserPackage, type AccountStatus } from "@/lib/firestore/users";
import { newSystemNotificationRef, buildSystemNotificationData } from "@/lib/firestore/user-notifications";
import { logActivity } from "@/lib/firestore/activity-logs";
import { requireDb, type Reviewer } from "@/features/admin/lib/require-db";

const STATUS_NOTIFICATION_COPY: Record<AccountStatus, { title: string; body: string }> = {
  active: {
    title: "Account restored",
    body: "Your account is active again. You can sign in and use the app as normal.",
  },
  suspended: {
    title: "Account suspended",
    body: "Your account has been suspended by an administrator. Please contact support for details.",
  },
  archived: {
    title: "Account archived",
    body: "Your account has been archived by an administrator. Your data is preserved, but you can't use the app while archived.",
  },
  banned: {
    title: "Account banned",
    body: "Your account has been banned by an administrator. Please contact support for details.",
  },
};

// Suspend/Unsuspend/Archive/Restore are all the same underlying write — a
// single accountStatus transition — distinguished only by which value the
// admin UI passes in. Every transition notifies the affected user (mirrors
// every other admin decision in this app — deposits, withdrawals, task
// reviews all notify) and both the status write and the notification land
// in one atomic batch, so a user can never see one without the other.
export async function setAccountStatusAction(
  uid: string,
  userName: string,
  status: AccountStatus,
  reviewer: Reviewer,
): Promise<void> {
  const db = requireDb();
  const notificationRef = newSystemNotificationRef(db);
  const copy = STATUS_NOTIFICATION_COPY[status];

  const batch = writeBatch(db);
  batch.update(userDocRef(db, uid), { accountStatus: status, updatedAt: serverTimestamp() });
  batch.set(
    notificationRef,
    buildSystemNotificationData({ uid, kind: "account_status", title: copy.title, body: copy.body }),
  );
  await batch.commit();

  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: `user.status_${status}`,
    targetType: "user",
    targetId: uid,
    details: `Set ${userName}'s account status to "${status}"`,
  });
}

export async function setUserPackageAction(
  uid: string,
  userName: string,
  packageId: string | null,
  packageName: string | null,
  reviewer: Reviewer,
): Promise<void> {
  const db = requireDb();
  await setUserPackage(db, uid, packageId);

  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "user.package_changed",
    targetType: "user",
    targetId: uid,
    details: `Changed ${userName}'s package to "${packageName ?? "none"}"`,
  });
}

// Permanent delete goes through a server Route Handler backed by the
// Firebase Admin SDK — the client SDK can never delete another user's
// Firebase Auth account or their users/{uid} Firestore document (rules
// deny that outright, see firestore.rules users/{uid} allow delete: if
// false), so this is the only path capable of doing either. The route
// re-verifies the caller is really an admin from a fresh ID token — it
// never trusts anything this function sends about WHO is calling, only
// WHICH uid to delete. The route itself writes the activityLogs entry
// (via the Admin SDK), so this function does not log again.
export async function deleteUserPermanentlyAction(uid: string): Promise<void> {
  if (!auth?.currentUser) {
    throw new Error("Not signed in.");
  }
  const idToken = await auth.currentUser.getIdToken();

  const response = await fetch(`/api/admin/users/${uid}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${idToken}` },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? "Couldn’t permanently delete this account.");
  }
}
