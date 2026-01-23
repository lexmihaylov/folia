import type { TreeNode } from "@/lib/fs/library";
import type {
  ClipboardState,
  DraftState,
  RenameState,
  SelectedFile,
} from "@/app/library/types";

export type LibraryTreeState = {
  tree: TreeNode;
  draft: DraftState | null;
  renameState: RenameState | null;
  deleteTarget: { path: string; type: "folder" | "file" } | null;
  clipboard: ClipboardState | null;
  collapsedFolders: Set<string>;
  selectedFile: SelectedFile | null;
  rootMissing: boolean;
  shouldExpandAll: boolean;
  isPending: boolean;
  draftErrorMessage: string;
  renameErrorMessage: string;
  deleteErrorMessage: string;
};

export type LibraryTreeHandlers = {
  onToggleFolder: (path: string) => void;
  onSelectFile: (path: string, name: string) => void;
  onStartDraft: (type: "folder" | "file", parentPath: string) => void;
  onStartRename: (path: string, name: string, type: "folder" | "file") => void;
  onStartDelete: (path: string, type: "folder" | "file") => void;
  onConfirmDraft: () => void;
  onCancelDraft: () => void;
  onConfirmRename: () => void;
  onCancelRename: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onStartClipboard: (mode: "copy" | "cut", node: TreeNode) => void;
  onPasteInto: (targetPath: string) => void;
  onUpdateDraftName: (name: string) => void;
  onUpdateRenameName: (name: string) => void;
};
