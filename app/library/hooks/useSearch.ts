import { useEffect, useState } from "react";

import { searchPages } from "@/app/library/actions";

export function useSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMatches, setSearchMatches] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [submittedQuery, setSubmittedQuery] = useState("");

  useEffect(() => {
    const trimmed = submittedQuery.trim();
    if (!trimmed) {
      setSearchMatches([]);
      setIsSearching(false);
      return;
    }

    let active = true;
    setIsSearching(true);
    (async () => {
      const result = await searchPages(trimmed);
      if (!active) return;
      if (result.ok) {
        setSearchMatches(result.matches);
      } else {
        setSearchMatches([]);
      }
      setIsSearching(false);
    })();

    return () => {
      active = false;
    };
  }, [submittedQuery]);

  const submitSearch = () => {
    setSubmittedQuery(searchQuery);
  };

  return {
    searchQuery,
    setSearchQuery,
    searchMatches,
    isSearching,
    submittedQuery,
    setSubmittedQuery,
    submitSearch,
  };
}
