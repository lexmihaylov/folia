"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { LibrarySnapshot, TreeNode } from "@/lib/fs/library";
import {
  createEncryptedPageInline,
  createFolderInline,
  createPageInline,
  copyFileInline,
  copyFolderInline,
  deleteFolderInline,
  deleteFileInline,
  loadPageContent,
  moveFileInline,
  moveFolderInline,
  renameFolderInline,
  renameFileInline,
  savePageContent,
} from "@/app/library/actions";
import {
  createVaultAction,
  getVaultStateAction,
  lockVaultAction,
  unlockVaultAction,
} from "@/app/auth/actions";
import LibraryHeader from "@/app/library/components/LibraryHeader";
import LibraryLanding from "@/app/library/components/LibraryLanding";
import EditorPane from "@/app/library/components/EditorPane";
import LibrarySidebar from "@/app/library/components/LibrarySidebar";
import VaultDialog from "@/app/library/components/VaultDialog";
import { useCollapsedFolders } from "@/app/library/hooks/useCollapsedFolders";
import { useSearch } from "@/app/library/hooks/useSearch";
import { useThemePreference } from "@/app/library/hooks/useThemePreference";
import type {
  ClipboardState,
  DraftState,
  FileMeta,
  RenameState,
  SelectedFile,
  VaultState,
} from "@/app/library/types";
import {
  cloneNode,
  filterTree,
  findNode,
  insertNode,
  removeNode,
  renameFileNode,
  renameNode,
} from "@/app/library/utils/tree";
import { isEncryptedNotePath, stripNoteExtension } from "@/lib/encrypted-note";

export type LibraryClientProps = {
  snapshot: LibrarySnapshot;
  initialSelectedFile?: SelectedFile | null;
  initialContent?: string;
  initialMeta?: FileMeta | null;
  initialCollapsed?: string[];
  initialTheme?: "light" | "dark" | null;
  initialVaultState: VaultState;
};

export default function LibraryClient({
  snapshot,
  initialSelectedFile = null,
  initialContent = "",
  initialMeta = null,
  initialCollapsed = [],
  initialTheme = null,
  initialVaultState,
}: LibraryClientProps) {
  const router = useRouter();
  const latestLoadIdRef = useRef(0);
  const [tree, setTree] = useState<TreeNode>(snapshot.tree);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [draftError, setDraftError] = useState("");
  const [renameState, setRenameState] = useState<RenameState | null>(null);
  const [renameError, setRenameError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{
    path: string;
    type: "folder" | "file";
  } | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [clipboard, setClipboard] = useState<ClipboardState | null>(null);
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(
    initialSelectedFile,
  );
  const [fileMeta, setFileMeta] = useState<FileMeta | null>(initialMeta);
  const [content, setContent] = useState(initialContent);
  const [lastSavedContent, setLastSavedContent] = useState(initialContent);
  const [isEditing, setIsEditing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isEditorPending, startEditorTransition] = useTransition();
  const [, startBackgroundTransition] = useTransition();
  const [isTreePending, setIsTreePending] = useState(false);
  const [saveStatus, setSaveStatus] = useState(
    initialSelectedFile?.isEncrypted && !initialVaultState.isUnlocked
      ? initialVaultState.hasVault
        ? "Unlock the vault to open this note"
        : "Create a vault to open encrypted notes"
      : "",
  );
  const [vaultState, setVaultState] = useState<VaultState>(initialVaultState);
  const [vaultDialogMode, setVaultDialogMode] = useState<
    "create" | "unlock" | "lock" | null
  >(null);

  const { theme, toggleTheme } = useThemePreference(initialTheme);
  const { collapsedFolders, setCollapsedFolders } =
    useCollapsedFolders(initialCollapsed);
  const {
    searchQuery,
    setSearchQuery,
    searchMatches,
    isSearching,
    submittedQuery,
    submitSearch,
  } = useSearch();

  const rootMissing = snapshot.rootMissing;

  const filteredTree = useMemo(() => {
    const trimmed = submittedQuery.trim();
    const matchSet = new Set(searchMatches);
    const nextTree = filterTree(tree, trimmed, matchSet);
    return nextTree ? nextTree : { ...tree, children: [] };
  }, [submittedQuery, searchMatches, tree]);
  const hasSearchResults =
    submittedQuery.trim() === "" || (filteredTree.children?.length ?? 0) > 0;
  const shouldExpandAll = submittedQuery.trim() !== "";

  const routeForPath = (path: string) => {
    const normalized = path.replace(/^\//, "");
    const trimmed = stripNoteExtension(normalized);
    const encoded = trimmed
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");
    return `/${encoded}`;
  };

  const toggleFolder = (path: string) => {
    if (shouldExpandAll) return;
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const ensureExpanded = (path: string) => {
    setCollapsedFolders((prev) => {
      if (!prev.has(path)) return prev;
      const next = new Set(prev);
      next.delete(path);
      return next;
    });
  };

  const startClipboard = (mode: "copy" | "cut", node: TreeNode) => {
    setClipboard({ path: node.path, name: node.name, type: node.type, mode });
  };

  const refreshVaultState = useCallback(async () => {
    setVaultState(await getVaultStateAction());
  }, []);

  const pasteInto = async (targetPath: string) => {
    if (!clipboard) return;
    ensureExpanded(targetPath);
    const item = clipboard;
    const targetIsInsideCutFolder =
      item.type === "folder" &&
      (targetPath === item.path || targetPath.startsWith(item.path + "/"));
    if (targetIsInsideCutFolder) {
      window.alert("Cannot paste a folder into itself.");
      return;
    }

    let desiredName = item.name;
    setIsTreePending(true);
    while (true) {
      const result =
        item.type === "folder"
          ? item.mode === "copy"
            ? await copyFolderInline(item.path, targetPath, desiredName)
            : await moveFolderInline(item.path, targetPath, desiredName)
          : item.mode === "copy"
            ? await copyFileInline(item.path, targetPath, desiredName)
            : await moveFileInline(item.path, targetPath, desiredName);

      if (result.ok) {
        setTree((prev) => {
          const nextNode: TreeNode =
            item.type === "folder"
              ? cloneNode(
                findNode(prev, item.path) ?? {
                  path: item.path,
                  name: item.name,
                  type: "folder",
                  children: [],
                },
                item.path,
                result.path,
                result.name,
              )
              : {
                path: result.path,
                name: result.name,
                type: "file",
                isEncrypted: result.isEncrypted,
              };

          const withInsert = insertNode(prev, targetPath, nextNode);
          if (item.mode === "cut") {
            return removeNode(withInsert, item.path);
          }
          return withInsert;
        });

        if (item.mode === "cut") {
          setClipboard(null);
          if (selectedFile) {
            if (item.type === "file" && selectedFile.path === item.path) {
              const nextSelected = {
                path: result.path,
                name: result.name,
                isEncrypted: result.isEncrypted,
              };
              setSelectedFile(nextSelected);
              router.push(routeForPath(result.path));
            } else if (
              item.type === "folder" &&
              selectedFile.path.startsWith(item.path + "/")
            ) {
              const nextPath =
                result.path + selectedFile.path.slice(item.path.length);
              const nextName = nextPath.split("/").pop() ?? selectedFile.name;
              setSelectedFile({
                path: nextPath,
                name: nextName,
                isEncrypted: isEncryptedNotePath(nextPath),
              });
              router.push(routeForPath(nextPath));
            }
          }
        }
        setIsTreePending(false);
        return;
      }

      if (result.error === "exists") {
        const promptLabel =
          item.type === "folder"
            ? "A folder with that name exists. Enter a new folder name:"
            : "A file with that name exists. Enter a new file name:";
        const nextName = window.prompt(promptLabel, desiredName);
        if (!nextName) {
          setIsTreePending(false);
          return;
        }
        desiredName = nextName;
        continue;
      }

      if (result.error === "invalid-name") {
        setIsTreePending(false);
        window.alert("Name must be a single folder or file segment.");
        return;
      }
      if (result.error === "unauthorized") {
        setIsTreePending(false);
        window.alert("Session expired. Please sign in again.");
        return;
      }

      setIsTreePending(false);
      window.alert("Unable to paste the item.");
      return;
    }
  };

  const loadSelectedFile = useCallback(async (path: string) => {
    const loadId = ++latestLoadIdRef.current;
    const result = await loadPageContent(path);
    if (loadId !== latestLoadIdRef.current) {
      return;
    }
    if (!result.ok) {
      if (
        result.error === "vault-locked" ||
        result.error === "vault-unconfigured"
      ) {
        setSaveStatus(
          result.error === "vault-unconfigured"
            ? "Create a vault to open encrypted notes"
            : "Unlock the vault to open this note",
        );
        await refreshVaultState();
      }
      return;
    }

    if (typeof result.content === "string") {
      setContent(result.content);
      setLastSavedContent(result.content);
      setFileMeta({
        createdAt: result.createdAt ?? null,
        updatedAt: result.updatedAt ?? null,
      });
      setSelectedFile({
        path: result.path,
        name: result.name,
        isEncrypted: result.isEncrypted,
      });
      setSaveStatus("");
    }
  }, [refreshVaultState]);

  const selectFile = (path: string, name: string) => {
    const isEncrypted = isEncryptedNotePath(path);
    setSelectedFile({ path, name, isEncrypted });
    setSaveStatus("");
    setContent("");
    setLastSavedContent("");
    setFileMeta(null);
    setIsEditing(false);
    router.push(routeForPath(path));
    void loadSelectedFile(path);
  };

  const startDraft = (
    type: "folder" | "file" | "encryptedFile",
    parentPath: string,
  ) => {
    ensureExpanded(parentPath);
    setDraft({ type, parentPath, name: "" });
    setDraftError("");
    setRenameState(null);
    setRenameError("");
    setDeleteTarget(null);
    setDeleteError("");
  };

  const startRename = (path: string, name: string, type: "folder" | "file") => {
    setRenameState({ path, name, type });
    setRenameError("");
    setDraft(null);
    setDraftError("");
    setDeleteTarget(null);
    setDeleteError("");
  };

  const startDelete = (path: string, type: "folder" | "file") => {
    setDeleteTarget({ path, type });
    setDeleteError("");
    setDraft(null);
    setDraftError("");
    setRenameState(null);
    setRenameError("");
  };

  const confirmDraft = () => {
    if (!draft) return;
    setDraftError("");
    setIsTreePending(true);

    startBackgroundTransition(async () => {
      if (draft.type === "folder") {
        const result = await createFolderInline(draft.parentPath, draft.name);
        if (!result.ok) {
          setDraftError(result.error);
          setIsTreePending(false);
          return;
        }
        const node: TreeNode = {
          name: result.name,
          path: result.path,
          type: "folder",
          children: [],
        };
        setTree((prev) => insertNode(prev, draft.parentPath, node));
        setDraft(null);
        setIsTreePending(false);
        return;
      }

      const result =
        draft.type === "encryptedFile"
          ? await createEncryptedPageInline(draft.parentPath, draft.name)
          : await createPageInline(draft.parentPath, draft.name);
      if (!result.ok) {
        setDraftError(result.error);
        if (
          result.error === "vault-locked" ||
          result.error === "vault-unconfigured"
        ) {
          await refreshVaultState();
        }
        setIsTreePending(false);
        return;
      }
      const node: TreeNode = {
        name: result.name,
        path: result.path,
        type: "file",
        isEncrypted: result.isEncrypted,
      };
      setTree((prev) => insertNode(prev, draft.parentPath, node));
      setDraft(null);
      setSelectedFile({
        path: result.path,
        name: result.name,
        isEncrypted: result.isEncrypted,
      });
      setFileMeta({
        createdAt: result.createdAt ?? null,
        updatedAt: result.updatedAt ?? null,
      });
      setContent("");
      setLastSavedContent("");
      setIsEditing(true);
      router.push(routeForPath(result.path));
      setIsTreePending(false);
    });
  };

  const confirmRename = () => {
    if (!renameState) return;
    setRenameError("");
    setIsTreePending(true);
    startBackgroundTransition(async () => {
      const result =
        renameState.type === "folder"
          ? await renameFolderInline(renameState.path, renameState.name)
          : await renameFileInline(renameState.path, renameState.name);
      if (!result.ok) {
        setRenameError(result.error);
        setIsTreePending(false);
        return;
      }
      const oldPath = renameState.path;
      const newPath = result.path;
      setTree((prev) =>
        renameState.type === "folder"
          ? renameNode(prev, oldPath, newPath, result.name)
          : renameFileNode(prev, oldPath, newPath, result.name),
      );
      if (selectedFile?.path === oldPath) {
        setSelectedFile({
          path: newPath,
          name: result.name,
          isEncrypted: result.isEncrypted ?? isEncryptedNotePath(newPath),
        });
        router.push(routeForPath(newPath));
      } else if (renameState.type === "folder") {
        if (selectedFile?.path.startsWith(oldPath + "/")) {
          const nextPath = selectedFile.path.replace(oldPath, newPath);
          setSelectedFile({
            path: nextPath,
            name: selectedFile.name,
            isEncrypted: isEncryptedNotePath(nextPath),
          });
          router.push(routeForPath(nextPath));
        }
      }
      setRenameState(null);
      setIsTreePending(false);
    });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setDeleteError("");
    setIsTreePending(true);
    startBackgroundTransition(async () => {
      const result =
        deleteTarget.type === "folder"
          ? await deleteFolderInline(deleteTarget.path)
          : await deleteFileInline(deleteTarget.path);
      if (!result.ok) {
        setDeleteError(result.error);
        setIsTreePending(false);
        return;
      }
      setTree((prev) => removeNode(prev, deleteTarget.path));
      if (selectedFile?.path === deleteTarget.path) {
        setSelectedFile(null);
        setFileMeta(null);
        setContent("");
        router.push("/");
      } else if (
        deleteTarget.type === "folder" &&
        selectedFile?.path.startsWith(deleteTarget.path + "/")
      ) {
        setSelectedFile(null);
        setFileMeta(null);
        setContent("");
        router.push("/");
      }
      setDeleteTarget(null);
      setIsTreePending(false);
    });
  };

  const cancelDraft = () => {
    setDraft(null);
    setDraftError("");
  };

  const cancelRename = () => {
    setRenameState(null);
    setRenameError("");
  };

  const cancelDelete = () => {
    setDeleteTarget(null);
    setDeleteError("");
  };

  const hasUnsavedChanges =
    Boolean(selectedFile) && content !== lastSavedContent;

  const saveFile = useCallback(async () => {
    if (!selectedFile || !hasUnsavedChanges) return hasUnsavedChanges === false;
    setSaveStatus("Saving...");
    return new Promise<boolean>((resolve) => {
      startEditorTransition(async () => {
        const result = await savePageContent(selectedFile.path, content);
        if (result.ok) {
          setSaveStatus("Saved");
          setLastSavedContent(content);
          setFileMeta({
            createdAt: result.createdAt ?? fileMeta?.createdAt ?? null,
            updatedAt: result.updatedAt ?? fileMeta?.updatedAt ?? null,
          });
          resolve(true);
        } else {
          setSaveStatus(
            result.error === "unauthorized"
              ? "Session expired"
              : result.error === "vault-locked"
                ? "Vault locked"
              : "Save failed",
          );
          if (
            result.error === "vault-locked" ||
            result.error === "vault-unconfigured"
          ) {
            await refreshVaultState();
          }
          resolve(false);
        }
      });
    });
  }, [
    content,
    fileMeta?.createdAt,
    fileMeta?.updatedAt,
    hasUnsavedChanges,
    selectedFile,
    refreshVaultState,
  ]);

  const handleToggleEdit = async () => {
    if (isEditing) {
      await saveFile();
    }
    setIsEditing((prev) => !prev);
  };

  const handleVaultToggle = () => {
    setVaultDialogMode(
      vaultState.hasVault
        ? vaultState.isUnlocked
          ? "lock"
          : "unlock"
        : "create",
    );
  };

  const handleCreateVault = async (passphrase: string) => {
    const result = await createVaultAction(passphrase);
    if (!result.ok) {
      return { ok: false, error: result.error };
    }
    await refreshVaultState();
    if (selectedFile?.isEncrypted) {
      await loadSelectedFile(selectedFile.path);
    }
    return { ok: true };
  };

  const handleUnlockVault = async (passphrase: string) => {
    const result = await unlockVaultAction(passphrase);
    if (!result.ok) {
      return { ok: false, error: result.error };
    }
    await refreshVaultState();
    if (selectedFile?.isEncrypted) {
      await loadSelectedFile(selectedFile.path);
    }
    return { ok: true };
  };

  const handleLockVault = async () => {
    await lockVaultAction();
    setVaultState({ hasVault: true, isUnlocked: false });
    if (selectedFile?.isEncrypted) {
      setContent("");
      setLastSavedContent("");
      setIsEditing(false);
      setSaveStatus("Vault locked");
    }
    return { ok: true };
  };

  const draftErrorMessage = useMemo(() => {
    switch (draftError) {
      case "invalid-name":
        return "Name cannot be empty or include slashes.";
      case "invalid-path":
        return "Path must stay within the library root.";
      case "exists":
        return "That file already exists.";
      case "write-failed":
        return "Unable to write to disk.";
      case "unauthorized":
        return "Session expired. Please sign in again.";
      case "vault-locked":
        return "Unlock the vault before creating encrypted notes.";
      case "vault-unconfigured":
        return "Create a vault passphrase before using encrypted notes.";
      default:
        return "";
    }
  }, [draftError]);

  const renameErrorMessage = useMemo(() => {
    switch (renameError) {
      case "invalid-name":
        return "Name cannot be empty or include slashes.";
      case "invalid-path":
        return "Path must stay within the library root.";
      case "exists":
        return "A folder with that name already exists.";
      case "write-failed":
        return "Unable to rename the folder.";
      case "unauthorized":
        return "Session expired. Please sign in again.";
      default:
        return "";
    }
  }, [renameError]);

  const deleteErrorMessage = useMemo(() => {
    switch (deleteError) {
      case "invalid-path":
        return "Path must stay within the library root.";
      case "write-failed":
        return "Unable to delete the item.";
      case "unauthorized":
        return "Session expired. Please sign in again.";
      default:
        return "";
    }
  }, [deleteError]);

  const displayedSaveStatus = useMemo(() => {
    if (isEditing && selectedFile) {
      if (hasUnsavedChanges) return "Unsaved";
      if (saveStatus === "" || saveStatus === "Saved") return "Saved";
    }
    return saveStatus;
  }, [hasUnsavedChanges, isEditing, saveStatus, selectedFile]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isEditing) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveFile();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEditing, saveFile]);

  return (
    <div className="app-shell text-[15px] text-foreground sm:text-base">
      <VaultDialog
        key={vaultDialogMode ?? "closed"}
        mode={vaultDialogMode}
        onClose={() => setVaultDialogMode(null)}
        onCreate={handleCreateVault}
        onUnlock={handleUnlockVault}
        onLock={handleLockVault}
      />
      <main className="box-border flex h-[100dvh] w-full flex-col gap-4 overflow-hidden px-1 py-4 sm:gap-6 sm:px-[10px] sm:py-6">
        <LibraryHeader
          theme={theme}
          hasVault={vaultState.hasVault}
          isVaultUnlocked={vaultState.isUnlocked}
          onToggleVault={handleVaultToggle}
          onToggleTheme={toggleTheme}
          onOpenSidebar={() => setIsSidebarOpen(true)}
        />

        <section className="grid flex-1 min-h-0 gap-4 sm:gap-6 lg:grid-cols-[400px_1fr]">
          <LibrarySidebar
            snapshot={snapshot}
            isSidebarOpen={isSidebarOpen}
            onCloseSidebar={() => setIsSidebarOpen(false)}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            onSearchSubmit={submitSearch}
            isSearching={isSearching}
            hasSearchResults={hasSearchResults}
            treeState={{
              tree: filteredTree,
              draft,
              renameState,
              deleteTarget,
              clipboard,
              collapsedFolders,
              selectedFile,
              rootMissing,
              shouldExpandAll,
              isPending: isTreePending,
              draftErrorMessage,
              renameErrorMessage,
              deleteErrorMessage,
            }}
            treeHandlers={{
              onToggleFolder: toggleFolder,
              onSelectFile: selectFile,
              onStartDraft: startDraft,
              onStartRename: startRename,
              onStartDelete: startDelete,
              onConfirmDraft: confirmDraft,
              onCancelDraft: cancelDraft,
              onConfirmRename: confirmRename,
              onCancelRename: cancelRename,
              onConfirmDelete: confirmDelete,
              onCancelDelete: cancelDelete,
              onStartClipboard: startClipboard,
              onPasteInto: pasteInto,
              onUpdateDraftName: (name) =>
                setDraft((prev) => (prev ? { ...prev, name } : prev)),
              onUpdateRenameName: (name) =>
                setRenameState((prev) => (prev ? { ...prev, name } : prev)),
            }}
          />

          <section className="panel flex h-full min-h-0 flex-col overflow-hidden rounded-md p-2 sm:rounded-xl sm:p-5">
            {selectedFile ? (
              <EditorPane
                selectedFile={selectedFile}
                fileMeta={fileMeta}
                saveStatus={displayedSaveStatus}
                isEditing={isEditing}
                isPending={isEditorPending}
                theme={theme}
                content={content}
                onToggleEdit={handleToggleEdit}
                onSave={saveFile}
                onContentChange={setContent}
              />
            ) : (
              <div className="mt-2 flex-1 min-h-0">
                <LibraryLanding
                  isSidebarOpen={isSidebarOpen}
                  onAddFolder={() => startDraft("folder", "")}
                  onAddFile={() => startDraft("file", "")}
                  onAddEncryptedFile={() => startDraft("encryptedFile", "")}
                />
              </div>
            )}
          </section>
        </section>
      </main>
    </div>
  );
}
