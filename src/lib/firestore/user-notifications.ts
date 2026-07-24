import {
  doc,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
  type Query,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";
import { typedCollection } from "@/lib/firestore/converter";

const USER_NOTIFICATIONS_PATH = "userNotifications";
export const USER_NOTIFICATIONS_PAGE_SIZE = 20;
export const NOTIFICATION_FEED_LIMIT = 20;
// Firestore write batches cap at 500 operations — chunk fan-out well under
// that so each batch commit stays comfortably inside limits.
export const NOTIFICATION_FANOUT_CHUNK_SIZE = 400;

// Either an admin broadcast ("announcement", fanned out to many recipients,
// doc id `${announcementId}_${uid}`) or a system-generated transactional
// notification about one specific event on the recipient's own account
// (deposit/withdrawal/task submission approved or rejected) — always
// exactly one recipient, auto-id, written inside the same atomic
// approve/reject transaction as the underlying status change, so it can
// never be delivered without the change it describes actually having
// happened (or vice versa). Unlike announcement broadcasts, system
// notifications are never gated by notificationsEnabled — they describe the
// user's own money/status, not marketing content, so a user can't silence
// finding out their withdrawal was approved.
export type NotificationKind =
  | "announcement"
  | "deposit"
  | "withdrawal"
  | "task_submission"
  | "admin_adjustment";

export type UserNotificationDoc = {
  uid: string;
  kind: NotificationKind;
  // The announcement doc id when kind is "announcement"; null for every
  // system-generated kind (there's no shared source document to point at —
  // the notification IS the record).
  announcementId: string | null;
  title: string;
  body: string;
  read: boolean;
  readAt: Timestamp | null;
  createdAt: Timestamp;
};

export function userNotificationsCollection(db: Firestore) {
  return typedCollection<UserNotificationDoc>(db, USER_NOTIFICATIONS_PATH);
}

export function userNotificationDocRef(db: Firestore, announcementId: string, uid: string) {
  return doc(userNotificationsCollection(db), `${announcementId}_${uid}`);
}

// Read/mark-read operate on the notification's own doc id (available from
// any query snapshot) rather than reconstructing it — the only scheme that
// works uniformly for both deterministic announcement ids and auto-id
// system notifications.
export function userNotificationDocRefById(db: Firestore, id: string) {
  return doc(userNotificationsCollection(db), id);
}

export function newSystemNotificationRef(db: Firestore) {
  return doc(userNotificationsCollection(db));
}

export function buildUserNotificationData(input: {
  uid: string;
  announcementId: string;
  title: string;
  body: string;
}) {
  return {
    uid: input.uid,
    kind: "announcement" as const,
    announcementId: input.announcementId,
    title: input.title,
    body: input.body,
    read: false,
    readAt: null,
    createdAt: serverTimestamp(),
  };
}

// Built inline (not via a shared builder) at each system-notification call
// site so callers pass `kind` explicitly — see deposit-actions.ts,
// withdrawal-actions.ts, task-actions.ts.
export function buildSystemNotificationData(input: {
  uid: string;
  kind: Exclude<NotificationKind, "announcement">;
  title: string;
  body: string;
}) {
  return {
    uid: input.uid,
    kind: input.kind,
    announcementId: null,
    title: input.title,
    body: input.body,
    read: false,
    readAt: null,
    createdAt: serverTimestamp(),
  };
}

// --- The recipient's own feed/history ---

// Requires a composite index (uid asc, createdAt desc) — see firestore.indexes.json.
export function myNotificationsFeedQuery(db: Firestore, uid: string): Query<UserNotificationDoc> {
  return query(
    userNotificationsCollection(db),
    where("uid", "==", uid),
    orderBy("createdAt", "desc"),
    limit(NOTIFICATION_FEED_LIMIT),
  );
}

export function myNotificationsPageQuery(
  db: Firestore,
  uid: string,
  cursor: QueryDocumentSnapshot<UserNotificationDoc> | null,
): Query<UserNotificationDoc> {
  return cursor
    ? query(
        userNotificationsCollection(db),
        where("uid", "==", uid),
        orderBy("createdAt", "desc"),
        startAfter(cursor),
        limit(USER_NOTIFICATIONS_PAGE_SIZE),
      )
    : query(
        userNotificationsCollection(db),
        where("uid", "==", uid),
        orderBy("createdAt", "desc"),
        limit(USER_NOTIFICATIONS_PAGE_SIZE),
      );
}

export async function markNotificationRead(db: Firestore, notificationId: string): Promise<void> {
  await updateDoc(userNotificationDocRefById(db, notificationId), {
    read: true,
    readAt: serverTimestamp(),
  });
}

// Marks a specific page of unread notifications read in one batch — used by
// "mark all as read" on the notifications feed the user currently has
// loaded. Firestore rules independently re-validate each individual update
// the same way markNotificationRead does.
export async function markNotificationsReadBatch(db: Firestore, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const batch = writeBatch(db);
  const refs = ids.map((id) => userNotificationDocRefById(db, id));
  for (const ref of refs) {
    batch.update(ref, { read: true, readAt: serverTimestamp() });
  }
  await batch.commit();
}
