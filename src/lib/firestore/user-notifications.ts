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

// One document per (announcement, recipient) pair, doc id
// `${announcementId}_${uid}` — deterministic so re-running a fan-out (e.g.
// after a partial failure) can never deliver the same broadcast twice to the
// same user. Denormalizes title/body so the recipient's feed never needs a
// second read of the source announcement. Written only by the admin send
// action (features/admin/lib/notification-actions.ts); read/read-state
// updates are the recipient's own.
export type UserNotificationDoc = {
  uid: string;
  announcementId: string;
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

export function buildUserNotificationData(input: {
  uid: string;
  announcementId: string;
  title: string;
  body: string;
}) {
  return {
    uid: input.uid,
    announcementId: input.announcementId,
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

export async function markNotificationRead(
  db: Firestore,
  announcementId: string,
  uid: string,
): Promise<void> {
  await updateDoc(userNotificationDocRef(db, announcementId, uid), {
    read: true,
    readAt: serverTimestamp(),
  });
}

// Marks a specific page of unread notifications read in one batch — used by
// "mark all as read" on the notifications feed the user currently has
// loaded. Firestore rules independently re-validate each individual update
// the same way markNotificationRead does.
export async function markNotificationsReadBatch(
  db: Firestore,
  refs: ReturnType<typeof userNotificationDocRef>[],
): Promise<void> {
  if (refs.length === 0) return;
  const batch = writeBatch(db);
  for (const ref of refs) {
    batch.update(ref, { read: true, readAt: serverTimestamp() });
  }
  await batch.commit();
}
