import { useState } from "react";

// Resets hook state synchronously during render when `key` changes, instead
// of via a setState call inside a useEffect body (which React's
// react-hooks/set-state-in-effect rule flags as a cascading-render risk).
// This is the state-adjustment-during-render pattern React's own docs
// recommend for exactly this case: https://react.dev/learn/you-might-not-need-an-effect
export function useResetOnKeyChange(key: string | null, onReset: () => void) {
  const [resolvedKey, setResolvedKey] = useState(key);
  if (key !== resolvedKey) {
    setResolvedKey(key);
    onReset();
  }
}
