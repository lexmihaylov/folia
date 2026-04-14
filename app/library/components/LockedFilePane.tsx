"use client";

import type { SelectedFile } from "@/app/library/types";

type LockedFilePaneProps = {
  selectedFile: SelectedFile;
  hasVault: boolean;
  onOpenVaultDialog: () => void;
};

export default function LockedFilePane({
  selectedFile,
  hasVault,
  onOpenVaultDialog,
}: LockedFilePaneProps) {
  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center px-4 text-center">
      <div className="max-w-xl space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          Encrypted file is locked
        </h2>
        <p className="text-sm text-muted">
          <span className="font-semibold text-foreground">{selectedFile.name}</span>{" "}
          is encrypted. {hasVault
            ? "Unlock the vault to read and edit this file."
            : "Create a vault to read and edit encrypted files."}
        </p>
        <button
          type="button"
          onClick={onOpenVaultDialog}
          className="rounded-md border border-border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-foreground hover:bg-surface-strong"
        >
          {hasVault ? "Unlock vault" : "Create vault"}
        </button>
      </div>
    </div>
  );
}
