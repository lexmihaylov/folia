"use client";

import { useEffect, useState, useTransition } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";

import { createCredentialsAction, getAuthStateAction } from "@/app/auth/actions";

export default function SetupClient() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const storedTheme =
      typeof window !== "undefined"
        ? window.localStorage.getItem("folia-theme")
        : null;
    if (storedTheme === "light" || storedTheme === "dark") {
      document.documentElement.classList.remove("theme-light", "theme-dark");
      document.documentElement.classList.add(`theme-${storedTheme}`);
    }
    let active = true;
    (async () => {
      const state = await getAuthStateAction();
      if (!active) return;
      if (state.hasCredentials) {
        router.replace(state.isAuthenticated ? "/" : "/login");
        return;
      }
      setIsChecking(false);
    })();
    return () => {
      active = false;
    };
  }, [router]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const username = String(formData.get("username") ?? "");
    const password = String(formData.get("password") ?? "");
    const confirm = String(formData.get("confirm") ?? "");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    startTransition(async () => {
      const result = await createCredentialsAction(username, password);
      if (result.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  if (isChecking) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center px-4 py-10">
        <div className="panel w-full max-w-md rounded-xl p-6 text-sm text-muted">
          Checking session...
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell flex min-h-screen items-center justify-center px-4 py-10">
      <div className="panel w-full max-w-md rounded-xl p-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            Folia
          </p>
          <h1 className="text-2xl font-semibold text-foreground">
            Create credentials
          </h1>
          <p className="text-sm text-muted">
            Set a username and password for this library.
          </p>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            Username
            <input
              name="username"
              autoComplete="username"
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
              placeholder="your-name"
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            Password
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
              placeholder="••••••••"
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            Confirm password
            <input
              name="confirm"
              type="password"
              autoComplete="new-password"
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
              placeholder="••••••••"
              required
            />
          </label>
          {error ? (
            <p className="rounded-md border border-border bg-surface-strong px-3 py-2 text-xs text-rose-500">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-md border border-border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-foreground hover:bg-surface-strong disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Saving..." : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}
