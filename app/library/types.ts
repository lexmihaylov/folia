export type DraftState = {
  parentPath: string;
  type: "folder" | "file";
  name: string;
};

export type RenameState = {
  path: string;
  name: string;
  type: "folder" | "file";
};

export type SelectedFile = {
  path: string;
  name: string;
};

export type FileMeta = {
  createdAt: number | null;
  updatedAt: number | null;
};

export type ClipboardState = {
  path: string;
  name: string;
  type: "folder" | "file";
  mode: "copy" | "cut";
};
