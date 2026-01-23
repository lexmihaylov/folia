"use client";

import type { FormEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";

import type { LibrarySnapshot } from "@/lib/fs/library";
import LibraryTree from "@/app/library/components/LibraryTree";
import type {
  LibraryTreeHandlers,
  LibraryTreeState,
} from "@/app/library/components/libraryTreeTypes";

type LibrarySidebarProps = {
  snapshot: LibrarySnapshot;
  isSidebarOpen: boolean;
  onCloseSidebar: () => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearchSubmit: () => void;
  isSearching: boolean;
  hasSearchResults: boolean;
  treeState: LibraryTreeState;
  treeHandlers: LibraryTreeHandlers;
};

export default function LibrarySidebar({
  snapshot,
  isSidebarOpen,
  onCloseSidebar,
  searchQuery,
  onSearchQueryChange,
  onSearchSubmit,
  isSearching,
  hasSearchResults,
  treeState,
  treeHandlers,
}: LibrarySidebarProps) {
  return (
    <>
      {isSidebarOpen ? (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={onCloseSidebar}
          aria-hidden="true"
        />
      ) : null}
      <aside
        className={`panel fixed inset-y-0 left-0 z-40 flex h-full w-full max-w-[380px] flex-col rounded-none p-4 transition-transform duration-200 lg:static lg:z-auto lg:h-full lg:max-w-none lg:translate-x-0 lg:rounded-xl ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="flex items-center justify-between gap-3 lg:hidden">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            Library
          </p>
          <button
            type="button"
            onClick={onCloseSidebar}
            className="rounded-md border border-border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted hover:bg-surface-strong"
          >
            Close
          </button>
        </div>
        <div className="hidden items-start justify-between gap-3 lg:flex">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            Library root
          </p>
          <span className="rounded-md border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
            {snapshot.collections.length} collections
          </span>
        </div>
        <p className="mt-2 text-xs font-semibold text-foreground">
          {snapshot.root}
        </p>

        <form
          className="mt-4 flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-xs text-muted"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            onSearchSubmit();
          }}
        >
          <input
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="Search pages..."
            className="w-full bg-transparent text-xs text-foreground placeholder:text-muted"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onSearchSubmit();
              }
            }}
          />
          <button
            type="submit"
            className="text-xs text-muted hover:text-foreground"
            aria-label="Search"
          >
            <FontAwesomeIcon icon={faMagnifyingGlass} />
          </button>
        </form>

        {isSearching ? (
          <p className="mt-2 text-[11px] text-muted">Searching...</p>
        ) : !hasSearchResults ? (
          <p className="mt-2 text-[11px] text-muted">
            No matches. Try another name.
          </p>
        ) : null}

        <div className="mt-4 flex-1 overflow-y-auto overflow-x-hidden">
          <LibraryTree state={treeState} handlers={treeHandlers} />
        </div>
      </aside>
    </>
  );
}
