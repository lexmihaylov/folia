"use server";

import {
  cp,
  copyFile,
  mkdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

import { getFoliaConfig } from "@/lib/config";
import { isAuthenticated } from "@/lib/auth/guard";

type ActionResult =
  | {
      ok: true;
      path: string;
      name: string;
      createdAt?: number | null;
      updatedAt?: number | null;
    }
  | { ok: false; error: string };

const execFileAsync = promisify(execFile);

async function requireActionAuth(): Promise<ActionResult | null> {
  const ok = await isAuthenticated();
  if (!ok) {
    return { ok: false, error: "unauthorized" };
  }
  return null;
}

function toFileMeta(stats: { birthtimeMs: number; mtimeMs: number }) {
  const createdAt =
    Number.isFinite(stats.birthtimeMs) && stats.birthtimeMs > 0
      ? stats.birthtimeMs
      : null;
  const updatedAt =
    Number.isFinite(stats.mtimeMs) && stats.mtimeMs > 0
      ? stats.mtimeMs
      : null;
  return { createdAt, updatedAt };
}

function normalizeSegment(input: string): string | null {
  const cleaned = input.trim().replace(/\\/g, "/");
  if (!cleaned) return null;
  if (cleaned.includes("/")) return null;
  if (cleaned === "." || cleaned === "..") return null;
  return cleaned;
}

function normalizeRelativePath(input: string): string | null {
  const cleaned = input.trim().replace(/\\/g, "/").replace(/^\/+/, "");
  if (!cleaned) return "";
  const parts = cleaned.split("/").filter(Boolean);
  for (const part of parts) {
    if (part === "." || part === "..") {
      return null;
    }
  }
  return parts.join("/");
}

function slugify(input: string): string {
  const cleaned = input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  return cleaned || "untitled";
}

function normalizeFileName(input: string): string | null {
  const segment = normalizeSegment(input);
  if (!segment) return null;
  const rawBase = segment.endsWith(".md") ? segment.slice(0, -3) : segment;
  const slug = slugify(rawBase);
  return `${slug}.md`;
}

function buildFolderPath(parentPath: string, name: string): string | null {
  const segment = normalizeSegment(name);
  if (!segment) return null;
  const relativeParent = normalizeRelativePath(parentPath);
  if (relativeParent === null) return null;
  return relativeParent ? path.posix.join(relativeParent, segment) : segment;
}

function buildFilePath(parentPath: string, name: string): string | null {
  const fileName = normalizeFileName(name);
  if (!fileName) return null;
  const relativeParent = normalizeRelativePath(parentPath);
  if (relativeParent === null) return null;
  return relativeParent ? path.posix.join(relativeParent, fileName) : fileName;
}

async function resolveTarget(root: string, relativePath: string) {
  const resolvedRoot = path.resolve(root);
  const target = path.resolve(path.join(resolvedRoot, relativePath));
  if (!target.startsWith(resolvedRoot + path.sep) && target !== resolvedRoot) {
    throw new Error("invalid-path");
  }
  return target;
}

function toPosixPath(input: string): string {
  return input.split(path.sep).join(path.posix.sep);
}

export async function createFolderInline(
  parentPath: string,
  name: string,
): Promise<ActionResult> {
  const authError = await requireActionAuth();
  if (authError) return authError;
  const segment = normalizeSegment(name);
  if (!segment) return { ok: false, error: "invalid-name" };

  const relativeParent = normalizeRelativePath(parentPath);
  if (relativeParent === null) return { ok: false, error: "invalid-path" };

  const relativePath = relativeParent
    ? path.posix.join(relativeParent, segment)
    : segment;

  const { libraryRoot } = await getFoliaConfig();
  let targetDir: string;
  try {
    targetDir = await resolveTarget(libraryRoot, relativePath);
  } catch {
    return { ok: false, error: "invalid-path" };
  }

  try {
    await stat(targetDir);
    return { ok: false, error: "exists" };
  } catch {
    // Ignore missing path.
  }

  try {
    await mkdir(targetDir, { recursive: true });
  } catch {
    return { ok: false, error: "write-failed" };
  }

  return {
    ok: true,
    path: relativePath,
    name: segment,
  };
}

export async function renameFolderInline(
  targetPath: string,
  newName: string,
): Promise<ActionResult> {
  const authError = await requireActionAuth();
  if (authError) return authError;
  const safeTarget = normalizeRelativePath(targetPath);
  if (safeTarget === null || safeTarget === "") {
    return { ok: false, error: "invalid-path" };
  }
  const segment = normalizeSegment(newName);
  if (!segment) return { ok: false, error: "invalid-name" };

  const parent = path.posix.dirname(safeTarget);
  const nextPath =
    parent === "." ? segment : path.posix.join(parent, segment);

  const { libraryRoot } = await getFoliaConfig();
  let fromPath: string;
  let toPath: string;
  try {
    fromPath = await resolveTarget(libraryRoot, safeTarget);
    toPath = await resolveTarget(libraryRoot, nextPath);
  } catch {
    return { ok: false, error: "invalid-path" };
  }

  try {
    await stat(toPath);
    return { ok: false, error: "exists" };
  } catch {
    // ok if missing
  }

  try {
    await rename(fromPath, toPath);
  } catch {
    return { ok: false, error: "write-failed" };
  }

  return { ok: true, path: nextPath, name: segment };
}

export async function renameFileInline(
  targetPath: string,
  newName: string,
): Promise<ActionResult> {
  const authError = await requireActionAuth();
  if (authError) return authError;
  const safeTarget = normalizeRelativePath(targetPath);
  if (safeTarget === null || safeTarget === "" || !safeTarget.endsWith(".md")) {
    return { ok: false, error: "invalid-path" };
  }
  const segment = normalizeSegment(newName);
  if (!segment) return { ok: false, error: "invalid-name" };

  const parent = path.posix.dirname(safeTarget);
  const baseName = segment.endsWith(".md") ? segment.slice(0, -3) : segment;
  const slug = slugify(baseName);
  const nextFile = `${slug}.md`;
  const nextPath =
    parent === "." ? nextFile : path.posix.join(parent, nextFile);

  const { libraryRoot } = await getFoliaConfig();
  let fromPath: string;
  let toPath: string;
  try {
    fromPath = await resolveTarget(libraryRoot, safeTarget);
    toPath = await resolveTarget(libraryRoot, nextPath);
  } catch {
    return { ok: false, error: "invalid-path" };
  }

  try {
    await stat(toPath);
    return { ok: false, error: "exists" };
  } catch {
    // ok if missing
  }

  try {
    await rename(fromPath, toPath);
  } catch {
    return { ok: false, error: "write-failed" };
  }

  return { ok: true, path: nextPath, name: nextFile };
}

export async function deleteFolderInline(
  targetPath: string,
): Promise<ActionResult> {
  const authError = await requireActionAuth();
  if (authError) return authError;
  const safeTarget = normalizeRelativePath(targetPath);
  if (safeTarget === null || safeTarget === "") {
    return { ok: false, error: "invalid-path" };
  }

  const { libraryRoot } = await getFoliaConfig();
  let targetDir: string;
  try {
    targetDir = await resolveTarget(libraryRoot, safeTarget);
  } catch {
    return { ok: false, error: "invalid-path" };
  }

  try {
    await rm(targetDir, { recursive: true });
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    return { ok: false, error: "write-failed" };
  }

  return { ok: true, path: safeTarget, name: path.basename(safeTarget) };
}

export async function deleteFileInline(
  targetPath: string,
): Promise<ActionResult> {
  const authError = await requireActionAuth();
  if (authError) return authError;
  const safeTarget = normalizeRelativePath(targetPath);
  if (safeTarget === null || safeTarget === "" || !safeTarget.endsWith(".md")) {
    return { ok: false, error: "invalid-path" };
  }

  const { libraryRoot } = await getFoliaConfig();
  let targetFile: string;
  try {
    targetFile = await resolveTarget(libraryRoot, safeTarget);
  } catch {
    return { ok: false, error: "invalid-path" };
  }

  try {
    await rm(targetFile);
  } catch {
    return { ok: false, error: "write-failed" };
  }

  return { ok: true, path: safeTarget, name: path.basename(safeTarget) };
}

export async function createPageInline(
  parentPath: string,
  name: string,
): Promise<ActionResult> {
  const authError = await requireActionAuth();
  if (authError) return authError;
  const relativePath = buildFilePath(parentPath, name);
  if (!relativePath) return { ok: false, error: "invalid-name" };

  const { libraryRoot } = await getFoliaConfig();
  let filePath: string;
  try {
    filePath = await resolveTarget(libraryRoot, relativePath);
  } catch {
    return { ok: false, error: "invalid-path" };
  }

  try {
    await writeFile(filePath, "", { flag: "wx" });
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "EEXIST") return { ok: false, error: "exists" };
    return { ok: false, error: "write-failed" };
  }

  let meta: { createdAt: number | null; updatedAt: number | null } = {
    createdAt: null,
    updatedAt: null,
  };
  try {
    meta = toFileMeta(await stat(filePath));
  } catch {
    // Best-effort metadata.
  }

  return {
    ok: true,
    path: relativePath,
    name: path.posix.basename(relativePath),
    ...meta,
  };
}

export async function copyFolderInline(
  sourcePath: string,
  parentPath: string,
  name: string,
): Promise<ActionResult> {
  const authError = await requireActionAuth();
  if (authError) return authError;
  const safeSource = normalizeRelativePath(sourcePath);
  if (safeSource === null || safeSource === "") {
    return { ok: false, error: "invalid-path" };
  }
  const relativePath = buildFolderPath(parentPath, name);
  if (!relativePath) return { ok: false, error: "invalid-name" };
  if (relativePath === safeSource) {
    return { ok: false, error: "exists" };
  }
  if (relativePath.startsWith(safeSource + "/")) {
    return { ok: false, error: "invalid-path" };
  }

  const { libraryRoot } = await getFoliaConfig();
  let sourceDir: string;
  let targetDir: string;
  try {
    sourceDir = await resolveTarget(libraryRoot, safeSource);
    targetDir = await resolveTarget(libraryRoot, relativePath);
  } catch {
    return { ok: false, error: "invalid-path" };
  }

  try {
    const stats = await stat(sourceDir);
    if (!stats.isDirectory()) {
      return { ok: false, error: "invalid-path" };
    }
  } catch {
    return { ok: false, error: "invalid-path" };
  }

  try {
    await stat(targetDir);
    return { ok: false, error: "exists" };
  } catch {
    // ok if missing
  }

  try {
    await cp(sourceDir, targetDir, { recursive: true });
  } catch {
    return { ok: false, error: "write-failed" };
  }

  return {
    ok: true,
    path: relativePath,
    name: path.posix.basename(relativePath),
  };
}

export async function moveFolderInline(
  sourcePath: string,
  parentPath: string,
  name: string,
): Promise<ActionResult> {
  const authError = await requireActionAuth();
  if (authError) return authError;
  const safeSource = normalizeRelativePath(sourcePath);
  if (safeSource === null || safeSource === "") {
    return { ok: false, error: "invalid-path" };
  }
  const relativePath = buildFolderPath(parentPath, name);
  if (!relativePath) return { ok: false, error: "invalid-name" };
  if (relativePath === safeSource) {
    return { ok: false, error: "exists" };
  }
  if (relativePath.startsWith(safeSource + "/")) {
    return { ok: false, error: "invalid-path" };
  }

  const { libraryRoot } = await getFoliaConfig();
  let fromPath: string;
  let toPath: string;
  try {
    fromPath = await resolveTarget(libraryRoot, safeSource);
    toPath = await resolveTarget(libraryRoot, relativePath);
  } catch {
    return { ok: false, error: "invalid-path" };
  }

  try {
    await stat(toPath);
    return { ok: false, error: "exists" };
  } catch {
    // ok if missing
  }

  try {
    await rename(fromPath, toPath);
  } catch {
    return { ok: false, error: "write-failed" };
  }

  return {
    ok: true,
    path: relativePath,
    name: path.posix.basename(relativePath),
  };
}

export async function copyFileInline(
  sourcePath: string,
  parentPath: string,
  name: string,
): Promise<ActionResult> {
  const authError = await requireActionAuth();
  if (authError) return authError;
  const safeSource = normalizeRelativePath(sourcePath);
  if (safeSource === null || !safeSource.endsWith(".md")) {
    return { ok: false, error: "invalid-path" };
  }
  const relativePath = buildFilePath(parentPath, name);
  if (!relativePath) return { ok: false, error: "invalid-name" };
  if (relativePath === safeSource) {
    return { ok: false, error: "exists" };
  }

  const { libraryRoot } = await getFoliaConfig();
  let sourceFile: string;
  let targetFile: string;
  try {
    sourceFile = await resolveTarget(libraryRoot, safeSource);
    targetFile = await resolveTarget(libraryRoot, relativePath);
  } catch {
    return { ok: false, error: "invalid-path" };
  }

  try {
    const stats = await stat(sourceFile);
    if (!stats.isFile()) {
      return { ok: false, error: "invalid-path" };
    }
  } catch {
    return { ok: false, error: "invalid-path" };
  }

  try {
    await stat(targetFile);
    return { ok: false, error: "exists" };
  } catch {
    // ok if missing
  }

  try {
    await copyFile(sourceFile, targetFile);
  } catch {
    return { ok: false, error: "write-failed" };
  }

  return {
    ok: true,
    path: relativePath,
    name: path.posix.basename(relativePath),
  };
}

export async function moveFileInline(
  sourcePath: string,
  parentPath: string,
  name: string,
): Promise<ActionResult> {
  const authError = await requireActionAuth();
  if (authError) return authError;
  const safeSource = normalizeRelativePath(sourcePath);
  if (safeSource === null || !safeSource.endsWith(".md")) {
    return { ok: false, error: "invalid-path" };
  }
  const relativePath = buildFilePath(parentPath, name);
  if (!relativePath) return { ok: false, error: "invalid-name" };
  if (relativePath === safeSource) {
    return { ok: false, error: "exists" };
  }

  const { libraryRoot } = await getFoliaConfig();
  let fromPath: string;
  let toPath: string;
  try {
    fromPath = await resolveTarget(libraryRoot, safeSource);
    toPath = await resolveTarget(libraryRoot, relativePath);
  } catch {
    return { ok: false, error: "invalid-path" };
  }

  try {
    await stat(toPath);
    return { ok: false, error: "exists" };
  } catch {
    // ok if missing
  }

  try {
    await rename(fromPath, toPath);
  } catch {
    return { ok: false, error: "write-failed" };
  }

  return {
    ok: true,
    path: relativePath,
    name: path.posix.basename(relativePath),
  };
}

export async function loadPageContent(
  relativePath: string,
): Promise<ActionResult & { content?: string }> {
  const authError = await requireActionAuth();
  if (authError) return authError;
  const safePath = normalizeRelativePath(relativePath);
  if (safePath === null || !safePath.endsWith(".md")) {
    return { ok: false, error: "invalid-path" };
  }

  const { libraryRoot } = await getFoliaConfig();
  let filePath: string;
  try {
    filePath = await resolveTarget(libraryRoot, safePath);
  } catch {
    return { ok: false, error: "invalid-path" };
  }

  try {
    const content = await readFile(filePath, "utf-8");
    let meta: { createdAt: number | null; updatedAt: number | null } = {
      createdAt: null,
      updatedAt: null,
    };
    try {
      meta = toFileMeta(await stat(filePath));
    } catch {
      // Best-effort metadata.
    }
    return {
      ok: true,
      path: safePath,
      name: path.basename(safePath),
      content,
      ...meta,
    };
  } catch {
    return { ok: false, error: "read-failed" };
  }
}

export async function savePageContent(
  relativePath: string,
  content: string,
): Promise<ActionResult> {
  const authError = await requireActionAuth();
  if (authError) return authError;
  const safePath = normalizeRelativePath(relativePath);
  if (safePath === null || !safePath.endsWith(".md")) {
    return { ok: false, error: "invalid-path" };
  }

  const { libraryRoot } = await getFoliaConfig();
  let filePath: string;
  try {
    filePath = await resolveTarget(libraryRoot, safePath);
  } catch {
    return { ok: false, error: "invalid-path" };
  }

  try {
    await writeFile(filePath, content, "utf-8");
  } catch {
    return { ok: false, error: "write-failed" };
  }

  let meta: { createdAt: number | null; updatedAt: number | null } = {
    createdAt: null,
    updatedAt: null,
  };
  try {
    meta = toFileMeta(await stat(filePath));
  } catch {
    // Best-effort metadata.
  }
  return { ok: true, path: safePath, name: path.basename(safePath), ...meta };
}

export async function searchPages(
  query: string,
): Promise<
  { ok: true; matches: string[] } | { ok: false; error: string }
> {
  const authError = await requireActionAuth();
  if (authError) {
    return { ok: false, error: "unauthorized" };
  }
  const trimmed = query.trim();
  if (!trimmed) return { ok: true, matches: [] };
  if (trimmed.includes("\n") || trimmed.includes("\r")) {
    return { ok: false, error: "invalid-query" };
  }

  const { libraryRoot } = await getFoliaConfig();
  let stdout = "";
  try {
    const result = await execFileAsync(
      "grep",
      ["-RIn", "-F", "-m", "1", "--include=*.md", trimmed, libraryRoot],
      { maxBuffer: 1024 * 1024 },
    );
    stdout = result.stdout || "";
  } catch (error) {
    const err = error as NodeJS.ErrnoException & { stdout?: string };
    if (err.code === "1") {
      return { ok: true, matches: [] };
    }
    if (typeof err.stdout === "string") {
      stdout = err.stdout;
    } else {
      return { ok: false, error: "read-failed" };
    }
  }

  const matches = new Set<string>();
  const lines = stdout.split("\n").filter(Boolean);
  for (const line of lines) {
    const splitAt = line.indexOf(":");
    if (splitAt === -1) continue;
    const absPath = line.slice(0, splitAt);
    const rel = path.relative(libraryRoot, absPath);
    if (!rel || rel.startsWith("..")) continue;
    if (!rel.endsWith(".md")) continue;
    matches.add(toPosixPath(rel));
    if (matches.size >= 200) break;
  }

  return { ok: true, matches: Array.from(matches) };
}
