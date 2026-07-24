import { doc, type Firestore, type Timestamp } from "firebase/firestore";
import { typedCollection } from "@/lib/firestore/converter";

const TASK_DAILY_COUNTERS_PATH = "taskDailyCounters";

// One document per user, doc id == uid — tracks how many task completions
// (of ANY task, not one specific task) this user has submitted within the
// current rolling 24h window, against their own active package's
// dailyTaskLimit (e.g. the 1000 package allows 1/day, the 7000 package
// allows 8/day). Separate from taskCooldowns, which gates resubmission of
// one specific "daily" task — this instead caps the user's total daily
// completions across every task. windowStartAt resets to "now" (and count
// resets to 1) the first time a submission lands more than 24h after the
// previous window started, mirroring the rolling-24h convention used
// everywhere else in this schema (Firestore rules can't compute a calendar
// date to key a real "once per calendar day" reset).
export type TaskDailyCounterDoc = {
  uid: string;
  count: number;
  windowStartAt: Timestamp;
};

export function taskDailyCountersCollection(db: Firestore) {
  return typedCollection<TaskDailyCounterDoc>(db, TASK_DAILY_COUNTERS_PATH);
}

export function taskDailyCounterDocRef(db: Firestore, uid: string) {
  return doc(taskDailyCountersCollection(db), uid);
}
