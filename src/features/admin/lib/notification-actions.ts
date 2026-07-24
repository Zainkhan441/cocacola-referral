import {
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
  type Firestore,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { usersPageQuery, USERS_PAGE_SIZE, userDocRef, type UserDoc } from "@/lib/firestore/users";
import {
  newAnnouncementRef,
  buildAnnouncementData,
  setAnnouncementActive,
  type NotificationAudienceType,
} from "@/lib/firestore/announcements";
import {
  userNotificationDocRef,
  buildUserNotificationData,
  NOTIFICATION_FANOUT_CHUNK_SIZE,
} from "@/lib/firestore/user-notifications";
import { logActivity } from "@/lib/firestore/activity-logs";
import { requireDb, type Reviewer } from "@/features/admin/lib/require-db";

type SendNotificationInput = {
  title: string;
  body: string;
  audienceType: NotificationAudienceType;
  selectedUids: string[];
};

// Resolves the real recipient list at send time — never trusted as a count
// estimate. "all"/"active_package" page through the full users collection
// (mirrors the Milestone 11 team-backfill scan, the established pattern for
// admin actions that need to touch every user); "selected" validates each
// chosen uid still exists. A user with notificationsEnabled: false is
// skipped entirely here — they never get a delivery doc, not just a hidden
// one, so the Settings preference is genuinely functional.
async function resolveRecipientUids(
  db: Firestore,
  input: SendNotificationInput,
): Promise<string[]> {
  if (input.audienceType === "selected") {
    const checks = await Promise.all(
      input.selectedUids.map(async (uid) => {
        const snap = await getDoc(userDocRef(db, uid));
        return snap.exists() && snap.data().notificationsEnabled ? uid : null;
      }),
    );
    return checks.filter((uid): uid is string => uid !== null);
  }

  const now = Date.now();
  const recipients: string[] = [];
  let cursor: QueryDocumentSnapshot<UserDoc> | null = null;

  while (true) {
    const pageQuery = usersPageQuery(db, cursor);
    const snapshot = await getDocs(pageQuery);
    if (snapshot.empty) break;

    for (const docSnap of snapshot.docs) {
      const user = docSnap.data();
      if (!user.notificationsEnabled) continue;
      if (input.audienceType === "active_package") {
        const qualifies =
          user.package != null && user.packageExpiresAt != null && user.packageExpiresAt.toMillis() > now;
        if (!qualifies) continue;
      }
      recipients.push(user.uid);
    }

    cursor = snapshot.docs.at(-1) ?? null;
    if (snapshot.docs.length < USERS_PAGE_SIZE) break;
  }

  return recipients;
}

// Sends a notification broadcast: creates the announcement (source content),
// then fans out one userNotifications delivery doc per real recipient,
// chunked into batches under Firestore's 500-write limit. The announcement
// must exist before any fan-out write, since each userNotifications create
// rule requires it — so this is deliberately sequential (announcement
// first, then batches), not a single giant transaction (Firestore
// transactions cap at 500 writes total anyway, which a large "all users"
// send could easily exceed).
export async function sendNotificationAction(
  input: SendNotificationInput,
  reviewer: Reviewer,
): Promise<number> {
  const db = requireDb();
  const recipientUids = await resolveRecipientUids(db, input);

  const announcementRef = newAnnouncementRef(db);
  await setDoc(
    announcementRef,
    buildAnnouncementData(
      {
        title: input.title,
        body: input.body,
        audienceType: input.audienceType,
        selectedUids: input.audienceType === "selected" ? input.selectedUids : [],
        createdBy: reviewer.adminUid,
        createdByName: reviewer.adminName,
      },
      recipientUids.length,
    ),
  );

  for (let i = 0; i < recipientUids.length; i += NOTIFICATION_FANOUT_CHUNK_SIZE) {
    const chunk = recipientUids.slice(i, i + NOTIFICATION_FANOUT_CHUNK_SIZE);
    const batch = writeBatch(db);
    for (const uid of chunk) {
      batch.set(
        userNotificationDocRef(db, announcementRef.id, uid),
        buildUserNotificationData({
          uid,
          announcementId: announcementRef.id,
          title: input.title,
          body: input.body,
        }),
      );
    }
    await batch.commit();
  }

  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "notification.sent",
    targetType: "notification",
    targetId: announcementRef.id,
    details: `Sent "${input.title}" to ${recipientUids.length} recipient(s) (${input.audienceType})`,
  });

  return recipientUids.length;
}

export async function retractAnnouncementAction(
  announcementId: string,
  title: string,
  reviewer: Reviewer,
): Promise<void> {
  const db = requireDb();
  await setAnnouncementActive(db, announcementId, false);

  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "notification.retracted",
    targetType: "notification",
    targetId: announcementId,
    details: `Retracted notification "${title}" from admin history`,
  });
}
