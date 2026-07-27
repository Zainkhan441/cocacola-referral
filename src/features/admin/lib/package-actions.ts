import { getDocs } from "firebase/firestore";
import {
  createPackage,
  deletePackage,
  setPackageActive,
  updatePackage,
  type PackageInput,
} from "@/lib/firestore/packages";
import { usersWithPackageQuery } from "@/lib/firestore/users";
import { pendingDepositsForPackageQuery } from "@/lib/firestore/deposits";
import { logActivity } from "@/lib/firestore/activity-logs";
import { requireDb, type Reviewer } from "@/features/admin/lib/require-db";

export async function createPackageAction(
  input: PackageInput,
  reviewer: Reviewer,
): Promise<string> {
  const db = requireDb();
  const packageId = await createPackage(db, input);

  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "package.created",
    targetType: "package",
    targetId: packageId,
    details: `Created package "${input.name}"`,
  });

  return packageId;
}

export async function updatePackageAction(
  packageId: string,
  input: PackageInput,
  reviewer: Reviewer,
): Promise<void> {
  const db = requireDb();
  await updatePackage(db, packageId, input);

  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "package.updated",
    targetType: "package",
    targetId: packageId,
    details: `Updated package "${input.name}"`,
  });
}

export async function setPackageActiveAction(
  packageId: string,
  packageName: string,
  isActive: boolean,
  reviewer: Reviewer,
): Promise<void> {
  const db = requireDb();
  await setPackageActive(db, packageId, isActive);

  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: isActive ? "package.enabled" : "package.disabled",
    targetType: "package",
    targetId: packageId,
    details: `${isActive ? "Enabled" : "Disabled"} package "${packageName}"`,
  });
}

// Permanent delete is only safe once nothing still references this package —
// otherwise a user's own document (or a pending deposit still awaiting
// review) would point at a package document that no longer exists,
// corrupting history or breaking approval. Firestore rules can't run
// collection-wide queries, so these two existence checks are the actual
// safety mechanism; the rules layer only gates that the caller is an admin.
export async function deletePackageAction(
  packageId: string,
  packageName: string,
  reviewer: Reviewer,
): Promise<void> {
  const db = requireDb();

  const [holderSnap, pendingDepositSnap] = await Promise.all([
    getDocs(usersWithPackageQuery(db, packageId)),
    getDocs(pendingDepositsForPackageQuery(db, packageId)),
  ]);

  if (!holderSnap.empty) {
    throw new Error(
      "This package is still assigned to at least one user. Disable it instead of deleting — existing holders keep their package either way, but deleting would break their historical record.",
    );
  }
  if (!pendingDepositSnap.empty) {
    throw new Error(
      "This package has a deposit still awaiting review. Disable it instead, or resolve the pending deposit first — deleting now would break that approval.",
    );
  }

  await deletePackage(db, packageId);

  await logActivity(db, {
    actorUid: reviewer.adminUid,
    actorName: reviewer.adminName,
    action: "package.deleted",
    targetType: "package",
    targetId: packageId,
    details: `Permanently deleted package "${packageName}"`,
  });
}
