"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEllipsis } from "@fortawesome/free-solid-svg-icons";

type LibraryHeaderProps = {
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onOpenSidebar: () => void;
};

export default function LibraryHeader({
  theme,
  onToggleTheme,
  onOpenSidebar,
}: LibraryHeaderProps) {
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 px-3 sm:px-0">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="rounded-md border border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted hover:bg-surface-strong lg:hidden"
          aria-label="Open library"
        >
          ☰
        </button>
        <span className="ink text-2xl font-semibold tracking-tight">Folia</span>
        <span className="rounded-md border border-border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
          library
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative sm:hidden">
          <button
            type="button"
            onClick={() => setIsHeaderMenuOpen((prev) => !prev)}
            className="rounded-md border border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted hover:bg-surface-strong"
            aria-expanded={isHeaderMenuOpen}
            aria-haspopup="menu"
            aria-label="Actions"
          >
            <FontAwesomeIcon icon={faEllipsis} />
          </button>
          {isHeaderMenuOpen ? (
            <div className="absolute right-0 top-full z-20 mt-2 w-44 rounded-xl border border-border bg-surface p-2 shadow-lg">
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a
                href="/changelog"
                className="block rounded-md px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted hover:bg-surface-strong"
                onClick={() => setIsHeaderMenuOpen(false)}
              >
                About
              </a>
              <button
                type="button"
                onClick={() => {
                  onToggleTheme();
                  setIsHeaderMenuOpen(false);
                }}
                className="mt-1 w-full rounded-md px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.2em] text-muted hover:bg-surface-strong"
              >
                {theme === "dark" ? "Light mode" : "Dark mode"}
              </button>
            </div>
          ) : null}
        </div>
        <div className="hidden items-center gap-3 sm:flex">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/changelog"
            className="rounded-md border border-border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted hover:bg-surface-strong"
          >
            About
          </a>
          <button
            type="button"
            onClick={onToggleTheme}
            className="rounded-md border border-border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted hover:bg-surface-strong"
          >
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
        </div>
      </div>
    </header>
  );
}
