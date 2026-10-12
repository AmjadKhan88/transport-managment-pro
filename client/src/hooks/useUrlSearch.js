import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Calls apply(q) when the page is opened (or the URL changes) with ?q=...
export function useUrlSearch(apply) {
  const { search } = useLocation();
  const q = new URLSearchParams(search).get("q");

  useEffect(() => {
    if (q !== null) apply(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
}
