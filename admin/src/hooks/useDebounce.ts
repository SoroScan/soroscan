import { useEffect, useState } from "react";

/**
 * Returns `value` after it has stopped changing for `delayMs` milliseconds.
 *
 * The pending timer is cleared whenever `value` changes and on unmount, so no
 * stale updates fire after the consumer has moved on and no timers leak.
 */
export function useDebounce<T>(value: T, delayMs: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
}
