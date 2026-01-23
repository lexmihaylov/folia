"use client";

import MDEditor from "@uiw/react-md-editor";

import type { FileMeta, SelectedFile } from "@/app/library/types";

type EditorPaneProps = {
  selectedFile: SelectedFile;
  fileMeta: FileMeta | null;
  saveStatus: string;
  isEditing: boolean;
  isPending: boolean;
  theme: "light" | "dark";
  content: string;
  onToggleEdit: () => void;
  onSave: () => void;
  onContentChange: (next: string) => void;
};

const formatTimestamp = (value: number | null | undefined) => {
  if (!value) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

export default function EditorPane({
  selectedFile,
  fileMeta,
  saveStatus,
  isEditing,
  isPending,
  theme,
  content,
  onToggleEdit,
  onSave,
  onContentChange,
}: EditorPaneProps) {
  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-sm font-semibold text-foreground hidden sm:flex">
            {selectedFile.name}
          </span>
          <div className="flex flex-wrap gap-3 text-[11px] text-muted hidden sm:flex">
            <span>Created {formatTimestamp(fileMeta?.createdAt)}</span>
            <span>Updated {formatTimestamp(fileMeta?.updatedAt)}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-muted">{saveStatus}</span>
          <button
            type="button"
            onClick={onToggleEdit}
            className="rounded-md border border-border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-foreground hover:bg-surface-strong"
          >
            {isEditing ? "Preview" : "Edit"}
          </button>
          {isEditing ? (
            <button
              type="button"
              onClick={onSave}
              disabled={isPending}
              className="rounded-md border border-border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-foreground hover:bg-surface-strong disabled:cursor-not-allowed disabled:opacity-60"
            >
              Save
            </button>
          ) : null}
        </div>
      </div>
      <div className="mt-4 flex-1 min-h-0 overflow-hidden bg-surface sm:mt-6">
        <MDEditor
          value={content}
          onChange={(next) => onContentChange(next ?? "")}
          data-color-mode={theme}
          preview={isEditing ? "live" : "preview"}
          hideToolbar={!isEditing}
          height="100%"
          textareaProps={{
            placeholder: "Start writing in Markdown...",
          }}
        />
      </div>
    </>
  );
}
