"use client";

import { useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEllipsis } from "@fortawesome/free-solid-svg-icons";

type LibraryHeaderProps = {
  theme: "light" | "dark";
  hasVault: boolean;
  isVaultUnlocked: boolean;
  onToggleVault: () => void;
  onToggleTheme: () => void;
  onOpenSidebar: () => void;
};

export default function LibraryHeader({
  theme,
  hasVault,
  isVaultUnlocked,
  onToggleVault,
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
              <Link
                href="/changelog"
                className="block rounded-md px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted hover:bg-surface-strong"
                onClick={() => setIsHeaderMenuOpen(false)}
              >
                About
              </Link>
              <button
                type="button"
                onClick={() => {
                  onToggleVault();
                  setIsHeaderMenuOpen(false);
                }}
                className="mt-1 w-full rounded-md px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.2em] text-muted hover:bg-surface-strong"
              >
                {hasVault
                  ? isVaultUnlocked
                    ? "Lock vault"
                    : "Unlock vault"
                  : "Create vault"}
              </button>
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
          <Link
            href="/changelog"
            className="rounded-md border border-border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted hover:bg-surface-strong"
          >
            About
          </Link>
          <button
            type="button"
            onClick={onToggleVault}
            className="rounded-md border border-border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted hover:bg-surface-strong"
          >
            {hasVault
              ? isVaultUnlocked
                ? "Lock vault"
                : "Unlock vault"
              : "Create vault"}
          </button>
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
