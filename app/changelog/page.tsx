import type { Metadata } from "next";

import { requireAuth } from "@/lib/auth/guard";
import { changelog } from "@/lib/changelog";

export const metadata: Metadata = {
  title: "Changelog | Folia",
  description: "Release notes and updates for Folia.",
};

export default async function ChangelogPage() {
  await requireAuth();

  const entries = [...changelog].sort(
    (a, b) => Date.parse(b.date) - Date.parse(a.date),
  );
  const latest = entries[0];

  return (
    <div className="app-shell text-[15px] text-foreground sm:text-base">
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-10 px-6 py-10">
        <header className="sticky top-0 z-20 -mx-6 border-b border-border bg-background/95 px-6 py-4 backdrop-blur sm:-mx-10 sm:px-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
                About Folia
              </p>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                About &amp; Changelog
              </h1>
            </div>
            <a
              href="/"
              className="rounded-md border border-border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted hover:bg-surface-strong"
            >
              Back to library
            </a>
          </div>
        </header>
        <div className="relative overflow-hidden rounded-2xl border border-border bg-surface px-6 py-10 sm:px-10">
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden="true"
            style={{
              background:
                "radial-gradient(600px circle at 10% 10%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 65%), radial-gradient(500px circle at 90% 20%, color-mix(in srgb, var(--foreground) 10%, transparent), transparent 60%)",
            }}
          />
          <div className="relative z-10 flex flex-col gap-4">
            <p className="max-w-2xl text-sm text-muted sm:text-base">
              Folia is a filesystem-first knowledge base that treats your notes
              as plain Markdown files. No database lock-in, no hidden storage,
              just a clean tree on disk with fast search and a focused editor.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-surface-strong p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                  How it works
                </p>
                <p className="mt-3 text-sm text-foreground">
                  Folia scans your library root on disk, renders Markdown
                  safely, and updates the tree as files change. Your edits write
                  directly to the filesystem.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-surface-strong p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                  Your data
                </p>
                <p className="mt-3 text-sm text-foreground">
                  Credentials are hashed and stored locally. Preferences are
                  saved per user in a hidden JSON file at the library root.
                </p>
              </div>
            </div>
          </div>
        </div>

        <section className="grid gap-6">
          <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
            <div className="grid gap-6 sm:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                  Principles
                </p>
                <p className="mt-3 text-sm text-foreground">
                  Human-scale tools, portable storage, and quiet UI decisions
                  that keep you focused on writing.
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                  Security
                </p>
                <p className="mt-3 text-sm text-foreground">
                  Sessions are signed and credentials are hashed. You control
                  the library root and can back it up anywhere.
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                  Current version
                </p>
                <p className="mt-3 text-lg font-semibold">
                  {latest?.version}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {latest?.date}
                </p>
              </div>
            </div>
          </div>

          <div className="relative rounded-2xl border border-border bg-surface px-6 py-8 sm:px-10">
            <div className="absolute left-6 top-8 h-[calc(100%-4rem)] w-px bg-border sm:left-10" />
            <div className="space-y-8">
              {entries.map((entry) => (
                <div
                  key={entry.version}
                  className="relative grid gap-4 pl-6 sm:pl-10"
                >
                  <span className="absolute left-0 top-2 h-3 w-3 -translate-x-1/2 rounded-full border border-border bg-background sm:left-0" />
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-lg font-semibold">{entry.version}</h2>
                    <span className="text-xs text-muted">{entry.date}</span>
                    {entry.badge ? (
                      <span className="rounded-full border border-border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-foreground">
                        {entry.badge}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted">{entry.summary}</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {entry.sections.map((section) => (
                      <div
                        key={section.title}
                        className="rounded-xl border border-border bg-surface-strong p-4"
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                          {section.title}
                        </p>
                        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-foreground">
                          {section.items.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
