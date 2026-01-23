"use client";

import { useState, type ReactElement } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faChevronDown,
  faChevronRight,
  faCopy,
  faEllipsis,
  faFileLines,
  faFolder,
  faPaste,
  faPen,
  faPlus,
  faScissors,
  faTrash,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";

import type { TreeNode } from "@/lib/fs/library";
import type {
  LibraryTreeHandlers,
  LibraryTreeState,
} from "@/app/library/components/libraryTreeTypes";

type LibraryTreeProps = {
  state: LibraryTreeState;
  handlers: LibraryTreeHandlers;
};

export default function LibraryTree({ state, handlers }: LibraryTreeProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const renderChildren = (node: TreeNode, depth: number): ReactElement => {
    const isRoot = node.path === "";
    const children = node.children ?? [];

    return (
      <div className={depth === 0 ? "mt-4" : "mt-1"}>
        {children.map((child) => {
          const isFolder = child.type === "folder";
          const isRenaming = state.renameState?.path === child.path;
          const isDeleting = state.deleteTarget?.path === child.path;
          const isCutting =
            state.clipboard?.mode === "cut" && state.clipboard.path === child.path;
          const isCollapsed =
            isFolder &&
            !state.shouldExpandAll &&
            state.collapsedFolders.has(child.path);
          return (
            <div key={child.path} className="mt-1">
              {isRenaming ? (
                <div
                  className="flex w-full min-w-0 items-center gap-2 rounded-lg border border-border bg-surface px-2 py-1"
                  style={{ paddingLeft: (depth + 1) * 12 }}
                >
                  <span className="text-xs text-muted">
                    <FontAwesomeIcon
                      icon={isFolder ? faFolder : faFileLines}
                    />
                  </span>
                  <input
                    autoFocus
                    value={state.renameState?.name ?? ""}
                    onChange={(event) =>
                      handlers.onUpdateRenameName(event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handlers.onConfirmRename();
                      }
                    }}
                    placeholder="rename-item"
                    className="flex min-w-0 flex-1 bg-transparent text-sm text-foreground"
                    disabled={state.isPending}
                  />
                  <button
                    type="button"
                    onClick={handlers.onConfirmRename}
                    className="text-xs text-emerald-600 hover:text-emerald-500"
                    disabled={state.isPending}
                  >
                    <FontAwesomeIcon icon={faCheck} />
                  </button>
                  <button
                    type="button"
                    onClick={handlers.onCancelRename}
                    className="text-xs text-rose-500 hover:text-rose-400"
                    disabled={state.isPending}
                  >
                    <FontAwesomeIcon icon={faXmark} />
                  </button>
                </div>
              ) : isDeleting ? (
                <div
                  className="flex w-full min-w-0 items-center gap-2 rounded-lg border border-border bg-surface px-2 py-1 text-xs text-muted"
                  style={{ paddingLeft: (depth + 1) * 12 }}
                >
                  <span className="text-xs text-muted">
                    <FontAwesomeIcon
                      icon={isFolder ? faFolder : faFileLines}
                    />
                  </span>
                  <span className="flex-1">
                    {state.deleteTarget?.type === "folder"
                      ? "Delete folder and contents?"
                      : "Delete file?"}
                  </span>
                  <button
                    type="button"
                    onClick={handlers.onConfirmDelete}
                    className="text-xs text-emerald-600 hover:text-emerald-500"
                    disabled={state.isPending}
                  >
                    <FontAwesomeIcon icon={faCheck} />
                  </button>
                  <button
                    type="button"
                    onClick={handlers.onCancelDelete}
                    className="text-xs text-rose-500 hover:text-rose-400"
                    disabled={state.isPending}
                  >
                    <FontAwesomeIcon icon={faXmark} />
                  </button>
                </div>
              ) : (
                <div
                  className={`flex w-full min-w-0 items-center gap-2 rounded-lg px-2 py-1 text-left text-sm text-foreground hover:bg-surface-strong ${state.selectedFile?.path === child.path
                    ? "border border-accent bg-surface-strong"
                    : ""
                    } ${isCutting ? "opacity-50" : ""}`}
                  style={{ paddingLeft: (depth + 1) * 12 }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      isFolder
                        ? handlers.onToggleFolder(child.path)
                        : handlers.onSelectFile(child.path, child.name)
                    }
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    {isFolder ? (
                      <span className="text-[10px] text-muted">
                        <FontAwesomeIcon
                          icon={isCollapsed ? faChevronRight : faChevronDown}
                        />
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted opacity-50">
                        <FontAwesomeIcon icon={faChevronRight} />
                      </span>
                    )}
                    <span className="text-xs text-muted">
                      <FontAwesomeIcon
                        icon={isFolder ? faFolder : faFileLines}
                      />
                    </span>
                    <span
                      className={`${isFolder ? "font-semibold" : ""} break-words`}
                    >
                      {child.name}
                    </span>
                  </button>
                  <div className="relative ml-auto">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMenu((prev) =>
                          prev === child.path ? null : child.path,
                        )
                      }
                      className="rounded-lg border border-border px-2 py-0.5 text-[10px] text-muted transition hover:border-transparent hover:bg-surface-strong"
                      aria-label="Open actions"
                      title="Actions"
                    >
                      <FontAwesomeIcon icon={faEllipsis} />
                    </button>
                    {openMenu === child.path ? (
                      <div className="absolute right-0 top-6 z-10 w-40 rounded-xl border border-border bg-surface p-2 text-xs text-foreground">
                        {isFolder ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                handlers.onStartDraft("folder", child.path);
                                setOpenMenu(null);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left hover:bg-surface-strong"
                            >
                              <FontAwesomeIcon icon={faFolder} />
                              Add folder
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handlers.onStartDraft("file", child.path);
                                setOpenMenu(null);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left hover:bg-surface-strong"
                            >
                              <FontAwesomeIcon icon={faPlus} />
                              Add document
                            </button>
                            {state.clipboard ? (
                              <button
                                type="button"
                                onClick={() => {
                                  handlers.onPasteInto(child.path);
                                  setOpenMenu(null);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left hover:bg-surface-strong"
                              >
                                <FontAwesomeIcon icon={faPaste} />
                                Paste
                              </button>
                            ) : null}
                          </>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => {
                            handlers.onStartClipboard("copy", child);
                            setOpenMenu(null);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left hover:bg-surface-strong"
                        >
                          <FontAwesomeIcon icon={faCopy} />
                          Copy
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handlers.onStartClipboard("cut", child);
                            setOpenMenu(null);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left hover:bg-surface-strong"
                        >
                          <FontAwesomeIcon icon={faScissors} />
                          Cut
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handlers.onStartRename(child.path, child.name, child.type);
                            setOpenMenu(null);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left hover:bg-surface-strong"
                        >
                          <FontAwesomeIcon icon={faPen} />
                          Rename
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handlers.onStartDelete(child.path, child.type);
                            setOpenMenu(null);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left hover:bg-surface-strong"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                          Delete
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
              {isFolder && !isCollapsed ? renderChildren(child, depth + 1) : null}
            </div>
          );
        })}

        {state.draft && state.draft.parentPath === node.path ? (
          <div
            className="mt-1 flex items-center gap-2 rounded-lg border border-border bg-surface px-2 py-1"
            style={{ marginLeft: depth * 12 }}
          >
            <span className="text-xs text-muted">
              <FontAwesomeIcon
                icon={state.draft.type === "folder" ? faFolder : faFileLines}
              />
            </span>
            <input
              autoFocus
              value={state.draft.name}
              onChange={(event) => handlers.onUpdateDraftName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handlers.onConfirmDraft();
                }
              }}
              placeholder={state.draft.type === "folder" ? "folder-name" : "new-page"}
              className="flex-1 bg-transparent text-sm text-foreground"
              disabled={state.isPending}
            />
            <button
              type="button"
              onClick={handlers.onConfirmDraft}
              className="text-xs text-emerald-600 hover:text-emerald-500"
              disabled={state.isPending}
            >
              <FontAwesomeIcon icon={faCheck} />
            </button>
            <button
              type="button"
              onClick={handlers.onCancelDraft}
              className="text-xs text-rose-500 hover:text-rose-400"
              disabled={state.isPending}
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        ) : null}

        {state.renameState && state.renameState.path === node.path && state.renameErrorMessage ? (
          <p
            className="mt-1 text-[11px] text-muted"
            style={{ marginLeft: (depth + 1) * 12 }}
          >
            {state.renameErrorMessage}
          </p>
        ) : null}

        {state.deleteTarget?.path === node.path && state.deleteErrorMessage ? (
          <p
            className="mt-1 text-[11px] text-muted"
            style={{ marginLeft: (depth + 1) * 12 }}
          >
            {state.deleteErrorMessage}
          </p>
        ) : null}

        {state.draft && state.draft.parentPath === node.path && state.draftErrorMessage ? (
          <p
            className="mt-1 text-[11px] text-muted"
            style={{ marginLeft: (depth + 1) * 12 }}
          >
            {state.draftErrorMessage}
          </p>
        ) : null}

        {isRoot && children.length === 0 && !state.rootMissing ? (
          <p className="mt-2 text-[11px] text-muted">
            No folders yet. Use the add folder icon to get started.
          </p>
        ) : null}

        {isRoot && state.rootMissing ? (
          <div className="mt-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted">
            <span className="font-semibold text-foreground">
              Root not found.
            </span>{" "}
            Update `folia.config.json`.
          </div>
        ) : null}
      </div>
    );
  };

  const renderTree = (node: TreeNode, depth = 0): ReactElement => {
    const isRenamingRoot = state.renameState?.path === node.path;
    const isDeletingRoot = state.deleteTarget?.path === node.path;
    const isRootCollapsed =
      !state.shouldExpandAll && state.collapsedFolders.has(node.path);

    return (
      <div className={depth === 0 ? "mt-4" : "mt-2"}>
        {isRenamingRoot ? (
          <div
            className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-surface px-2 py-1"
            style={{ paddingLeft: depth * 12 }}
          >
            <span className="text-xs text-muted">
              <FontAwesomeIcon icon={faFolder} />
            </span>
            <input
              autoFocus
              value={state.renameState?.name ?? ""}
              onChange={(event) => handlers.onUpdateRenameName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handlers.onConfirmRename();
                }
              }}
              placeholder="rename-item"
              className="flex min-w-0 flex-1 bg-transparent text-sm text-foreground"
              disabled={state.isPending}
            />
            <button
              type="button"
              onClick={handlers.onConfirmRename}
              className="text-xs text-emerald-600 hover:text-emerald-500"
              disabled={state.isPending}
            >
              <FontAwesomeIcon icon={faCheck} />
            </button>
            <button
              type="button"
              onClick={handlers.onCancelRename}
              className="text-xs text-rose-500 hover:text-rose-400"
              disabled={state.isPending}
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        ) : isDeletingRoot ? (
          <div
            className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-surface px-2 py-1 text-xs text-muted"
            style={{ paddingLeft: depth * 12 }}
          >
            <span className="text-xs text-muted">
              <FontAwesomeIcon icon={faFolder} />
            </span>
            <span className="flex-1">
              {state.deleteTarget?.type === "folder"
                ? "Delete folder and contents?"
                : "Delete file?"}
            </span>
            <button
              type="button"
              onClick={handlers.onConfirmDelete}
              className="text-xs text-emerald-600 hover:text-emerald-500"
              disabled={state.isPending}
            >
              <FontAwesomeIcon icon={faCheck} />
            </button>
            <button
              type="button"
              onClick={handlers.onCancelDelete}
              className="text-xs text-rose-500 hover:text-rose-400"
              disabled={state.isPending}
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        ) : (
          <div
            className="flex min-w-0 items-center gap-2 rounded-lg px-2 py-1 text-sm text-foreground hover:bg-surface-strong"
            style={{ paddingLeft: depth * 12 }}
          >
            <button
              type="button"
              onClick={() => handlers.onToggleFolder(node.path)}
              className="text-[10px] text-muted"
              aria-label={isRootCollapsed ? "Expand folder" : "Collapse folder"}
            >
              <FontAwesomeIcon
                icon={isRootCollapsed ? faChevronRight : faChevronDown}
              />
            </button>
            <span className="text-xs text-muted">
              <FontAwesomeIcon icon={faFolder} />
            </span>
            <span className="break-words font-semibold">{node.name}</span>
            <div className="ml-auto flex items-center gap-1">
              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setOpenMenu((prev) => (prev === node.path ? null : node.path))
                  }
                  className="rounded-lg border border-border px-2 py-0.5 text-[10px] text-muted transition hover:border-transparent hover:bg-surface-strong"
                  aria-label="Open actions"
                  title="Actions"
                >
                  <FontAwesomeIcon icon={faEllipsis} />
                </button>
                {openMenu === node.path ? (
                  <div className="absolute right-0 top-6 z-10 w-40 rounded-xl border border-border bg-surface p-2 text-xs text-foreground">
                    <button
                      type="button"
                      onClick={() => {
                        handlers.onStartDraft("folder", node.path);
                        setOpenMenu(null);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left hover:bg-surface-strong"
                    >
                      <FontAwesomeIcon icon={faFolder} />
                      Add folder
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handlers.onStartDraft("file", node.path);
                        setOpenMenu(null);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left hover:bg-surface-strong"
                    >
                      <FontAwesomeIcon icon={faPlus} />
                      Add document
                    </button>
                    {state.clipboard ? (
                      <button
                        type="button"
                        onClick={() => {
                          handlers.onPasteInto(node.path);
                          setOpenMenu(null);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left hover:bg-surface-strong"
                      >
                        <FontAwesomeIcon icon={faPaste} />
                        Paste
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}
        {isRootCollapsed ? null : renderChildren(node, depth)}
      </div>
    );
  };

  return renderTree(state.tree);
}
