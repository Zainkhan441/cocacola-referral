import type { TransactionDoc } from "@/lib/firestore/transactions";

// Money leaving the user's own pocket (a withdrawal, or the cost of a
// package purchase) is "out"; every other type credits a wallet, so it's
// "in" — deterministic from `type` alone for every type except
// "admin_adjustment", which can go either way depending on what the admin
// actually did. Single source of truth so every display site (dashboard,
// /wallet, admin Financial History, admin user detail) agrees — they
// previously disagreed with each other on package_purchase's direction.
const OUTFLOW_TYPES: ReadonlySet<TransactionDoc["type"]> = new Set(["withdrawal", "package_purchase"]);

export function transactionDirectionFor(
  transaction: Pick<TransactionDoc, "type" | "direction">,
): "in" | "out" {
  if (transaction.type === "admin_adjustment" && transaction.direction) {
    return transaction.direction;
  }
  return OUTFLOW_TYPES.has(transaction.type) ? "out" : "in";
}
