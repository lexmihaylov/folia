import { useEffect, useRef, useState } from "react";

import { updateCollapsedStateAction } from "@/app/auth/actions";

export function useCollapsedFolders(initialCollapsed: string[] = []) {
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(
    () => new Set(initialCollapsed),
  );
  const lastCollapsedRef = useRef<string>("");

  useEffect(() => {
    const serialized = JSON.stringify(Array.from(collapsedFolders));
    if (serialized === lastCollapsedRef.current) return;
    const timer = window.setTimeout(async () => {
      lastCollapsedRef.current = serialized;
      await updateCollapsedStateAction(Array.from(collapsedFolders));
    }, 250);
    return () => {
      window.clearTimeout(timer);
    };
  }, [collapsedFolders]);

  return { collapsedFolders, setCollapsedFolders };
}
