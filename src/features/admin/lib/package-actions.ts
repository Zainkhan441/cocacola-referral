import {
  createPackage,
  setPackageActive,
  updatePackage,
  type PackageInput,
} from "@/lib/firestore/packages";
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
