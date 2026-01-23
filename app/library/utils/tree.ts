import type { TreeNode } from "@/lib/fs/library";

export function insertNode(
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

export function renameNode(
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

export function renameSubtree(
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

export function removeNode(node: TreeNode, targetPath: string): TreeNode {
  if (!node.children) return node;
  const nextChildren = node.children
    .filter((child) => child.path !== targetPath)
    .map((child) =>
      child.type === "folder" ? removeNode(child, targetPath) : child,
    );
  return { ...node, children: nextChildren };
}

export function renameFileNode(
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

export function findNode(node: TreeNode, targetPath: string): TreeNode | null {
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

export function cloneNode(
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

export function filterTree(
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
