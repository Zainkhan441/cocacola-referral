import { serverTimestamp, writeBatch, type DocumentReference, type Firestore } from "firebase/firestore";

// Swaps the `order` field between two documents in one batch — the reorder
// primitive shared by every simple ordered CMS list (announcements, FAQ,
// rules, nav/footer links), mirroring cms-sections.ts's swapSectionOrder for
// the exact same purpose.
export async function swapOrder(
  db: Firestore,
  a: { ref: DocumentReference; order: number },
  b: { ref: DocumentReference; order: number },
): Promise<void> {
  const batch = writeBatch(db);
  batch.update(a.ref, { order: b.order, updatedAt: serverTimestamp() });
  batch.update(b.ref, { order: a.order, updatedAt: serverTimestamp() });
  await batch.commit();
}
