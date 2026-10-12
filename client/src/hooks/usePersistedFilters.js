import { useCallback, useEffect, useRef, useState } from "react";

const PREFIX = "gs-filters:";

// Keeps every filter except `search` and `page` between visits
const read = (key, initial) => {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFIX + key) || "null");
    if (saved && typeof saved === "object") {
      const merged = Object.fromEntries(
        Object.keys(initial).map((k) => [k, saved[k] ?? initial[k]]),
      );
      return { ...merged, search: "", page: 1 };
    }
  } catch {
    /* ignore */
  }
  return initial;
};

export function usePersistedFilters(key, initial) {
  const initialRef = useRef(initial);
  const [filters, setFilters] = useState(() => read(key, initial));

  useEffect(() => {
    try {
      const { search, page, ...rest } = filters; // eslint-disable-line no-unused-vars
      localStorage.setItem(PREFIX + key, JSON.stringify(rest));
    } catch {
      /* ignore */
    }
  }, [key, filters]);

  const reset = useCallback(() => setFilters(initialRef.current), []);
  return [filters, setFilters, reset];
}
