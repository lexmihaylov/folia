"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileLines, faFolder, faPlus } from "@fortawesome/free-solid-svg-icons";

type LibraryLandingProps = {
  isSidebarOpen: boolean;
  onAddFolder: () => void;
  onAddFile: () => void;
};

export default function LibraryLanding({
  isSidebarOpen,
  onAddFolder,
  onAddFile,
}: LibraryLandingProps) {
  return (
    <div className="relative flex h-full min-h-0 flex-col items-center justify-center overflow-hidden rounded-xl border border-border bg-surface px-6 py-10 text-center">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(650px circle at 12% 18%, color-mix(in srgb, var(--accent) 28%, transparent), transparent 58%), radial-gradient(520px circle at 90% 10%, color-mix(in srgb, var(--foreground) 10%, transparent), transparent 60%)",
        }}
      />
      <div className="relative z-10 flex max-w-2xl flex-col items-center gap-5">
        <div className="space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-muted">
            Welcome to Folia
          </p>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Start a new page or pick one from the tree.
          </h2>
          <p className="text-sm text-muted sm:text-base">
            This panel is your writing desk. Create a folder, add a document,
            then switch to Edit when you are ready to draft.
          </p>
        </div>
        <div className="grid w-full gap-3 sm:grid-cols-3">
          <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-surface-strong px-3 py-4 text-xs text-foreground">
            <span className="text-sm text-muted">
              <FontAwesomeIcon icon={faFolder} />
            </span>
            <span className="font-semibold uppercase tracking-[0.2em]">
              New folder
            </span>
            <span className="text-muted">Organize the library tree.</span>
          </div>
          <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-surface-strong px-3 py-4 text-xs text-foreground">
            <span className="text-sm text-muted">
              <FontAwesomeIcon icon={faPlus} />
            </span>
            <span className="font-semibold uppercase tracking-[0.2em]">
              Add document
            </span>
            <span className="text-muted">Create a new Markdown page.</span>
          </div>
          <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-surface-strong px-3 py-4 text-xs text-foreground">
            <span className="text-sm text-muted">
              <FontAwesomeIcon icon={faFileLines} />
            </span>
            <span className="font-semibold uppercase tracking-[0.2em]">
              Select a file
            </span>
            <span className="text-muted">Edit or preview on the right.</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onAddFolder}
            className={`${isSidebarOpen ? "inline-flex" : "hidden"} rounded-md border border-border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-foreground hover:bg-surface-strong lg:inline-flex`}
          >
            Add folder
          </button>
          <button
            type="button"
            onClick={onAddFile}
            className={`${isSidebarOpen ? "inline-flex" : "hidden"} rounded-md border border-border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-foreground hover:bg-surface-strong lg:inline-flex`}
          >
            Add document
          </button>
        </div>
        <div className="text-xs text-muted">
          Tip: use the Actions menu on folders to add content.
        </div>
      </div>
    </div>
  );
}
