"use client";

import { useState, useTransition } from "react";

type VaultDialogProps = {
  mode: "create" | "unlock" | "lock" | null;
  onClose: () => void;
  onCreate: (passphrase: string) => Promise<{ ok: boolean; error?: string }>;
  onUnlock: (passphrase: string) => Promise<{ ok: boolean; error?: string }>;
  onLock: () => Promise<{ ok: boolean; error?: string }>;
};

const copyByMode = {
  create: {
    title: "Create Vault",
    description:
      "Set a separate passphrase for encrypted `.emd` notes. This passphrase is required to decrypt them later.",
    action: "Create vault",
  },
  unlock: {
    title: "Unlock Vault",
    description:
      "Enter your vault passphrase to open and edit encrypted notes in this session.",
    action: "Unlock vault",
  },
  lock: {
    title: "Lock Vault",
    description:
      "Lock the vault for this session. Open encrypted notes will require unlocking again.",
    action: "Lock vault",
  },
} as const;

export default function VaultDialog({
  mode,
  onClose,
  onCreate,
  onUnlock,
  onLock,
}: VaultDialogProps) {
  const [passphrase, setPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!mode) return null;

  const copy = copyByMode[mode];

  const handleSubmit = () => {
    if (mode === "create") {
      if (passphrase !== confirmPassphrase) {
        setError("Vault passphrases do not match.");
        return;
      }
    }

    setError("");
    startTransition(async () => {
      const result =
        mode === "create"
          ? await onCreate(passphrase)
          : mode === "unlock"
            ? await onUnlock(passphrase)
            : await onLock();

      if (result.ok) {
        onClose();
        return;
      }

      setError(result.error ?? "Vault action failed.");
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="panel w-full max-w-md rounded-2xl p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            Vault
          </p>
          <h2 className="text-2xl font-semibold text-foreground">{copy.title}</h2>
          <p className="text-sm text-muted">{copy.description}</p>
        </div>

        <div className="mt-6 space-y-4">
          {mode !== "lock" ? (
            <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
              Vault passphrase
              <input
                autoFocus
                type="password"
                autoComplete="current-password"
                value={passphrase}
                onChange={(event) => setPassphrase(event.target.value)}
                className="rounded-md border border-border bg-surface px-3 py-2 text-sm normal-case tracking-normal text-foreground"
                placeholder="••••••••••"
              />
            </label>
          ) : null}

          {mode === "create" ? (
            <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
              Confirm passphrase
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassphrase}
                onChange={(event) => setConfirmPassphrase(event.target.value)}
                className="rounded-md border border-border bg-surface px-3 py-2 text-sm normal-case tracking-normal text-foreground"
                placeholder="Repeat passphrase"
              />
            </label>
          ) : null}

          {error ? (
            <p className="rounded-md border border-border bg-surface-strong px-3 py-2 text-xs text-rose-500">
              {error}
            </p>
          ) : null}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-md border border-border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted hover:bg-surface-strong disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              isPending ||
              (mode !== "lock" && passphrase.trim() === "") ||
              (mode === "create" && confirmPassphrase.trim() === "")
            }
            className="rounded-md border border-border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-foreground hover:bg-surface-strong disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Working..." : copy.action}
          </button>
        </div>
      </div>
    </div>
  );
}
