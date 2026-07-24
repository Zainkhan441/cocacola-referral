import {
  doc,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  type Firestore,
  type Query,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";
import { typedCollection } from "@/lib/firestore/converter";

const ANNOUNCEMENTS_PATH = "announcements";
export const ANNOUNCEMENTS_PAGE_SIZE = 20;

export type NotificationAudienceType = "all" | "active_package" | "selected";

// The admin-authored notification broadcast itself — one document per "send"
// action. Fan-out to individual recipients happens separately (see
// user-notifications.ts); this document is the source content plus an audit
// record of who it was sent to and how many actually received it.
export type AnnouncementDoc = {
  title: string;
  body: string;
  // Soft hide only — an admin can retract a mistaken broadcast from the
  // admin history view; already-delivered userNotifications are unaffected
  // (a sent notification was real and stays in the recipient's history).
  isActive: boolean;
  audienceType: NotificationAudienceType;
  // Only meaningful when audienceType === "selected".
  selectedUids: string[];
  // How many userNotifications fan-out docs were actually created — an
  // honest count of real delivery, not an estimate (e.g. "active_package"
  // may resolve to fewer users than total signups).
  recipientCount: number;
  createdBy: string;
  createdByName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export function announcementsCollection(db: Firestore) {
  return typedCollection<AnnouncementDoc>(db, ANNOUNCEMENTS_PATH);
}

export function announcementDocRef(db: Firestore, id: string) {
  return doc(announcementsCollection(db), id);
}

export function newAnnouncementRef(db: Firestore) {
  return doc(announcementsCollection(db));
}

// Requires a single-field index on createdAt (automatic).
export function announcementsPageQuery(
  db: Firestore,
  cursor: QueryDocumentSnapshot<AnnouncementDoc> | null,
): Query<AnnouncementDoc> {
  return cursor
    ? query(
        announcementsCollection(db),
        orderBy("createdAt", "desc"),
        startAfter(cursor),
        limit(ANNOUNCEMENTS_PAGE_SIZE),
      )
    : query(announcementsCollection(db), orderBy("createdAt", "desc"), limit(ANNOUNCEMENTS_PAGE_SIZE));
}

export type CreateAnnouncementInput = {
  title: string;
  body: string;
  audienceType: NotificationAudienceType;
  selectedUids: string[];
  createdBy: string;
  createdByName: string;
};

// Exported so the send-notification action can build the exact same shape
// while also computing recipientCount from the real fan-out it performs.
export function buildAnnouncementData(input: CreateAnnouncementInput, recipientCount: number) {
  return {
    title: input.title,
    body: input.body,
    isActive: true,
    audienceType: input.audienceType,
    selectedUids: input.selectedUids,
    recipientCount,
    createdBy: input.createdBy,
    createdByName: input.createdByName,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

export async function setAnnouncementActive(
  db: Firestore,
  id: string,
  isActive: boolean,
): Promise<void> {
  await setDoc(
    announcementDocRef(db, id),
    { isActive, updatedAt: serverTimestamp() },
    { merge: true },
  );
}
