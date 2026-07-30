import { doc, type Firestore, type Timestamp } from "firebase/firestore";
import { typedCollection } from "@/lib/firestore/converter";

const DAILY_TASK_PROGRESS_PATH = "dailyTaskProgress";

// One document per user, doc id == uid — counts how many DISTINCT tasks
// this user has completed today, against their own package's
// packageDailyTaskLimit snapshot. Resets on a real Asia/Karachi CALENDAR-DAY
// boundary (isNewPakistanDay), matching users/{uid}.lastDailyClaimAt's
// semantics, since this is what gates the bundled reward claim (also
// calendar-day based) — not a rolling 24h window.
// Incremented by exactly 1 in the SAME transaction as the taskCompletions
// doc whose Start→Complete transition triggered it; since a given task can
// only complete once per day (see task-completions.ts), double-counting
// one task is impossible by construction, not by cross-checking here.
export type DailyTaskProgressDoc = {
  uid: string;
  count: number;
  windowStartAt: Timestamp;
};

export function dailyTaskProgressCollection(db: Firestore) {
  return typedCollection<DailyTaskProgressDoc>(db, DAILY_TASK_PROGRESS_PATH);
}

export function dailyTaskProgressDocRef(db: Firestore, uid: string) {
  return doc(dailyTaskProgressCollection(db), uid);
}
