import type { Timestamp } from "firebase/firestore";

export function formatCurrency(amount: number): string {
  return `Rs ${amount.toLocaleString()}`;
}

export function formatDate(timestamp: Timestamp): string {
  return timestamp.toDate().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
