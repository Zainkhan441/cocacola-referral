import { db } from "@/lib/firebase/client";
import {
  markNotificationRead,
  markNotificationsReadBatch,
  userNotificationDocRef,
} from "@/lib/firestore/user-notifications";

function requireDb() {
  if (!db) {
    throw new Error(
      "Firebase is not configured yet. Add your Firebase credentials to .env.local.",
    );
  }
  return db;
}

export async function markOneNotificationRead(uid: string, announcementId: string): Promise<void> {
  const firestore = requireDb();
  await markNotificationRead(firestore, announcementId, uid);
}

// Marks every currently-unread notification in the given (already-loaded)
// set as read, in one batch — used by "Mark all as read" on the bell
// dropdown and the notifications page.
export async function markAllNotificationsRead(
  uid: string,
  unread: Array<{ announcementId: string; read: boolean }>,
): Promise<void> {
  const firestore = requireDb();
  const refs = unread
    .filter((notification) => !notification.read)
    .map((notification) => userNotificationDocRef(firestore, notification.announcementId, uid));
  await markNotificationsReadBatch(firestore, refs);
}
