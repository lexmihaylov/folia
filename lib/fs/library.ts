import { opendir, stat } from "node:fs/promises";
import { watch, type FSWatcher } from "node:fs";
import path from "node:path";

import { getFoliaConfig } from "@/lib/config";

export type CollectionInfo = {
  name: string;
  path: string;
  pages: number;
  updatedAt: number | null;
};

export type TreeNode = {
  name: string;
  path: string;
  type: "folder" | "file";
  children?: TreeNode[];
};

export type RecentPage = {
  name: string;
  path: string;
  updatedAt: number;
};

export type LibrarySnapshot = {
  root: string;
  collections: CollectionInfo[];
  recentPages: RecentPage[];
  tree: TreeNode;
  rootMissing: boolean;
};

const RECENT_LIMIT = 6;

let cache: { root: string; snapshot: LibrarySnapshot } | null = null;
let inflight: Promise<LibrarySnapshot> | null = null;
let watcher: FSWatcher | null = null;
let watcherRoot: string | null = null;
let watchSupported = true;

function toPosix(input: string): string {
  return input.split(path.sep).join(path.posix.sep);
}

function addRecent(list: RecentPage[], page: RecentPage) {
  if (list.length < RECENT_LIMIT) {
    list.push(page);
    return;
  }
  let oldestIndex = 0;
  for (let i = 1; i < list.length; i += 1) {
    if (list[i].updatedAt < list[oldestIndex].updatedAt) {
      oldestIndex = i;
    }
  }
  if (page.updatedAt > list[oldestIndex].updatedAt) {
    list[oldestIndex] = page;
  }
}

async function scanLibrary(root: string): Promise<LibrarySnapshot> {
  const collections = new Map<string, CollectionInfo>();
  const recentPages: RecentPage[] = [];
  const rootNode: TreeNode = {
    name: "root",
    path: "",
    type: "folder",
    children: [],
  };
  const nodeByRel = new Map<string, TreeNode>([["", rootNode]]);

  const stack: Array<{ abs: string; rel: string }> = [
    { abs: root, rel: "" },
  ];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) break;

    let dir;
    try {
      dir = await opendir(current.abs);
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === "ENOENT") {
        if (current.abs === root) {
          return {
            root,
            collections: [],
            recentPages: [],
            tree: rootNode,
            rootMissing: true,
          };
        }
        continue;
      }
      throw error;
    }

    const parentNode = nodeByRel.get(current.rel);
    for await (const entry of dir) {
      if (entry.isSymbolicLink()) continue;

      const entryAbs = path.join(current.abs, entry.name);
      const entryRel = current.rel
        ? path.join(current.rel, entry.name)
        : entry.name;

      if (entry.isDirectory()) {
        stack.push({ abs: entryAbs, rel: entryRel });
        const folderNode: TreeNode = {
          name: entry.name,
          path: toPosix(entryRel),
          type: "folder",
          children: [],
        };
        if (parentNode?.children) {
          parentNode.children.push(folderNode);
        }
        nodeByRel.set(entryRel, folderNode);
        const depth = entryRel.split(path.sep).filter(Boolean).length;
        if (depth === 1 && !collections.has(entryRel)) {
          collections.set(entryRel, {
            name: entry.name,
            path: toPosix(entryRel),
            pages: 0,
            updatedAt: null,
          });
        }
        continue;
      }

      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;

      const stats = await direntStat(entryAbs);
      if (!stats) continue;

      if (parentNode?.children) {
        parentNode.children.push({
          name: entry.name,
          path: toPosix(entryRel),
          type: "file",
        });
      }

      const updatedAt = stats.mtimeMs;
      const relPosix = toPosix(entryRel);
      addRecent(recentPages, {
        name: entry.name,
        path: relPosix,
        updatedAt,
      });

      const segments = entryRel.split(path.sep).filter(Boolean);
      if (segments.length > 1) {
        const top = segments[0];
        const collection = collections.get(top);
        if (collection) {
          collection.pages += 1;
          if (!collection.updatedAt || updatedAt > collection.updatedAt) {
            collection.updatedAt = updatedAt;
          }
        }
      }
    }
  }

  recentPages.sort((a, b) => b.updatedAt - a.updatedAt);
  sortTree(rootNode);

  return {
    root,
    collections: Array.from(collections.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    ),
    recentPages,
    tree: rootNode,
    rootMissing: false,
  };
}

async function direntStat(absPath: string) {
  try {
    return await stat(absPath);
  } catch {
    return null;
  }
}

function ensureWatcher(root: string) {
  if (!watchSupported) return;
  if (watcher && watcherRoot === root) return;

  watcher?.close();
  watcher = null;
  watcherRoot = null;

  try {
    watcher = watch(
      root,
      { recursive: true },
      () => {
        cache = null;
      },
    );
    watcherRoot = root;
  } catch {
    watchSupported = false;
    cache = null;
    watcher?.close();
    watcher = null;
    watcherRoot = null;
  }
}

function sortTree(node: TreeNode) {
  if (!node.children) return;
  node.children.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === "folder" ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
  for (const child of node.children) {
    sortTree(child);
  }
}

export async function getLibrarySnapshot(): Promise<LibrarySnapshot> {
  const { libraryRoot } = await getFoliaConfig();
  const root = path.resolve(libraryRoot);

  if (watchSupported && cache?.root === root) {
    return cache.snapshot;
  }

  if (inflight) {
    return inflight;
  }

  inflight = scanLibrary(root).then((snapshot) => {
    if (watchSupported) {
      cache = { root, snapshot };
      ensureWatcher(root);
    }
    inflight = null;
    return snapshot;
  });

  return inflight;
}
