"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactElement,
} from "react";
import { useRouter } from "next/navigation";
import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faChevronDown,
  faChevronRight,
  faCopy,
  faEllipsis,
  faFileLines,
  faFolder,
  faMagnifyingGlass,
  faPaste,
  faPlus,
  faPen,
  faScissors,
  faTrash,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";

import type { LibrarySnapshot, TreeNode } from "@/lib/fs/library";
import {
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
  searchPages,
} from "@/app/library/actions";
import {
  updateCollapsedStateAction,
  updateThemePreferenceAction,
} from "@/app/auth/actions";

type DraftState = {
  parentPath: string;
  type: "folder" | "file";
  name: string;
};

type RenameState = {
  path: string;
  name: string;
  type: "folder" | "file";
};

type SelectedFile = {
  path: string;
  name: string;
};

type FileMeta = {
  createdAt: number | null;
  updatedAt: number | null;
};

const getInitialTheme = (
  initialTheme?: "light" | "dark" | null,
): "light" | "dark" => {
  if (initialTheme === "light" || initialTheme === "dark") {
    return initialTheme;
  }
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem("folia-theme");
  if (stored === "light" || stored === "dark") {
    return stored;
  }
  const prefersDark =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
};

type ClipboardState = {
  path: string;
  name: string;
  type: "folder" | "file";
  mode: "copy" | "cut";
};

type LibraryClientProps = {
  snapshot: LibrarySnapshot;
  initialSelectedFile?: SelectedFile | null;
  initialContent?: string;
  initialMeta?: FileMeta | null;
  initialCollapsed?: string[];
  initialTheme?: "light" | "dark" | null;
};

function insertNode(
  node: TreeNode,
  parentPath: string,
  child: TreeNode,
): TreeNode {
  if (node.path === parentPath && node.children) {
    const nextChildren = [...node.children, child];
    nextChildren.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return { ...node, children: nextChildren };
  }

  if (!node.children) return node;
  return {
    ...node,
    children: node.children.map((childNode) =>
      childNode.type === "folder"
        ? insertNode(childNode, parentPath, child)
        : childNode,
    ),
  };
}

function renameNode(
  node: TreeNode,
  oldPath: string,
  newPath: string,
  newName: string,
): TreeNode {
  if (node.path === oldPath) {
    return renameSubtree(node, oldPath, newPath, newName);
  }
  if (!node.children) return node;
  return {
    ...node,
    children: node.children.map((child) =>
      child.type === "folder"
        ? renameNode(child, oldPath, newPath, newName)
        : child,
    ),
  };
}

function renameSubtree(
  node: TreeNode,
  oldPath: string,
  newPath: string,
  newName: string,
): TreeNode {
  const updatedNode: TreeNode = {
    ...node,
    name: newName,
    path: newPath,
  };
  if (!node.children) return updatedNode;
  return {
    ...updatedNode,
    children: node.children.map((child) => {
      const nextPath = child.path.startsWith(oldPath + "/")
        ? newPath + child.path.slice(oldPath.length)
        : child.path;
      if (child.type === "folder") {
        return renameSubtree(child, child.path, nextPath, child.name);
      }
      return { ...child, path: nextPath };
    }),
  };
}

function removeNode(node: TreeNode, targetPath: string): TreeNode {
  if (!node.children) return node;
  const nextChildren = node.children
    .filter((child) => child.path !== targetPath)
    .map((child) =>
      child.type === "folder" ? removeNode(child, targetPath) : child,
    );
  return { ...node, children: nextChildren };
}

function renameFileNode(
  node: TreeNode,
  oldPath: string,
  newPath: string,
  newName: string,
): TreeNode {
  if (!node.children) return node;
  return {
    ...node,
    children: node.children.map((child) => {
      if (child.type === "file" && child.path === oldPath) {
        return { ...child, path: newPath, name: newName };
      }
      if (child.type === "folder") {
        return renameFileNode(child, oldPath, newPath, newName);
      }
      return child;
    }),
  };
}

function findNode(node: TreeNode, targetPath: string): TreeNode | null {
  if (node.path === targetPath) return node;
  if (!node.children) return null;
  for (const child of node.children) {
    if (child.path === targetPath) return child;
    if (child.type === "folder") {
      const found = findNode(child, targetPath);
      if (found) return found;
    }
  }
  return null;
}

function cloneNode(
  node: TreeNode,
  oldPath: string,
  newPath: string,
  newName: string,
): TreeNode {
  if (node.type === "folder") {
    return renameSubtree(node, oldPath, newPath, newName);
  }
  return { ...node, path: newPath, name: newName };
}

function filterTree(
  node: TreeNode,
  query: string,
  contentMatches: Set<string>,
): TreeNode | null {
  if (!query) return node;
  const needle = query.toLowerCase();
  const isRoot = node.path === "";
  const nameMatch = !isRoot && node.name.toLowerCase().includes(needle);

  if (node.type === "file") {
    return nameMatch || contentMatches.has(node.path) ? node : null;
  }

  const children = node.children ?? [];
  const filteredChildren = children
    .map((child) => filterTree(child, query, contentMatches))
    .filter((child): child is TreeNode => Boolean(child));

  if (nameMatch || filteredChildren.length > 0) {
    return { ...node, children: filteredChildren };
  }

  return null;
}

export default function LibraryClient({
  snapshot,
  initialSelectedFile = null,
  initialContent = "",
  initialMeta = null,
  initialCollapsed = [],
  initialTheme = null,
}: LibraryClientProps) {
  const router = useRouter();
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
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<ClipboardState | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMatches, setSearchMatches] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(
    () => new Set(initialCollapsed),
  );
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(
    initialSelectedFile,
  );
  const [fileMeta, setFileMeta] = useState<FileMeta | null>(initialMeta);
  const [content, setContent] = useState(initialContent);
  const [isEditing, setIsEditing] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    getInitialTheme(initialTheme),
  );
  const [isPending, startTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState("");

  const rootMissing = snapshot.rootMissing;
  useEffect(() => {
    const trimmed = submittedQuery.trim();
    if (!trimmed) {
      setSearchMatches([]);
      setIsSearching(false);
      return;
    }

    let active = true;
    setIsSearching(true);
    (async () => {
      const result = await searchPages(trimmed);
      if (!active) return;
      if (result.ok) {
        setSearchMatches(result.matches);
      } else {
        setSearchMatches([]);
      }
      setIsSearching(false);
    })();

    return () => {
      active = false;
    };
  }, [submittedQuery]);

  const lastCollapsedRef = useRef<string>("");
  const lastThemeRef = useRef<string>("");

  useEffect(() => {
    const serialized = JSON.stringify(Array.from(collapsedFolders));
    if (serialized === lastCollapsedRef.current) return;
    const timer = window.setTimeout(async () => {
      lastCollapsedRef.current = serialized;
      await updateCollapsedStateAction(Array.from(collapsedFolders));
    }, 250);
    return () => {
      window.clearTimeout(timer);
    };
  }, [collapsedFolders]);

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
    const trimmed = normalized.endsWith(".md")
      ? normalized.slice(0, -3)
      : normalized;
    const encoded = trimmed
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");
    return `/${encoded}`;
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("folia-theme", theme);
    document.documentElement.classList.remove("theme-light", "theme-dark");
    document.documentElement.classList.add(`theme-${theme}`);
    if (theme === lastThemeRef.current) return;
    lastThemeRef.current = theme;
    updateThemePreferenceAction(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      return next;
    });
  };

  const startClipboard = (mode: "copy" | "cut", node: TreeNode) => {
    setClipboard({ path: node.path, name: node.name, type: node.type, mode });
    setOpenMenu(null);
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

  const pasteInto = async (targetPath: string) => {
    if (!clipboard) return;
    ensureExpanded(targetPath);
    setOpenMenu(null);
    const item = clipboard;
    const targetIsInsideCutFolder =
      item.type === "folder" &&
      (targetPath === item.path || targetPath.startsWith(item.path + "/"));
    if (targetIsInsideCutFolder) {
      window.alert("Cannot paste a folder into itself.");
      return;
    }

    let desiredName = item.name;
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
              const nextSelected = { path: result.path, name: result.name };
              setSelectedFile(nextSelected);
              router.push(routeForPath(result.path));
            } else if (
              item.type === "folder" &&
              selectedFile.path.startsWith(item.path + "/")
            ) {
              const nextPath =
                result.path + selectedFile.path.slice(item.path.length);
              const nextName = nextPath.split("/").pop() ?? selectedFile.name;
              setSelectedFile({ path: nextPath, name: nextName });
              router.push(routeForPath(nextPath));
            }
          }
        }
        return;
      }

      if (result.error === "exists") {
        const promptLabel =
          item.type === "folder"
            ? "A folder with that name exists. Enter a new folder name:"
            : "A file with that name exists. Enter a new file name:";
        const nextName = window.prompt(promptLabel, desiredName);
        if (!nextName) return;
        desiredName = nextName;
        continue;
      }

      if (result.error === "invalid-name") {
        window.alert("Name must be a single folder or file segment.");
        return;
      }
      if (result.error === "unauthorized") {
        window.alert("Session expired. Please sign in again.");
        return;
      }

      window.alert("Unable to paste the item.");
      return;
    }
  };

  const selectFile = (path: string, name: string) => {
    setSelectedFile({ path, name });
    setSaveStatus("");
    setContent("");
    setFileMeta(null);
    setIsEditing(false);
    router.push(routeForPath(path));
    startTransition(async () => {
      const result = await loadPageContent(path);
      if (result.ok && typeof result.content === "string") {
        setContent(result.content);
        setFileMeta({
          createdAt: result.createdAt ?? null,
          updatedAt: result.updatedAt ?? null,
        });
      }
    });
  };

  const startDraft = (type: "folder" | "file", parentPath: string) => {
    ensureExpanded(parentPath);
    setDraft({ type, parentPath, name: "" });
    setDraftError("");
    setRenameState(null);
    setRenameError("");
    setDeleteTarget(null);
    setDeleteError("");
    setOpenMenu(null);
  };

  const startRename = (path: string, name: string, type: "folder" | "file") => {
    setRenameState({ path, name, type });
    setRenameError("");
    setDraft(null);
    setDraftError("");
    setDeleteTarget(null);
    setDeleteError("");
    setOpenMenu(null);
  };

  const startDelete = (path: string, type: "folder" | "file") => {
    setDeleteTarget({ path, type });
    setDeleteError("");
    setDraft(null);
    setDraftError("");
    setRenameState(null);
    setRenameError("");
    setOpenMenu(null);
  };

  const confirmDraft = () => {
    if (!draft) return;
    setDraftError("");

    startTransition(async () => {
      if (draft.type === "folder") {
        const result = await createFolderInline(draft.parentPath, draft.name);
        if (!result.ok) {
          setDraftError(result.error);
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
        return;
      }

      const result = await createPageInline(draft.parentPath, draft.name);
      if (!result.ok) {
        setDraftError(result.error);
        return;
      }
      const node: TreeNode = {
        name: result.name,
        path: result.path,
        type: "file",
      };
      setTree((prev) => insertNode(prev, draft.parentPath, node));
      setDraft(null);
      setSelectedFile({ path: result.path, name: result.name });
      setFileMeta({
        createdAt: result.createdAt ?? null,
        updatedAt: result.updatedAt ?? null,
      });
      setContent("");
      setIsEditing(true);
      router.push(routeForPath(result.path));
    });
  };

  const confirmRename = () => {
    if (!renameState) return;
    setRenameError("");
    startTransition(async () => {
      const result =
        renameState.type === "folder"
          ? await renameFolderInline(renameState.path, renameState.name)
          : await renameFileInline(renameState.path, renameState.name);
      if (!result.ok) {
        setRenameError(result.error);
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
        setSelectedFile({ path: newPath, name: result.name });
        router.push(routeForPath(newPath));
      } else if (renameState.type === "folder") {
        if (selectedFile?.path.startsWith(oldPath + "/")) {
          const nextPath = selectedFile.path.replace(oldPath, newPath);
          setSelectedFile({ path: nextPath, name: selectedFile.name });
          router.push(routeForPath(nextPath));
        }
      }
      setRenameState(null);
    });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setDeleteError("");
    startTransition(async () => {
      const result =
        deleteTarget.type === "folder"
          ? await deleteFolderInline(deleteTarget.path)
          : await deleteFileInline(deleteTarget.path);
      if (!result.ok) {
        setDeleteError(result.error);
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

  const saveFile = () => {
    if (!selectedFile) return;
    setSaveStatus("Saving...");
    startTransition(async () => {
      const result = await savePageContent(selectedFile.path, content);
      if (result.ok) {
        setSaveStatus("Saved");
        setFileMeta({
          createdAt: result.createdAt ?? fileMeta?.createdAt ?? null,
          updatedAt: result.updatedAt ?? fileMeta?.updatedAt ?? null,
        });
      } else {
        setSaveStatus(
          result.error === "unauthorized"
            ? "Session expired"
            : "Save failed",
        );
      }
    });
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

  const renderChildren = (node: TreeNode, depth: number): ReactElement => {
    const isRoot = node.path === "";
    const children = node.children ?? [];

    return (
      <div className={depth === 0 ? "mt-4" : "mt-1"}>
        {children.map((child) => {
          const isFolder = child.type === "folder";
          const isRenaming = renameState?.path === child.path;
          const isDeleting = deleteTarget?.path === child.path;
          const isCutting =
            clipboard?.mode === "cut" && clipboard.path === child.path;
          const isCollapsed =
            isFolder && !shouldExpandAll && collapsedFolders.has(child.path);
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
                    value={renameState.name}
                    onChange={(event) =>
                      setRenameState((prev) =>
                        prev ? { ...prev, name: event.target.value } : prev,
                      )
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        confirmRename();
                      }
                    }}
                    placeholder="rename-item"
                    className="flex min-w-0 flex-1 bg-transparent text-sm text-foreground"
                    disabled={isPending}
                  />
                  <button
                    type="button"
                    onClick={confirmRename}
                    className="text-xs text-emerald-600 hover:text-emerald-500"
                    disabled={isPending}
                  >
                    <FontAwesomeIcon icon={faCheck} />
                  </button>
                  <button
                    type="button"
                    onClick={cancelRename}
                    className="text-xs text-rose-500 hover:text-rose-400"
                    disabled={isPending}
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
                    {deleteTarget.type === "folder"
                      ? "Delete folder and contents?"
                      : "Delete file?"}
                  </span>
                  <button
                    type="button"
                    onClick={confirmDelete}
                    className="text-xs text-emerald-600 hover:text-emerald-500"
                    disabled={isPending}
                  >
                    <FontAwesomeIcon icon={faCheck} />
                  </button>
                  <button
                    type="button"
                    onClick={cancelDelete}
                    className="text-xs text-rose-500 hover:text-rose-400"
                    disabled={isPending}
                  >
                    <FontAwesomeIcon icon={faXmark} />
                  </button>
                </div>
              ) : (
                <div
                  className={`flex w-full min-w-0 items-center gap-2 rounded-lg px-2 py-1 text-left text-sm text-foreground hover:bg-surface-strong ${
                    selectedFile?.path === child.path
                      ? "border border-accent bg-surface-strong"
                      : ""
                  } ${isCutting ? "opacity-50" : ""}`}
                  style={{ paddingLeft: (depth + 1) * 12 }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      isFolder
                        ? toggleFolder(child.path)
                        : selectFile(child.path, child.name)
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
                              onClick={() => startDraft("folder", child.path)}
                              className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left hover:bg-surface-strong"
                            >
                              <FontAwesomeIcon icon={faFolder} />
                              Add folder
                            </button>
                            <button
                              type="button"
                              onClick={() => startDraft("file", child.path)}
                              className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left hover:bg-surface-strong"
                            >
                              <FontAwesomeIcon icon={faPlus} />
                              Add document
                            </button>
                            {clipboard ? (
                              <button
                                type="button"
                                onClick={() => pasteInto(child.path)}
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
                          onClick={() => startClipboard("copy", child)}
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left hover:bg-surface-strong"
                        >
                          <FontAwesomeIcon icon={faCopy} />
                          Copy
                        </button>
                        <button
                          type="button"
                          onClick={() => startClipboard("cut", child)}
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left hover:bg-surface-strong"
                        >
                          <FontAwesomeIcon icon={faScissors} />
                          Cut
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            startRename(child.path, child.name, child.type)
                          }
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left hover:bg-surface-strong"
                        >
                          <FontAwesomeIcon icon={faPen} />
                          Rename
                        </button>
                        <button
                          type="button"
                          onClick={() => startDelete(child.path, child.type)}
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

        {draft && draft.parentPath === node.path ? (
          <div
            className="mt-1 flex items-center gap-2 rounded-lg border border-border bg-surface px-2 py-1"
            style={{ marginLeft: depth * 12 }}
          >
            <span className="text-xs text-muted">
              <FontAwesomeIcon
                icon={draft.type === "folder" ? faFolder : faFileLines}
              />
            </span>
            <input
              autoFocus
              value={draft.name}
              onChange={(event) =>
                setDraft((prev) =>
                  prev ? { ...prev, name: event.target.value } : prev,
                )
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  confirmDraft();
                }
              }}
              placeholder={draft.type === "folder" ? "folder-name" : "new-page"}
              className="flex-1 bg-transparent text-sm text-foreground"
              disabled={isPending}
            />
            <button
              type="button"
              onClick={confirmDraft}
              className="text-xs text-emerald-600 hover:text-emerald-500"
              disabled={isPending}
            >
              <FontAwesomeIcon icon={faCheck} />
            </button>
            <button
              type="button"
              onClick={cancelDraft}
              className="text-xs text-rose-500 hover:text-rose-400"
              disabled={isPending}
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        ) : null}

        {renameState && renameState.path === node.path && renameErrorMessage ? (
          <p
            className="mt-1 text-[11px] text-muted"
            style={{ marginLeft: (depth + 1) * 12 }}
          >
            {renameErrorMessage}
          </p>
        ) : null}

        {deleteTarget?.path === node.path && deleteErrorMessage ? (
          <p
            className="mt-1 text-[11px] text-muted"
            style={{ marginLeft: (depth + 1) * 12 }}
          >
            {deleteErrorMessage}
          </p>
        ) : null}

        {draft && draft.parentPath === node.path && draftErrorMessage ? (
          <p
            className="mt-1 text-[11px] text-muted"
            style={{ marginLeft: (depth + 1) * 12 }}
          >
            {draftErrorMessage}
          </p>
        ) : null}

        {isRoot && children.length === 0 && !rootMissing ? (
          <p className="mt-2 text-[11px] text-muted">
            No folders yet. Use the add folder icon to get started.
          </p>
        ) : null}

        {isRoot && rootMissing ? (
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
    const isRenamingRoot = renameState?.path === node.path;
    const isDeletingRoot = deleteTarget?.path === node.path;
    const isRootCollapsed =
      !shouldExpandAll && collapsedFolders.has(node.path);

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
              value={renameState.name}
              onChange={(event) =>
                setRenameState((prev) =>
                  prev ? { ...prev, name: event.target.value } : prev,
                )
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  confirmRename();
                }
              }}
              placeholder="rename-item"
              className="flex min-w-0 flex-1 bg-transparent text-sm text-foreground"
              disabled={isPending}
            />
            <button
              type="button"
              onClick={confirmRename}
              className="text-xs text-emerald-600 hover:text-emerald-500"
              disabled={isPending}
            >
              <FontAwesomeIcon icon={faCheck} />
            </button>
            <button
              type="button"
              onClick={cancelRename}
              className="text-xs text-rose-500 hover:text-rose-400"
              disabled={isPending}
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
              {deleteTarget?.type === "folder"
                ? "Delete folder and contents?"
                : "Delete file?"}
            </span>
            <button
              type="button"
              onClick={confirmDelete}
              className="text-xs text-emerald-600 hover:text-emerald-500"
              disabled={isPending}
            >
              <FontAwesomeIcon icon={faCheck} />
            </button>
            <button
              type="button"
              onClick={cancelDelete}
              className="text-xs text-rose-500 hover:text-rose-400"
              disabled={isPending}
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
              onClick={() => toggleFolder(node.path)}
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
                      onClick={() => startDraft("folder", node.path)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left hover:bg-surface-strong"
                    >
                      <FontAwesomeIcon icon={faFolder} />
                      Add folder
                    </button>
                    <button
                      type="button"
                      onClick={() => startDraft("file", node.path)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left hover:bg-surface-strong"
                    >
                      <FontAwesomeIcon icon={faPlus} />
                      Add document
                    </button>
                    {clipboard ? (
                      <button
                        type="button"
                        onClick={() => pasteInto(node.path)}
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

  const formatTimestamp = (value: number | null | undefined) => {
    if (!value) return "Unknown";
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  };

  const renderLanding = () => (
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
            onClick={() => startDraft("folder", "")}
            className="rounded-md border border-border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-foreground hover:bg-surface-strong"
          >
            Add folder
          </button>
          <button
            type="button"
            onClick={() => startDraft("file", "")}
            className="rounded-md border border-border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-foreground hover:bg-surface-strong"
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

  return (
    <div className="app-shell text-[15px] text-foreground sm:text-base">
      <main className="flex h-screen w-full flex-col gap-6 overflow-hidden px-[10px] py-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="ink text-2xl font-semibold tracking-tight">
              Folia
            </span>
            <span className="rounded-md border border-border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
              library
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/changelog"
              className="rounded-md border border-border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted hover:bg-surface-strong"
            >
              About
            </a>
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-md border border-border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted hover:bg-surface-strong"
            >
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </button>
          </div>
        </header>

        <section className="grid flex-1 min-h-0 gap-6 lg:grid-cols-[400px_1fr]">
          <aside className="panel flex h-full min-h-0 flex-col rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                Library root
              </p>
              <span className="rounded-md border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
                {snapshot.collections.length} collections
              </span>
            </div>
            <p className="mt-2 text-xs font-semibold text-foreground">
              {snapshot.root}
            </p>

            <form
              className="mt-4 flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-xs text-muted"
              onSubmit={(event) => {
                event.preventDefault();
                setSubmittedQuery(searchQuery);
              }}
            >
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search pages..."
                className="w-full bg-transparent text-xs text-foreground placeholder:text-muted"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    setSubmittedQuery(searchQuery);
                  }
                }}
              />
              <button
                type="submit"
                className="text-xs text-muted hover:text-foreground"
                aria-label="Search"
              >
                <FontAwesomeIcon icon={faMagnifyingGlass} />
              </button>
            </form>

            {isSearching ? (
              <p className="mt-2 text-[11px] text-muted">Searching...</p>
            ) : !hasSearchResults ? (
              <p className="mt-2 text-[11px] text-muted">
                No matches. Try another name.
              </p>
            ) : null}

            <div className="mt-4 flex-1 overflow-y-auto overflow-x-hidden">
              {renderTree(filteredTree)}
            </div>
          </aside>

          <section className="panel flex h-full min-h-0 flex-col overflow-hidden rounded-xl p-5">
            {selectedFile ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="truncate text-sm font-semibold text-foreground">
                      {selectedFile.name}
                    </span>
                    <div className="flex flex-wrap gap-3 text-[11px] text-muted">
                      <span>Created {formatTimestamp(fileMeta?.createdAt)}</span>
                      <span>Updated {formatTimestamp(fileMeta?.updatedAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-muted">
                      {saveStatus}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditing((prev) => !prev)}
                      className="rounded-md border border-border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-foreground hover:bg-surface-strong"
                    >
                      {isEditing ? "Preview" : "Edit"}
                    </button>
                    {isEditing ? (
                      <button
                        type="button"
                        onClick={saveFile}
                        disabled={isPending}
                        className="rounded-md border border-border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-foreground hover:bg-surface-strong disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Save
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="mt-6 flex-1 min-h-0 overflow-hidden bg-surface">
                  <MDEditor
                    value={content}
                    onChange={(next) => setContent(next ?? "")}
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
            ) : (
              <div className="mt-2 flex-1 min-h-0">{renderLanding()}</div>
            )}
          </section>
        </section>
      </main>
    </div>
  );
}
