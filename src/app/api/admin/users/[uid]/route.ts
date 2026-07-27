import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { requireAdminCaller, AdminRequestError } from "@/lib/auth/verify-admin-request";

export const runtime = "nodejs";

// One (collection, field) pair to check for an unresolved "pending" item
// still awaiting review before this account can be permanently deleted —
// deleting mid-review would leave an admin unable to approve/reject
// something real (the source document still exists and is still valid,
// preserved per the financial-history requirement, but the transaction
// that would resolve it needs a live users/{uid} document to credit).
const PENDING_CHECKS: Array<{ collection: string; label: string }> = [
  { collection: "deposits", label: "a pending deposit" },
  { collection: "withdrawals", label: "a pending withdrawal" },
  { collection: "taskSubmissions", label: "a pending task submission" },
  { collection: "bonusClaims", label: "a pending bonus claim" },
];

export async function DELETE(request: Request, { params }: { params: Promise<{ uid: string }> }) {
  try {
    return await handleDelete(request, await params);
  } catch (error) {
    if (error instanceof AdminRequestError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    // Covers, among other things, the Admin SDK not being configured yet
    // (missing FIREBASE_ADMIN_* env vars — see .env.example) — surfaced as
    // a clean JSON error instead of Next.js's generic HTML 500 page, so the
    // admin UI can actually display what went wrong.
    const message = error instanceof Error ? error.message : "Something went wrong.";
    return Response.json({ error: message }, { status: 500 });
  }
}

async function handleDelete(request: Request, { uid: targetUid }: { uid: string }) {
  const caller = await requireAdminCaller(request);

  if (caller.uid === targetUid) {
    return Response.json({ error: "You can't delete your own admin account." }, { status: 400 });
  }

  const db = getAdminDb();
  const userRef = db.collection("users").doc(targetUid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    return Response.json({ error: "This user no longer exists." }, { status: 404 });
  }
  const userData = userSnap.data() ?? {};
  const userName = (userData.fullName as string | undefined) ?? targetUid;
  const referralCode = userData.referralCode as string | undefined;

  // Safe deletion workflow: block entirely (no partial cleanup) if any
  // resolution is still pending for this user, same "disable instead"
  // philosophy as package deletion — never rely on the UI alone to prevent
  // this, since this route is the actual security boundary.
  for (const check of PENDING_CHECKS) {
    const snap = await db
      .collection(check.collection)
      .where("uid", "==", targetUid)
      .where("status", "==", "pending")
      .limit(1)
      .get();
    if (!snap.empty) {
      return Response.json(
        {
          error: `This user has ${check.label} awaiting review. Resolve it (approve or reject) before permanently deleting this account.`,
        },
        { status: 409 },
      );
    }
  }

  // Firebase Authentication deletion — tolerate "already gone" so a retried
  // request (network blip, double click) is still a safe no-op rather than
  // a hard failure.
  try {
    await getAdminAuth().deleteUser(targetUid);
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code !== "auth/user-not-found") {
      return Response.json({ error: "Couldn't delete this user's sign-in account. No data was removed." }, { status: 502 });
    }
  }

  // Safe Firestore cleanup: remove only the account's own personal/live
  // documents. Financial history (transactions, deposits, withdrawals,
  // packagePurchases) and referral history (referralRewards, teamMembers)
  // are deliberately left untouched — every one of those already carries
  // its own denormalized name/email snapshot from write time, so none of
  // them need a live users/{uid} document to stay meaningful.
  const batch = db.batch();
  batch.delete(userRef);
  batch.delete(db.collection("wallets").doc(targetUid));
  // Prevents this user's old referral link/code from silently attributing
  // brand-new signups to a uid that no longer exists (which would break
  // those signups' own atomic profile-creation write — see firestore.rules
  // teamMembers create rule's exists(ancestorUid) check).
  if (referralCode) {
    batch.delete(db.collection("referralCodes").doc(referralCode));
  }
  await batch.commit();

  // Personal notification history has no historical/audit value once the
  // account can never sign in again — cleaned up separately since it can
  // be an unbounded number of documents (chunked well under Firestore's
  // 500-writes-per-batch limit).
  const notificationsSnap = await db.collection("userNotifications").where("uid", "==", targetUid).get();
  const chunkSize = 400;
  for (let i = 0; i < notificationsSnap.docs.length; i += chunkSize) {
    const chunk = notificationsSnap.docs.slice(i, i + chunkSize);
    const notificationBatch = db.batch();
    chunk.forEach((doc) => notificationBatch.delete(doc.ref));
    await notificationBatch.commit();
  }

  await db.collection("activityLogs").add({
    actorUid: caller.uid,
    actorName: caller.name,
    action: "user.deleted_permanently",
    targetType: "user",
    targetId: targetUid,
    details: `Permanently deleted ${userName}'s account (Firebase Auth + Firestore profile). Financial and referral history preserved.`,
    createdAt: FieldValue.serverTimestamp(),
  });

  return Response.json({ deleted: true });
}
