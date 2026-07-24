import {
  addDoc,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  type Firestore,
  type Query,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";
import { typedCollection } from "@/lib/firestore/converter";

const ACTIVITY_LOGS_PATH = "activityLogs";
export const ACTIVITY_LOGS_PAGE_SIZE = 25;

export type ActivityTargetType =
  | "deposit"
  | "withdrawal"
  | "package"
  | "user"
  | "settings"
  | "referralLevelSettings"
  | "system"
  | "task"
  | "taskSubmission"
  | "bonusTier"
  | "bonusClaim"
  | "notification"
  | "cmsPage"
  | "cmsSection"
  | "cmsAnnouncement"
  | "cmsFaq"
  | "cmsGuideStep"
  | "cmsRule"
  | "cmsLink"
  | "cmsMedia";

// Append-only audit trail of every mutating admin action. Written by the
// same client-side transaction that performs the action itself — never
// editable or deletable afterward (see firestore.rules).
export type ActivityLogDoc = {
  actorUid: string;
  actorName: string;
  action: string;
  targetType: ActivityTargetType;
  targetId: string;
  details: string;
  createdAt: Timestamp;
};

export function activityLogsCollection(db: Firestore) {
  return typedCollection<ActivityLogDoc>(db, ACTIVITY_LOGS_PATH);
}

// Requires a single-field index on createdAt (automatic).
export function activityLogsPageQuery(
  db: Firestore,
  cursor: QueryDocumentSnapshot<ActivityLogDoc> | null,
): Query<ActivityLogDoc> {
  return cursor
    ? query(
        activityLogsCollection(db),
        orderBy("createdAt", "desc"),
        startAfter(cursor),
        limit(ACTIVITY_LOGS_PAGE_SIZE),
      )
    : query(activityLogsCollection(db), orderBy("createdAt", "desc"), limit(ACTIVITY_LOGS_PAGE_SIZE));
}

type LogActivityInput = {
  actorUid: string;
  actorName: string;
  action: string;
  targetType: ActivityTargetType;
  targetId: string;
  details: string;
};

export async function logActivity(db: Firestore, input: LogActivityInput): Promise<void> {
  await addDoc(activityLogsCollection(db), {
    ...input,
    createdAt: serverTimestamp(),
  });
}
