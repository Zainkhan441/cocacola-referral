import { db } from "@/lib/firebase/client";
import { markNotificationRead, markNotificationsReadBatch } from "@/lib/firestore/user-notifications";

function requireDb() {
  if (!db) {
    throw new Error(
      "Firebase is not configured yet. Add your Firebase credentials to .env.local.",
    );
  }
  return db;
}

export async function markOneNotificationRead(notificationId: string): Promise<void> {
  const firestore = requireDb();
  await markNotificationRead(firestore, notificationId);
}

// Marks every currently-unread notification in the given (already-loaded)
// set as read, in one batch — used by "Mark all as read" on the bell
// dropdown and the notifications page.
export async function markAllNotificationsRead(
  unread: Array<{ id: string; read: boolean }>,
): Promise<void> {
  const firestore = requireDb();
  const ids = unread.filter((notification) => !notification.read).map((notification) => notification.id);
  await markNotificationsReadBatch(firestore, ids);
}
