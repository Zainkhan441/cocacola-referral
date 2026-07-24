import { setAccountStatus, setUserPackage, type AccountStatus } from "@/lib/firestore/users";
import { logActivity } from "@/lib/firestore/activity-logs";
import { requireDb, type Reviewer } from "@/features/admin/lib/require-db";

export async function setAccountStatusAction(
  uid: string,
  userName: string,
  status: AccountStatus,
  reviewer: Reviewer,
): Promise<void> {
  const db = requireDb();
  await setAccountStatus(db, uid, status);

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
