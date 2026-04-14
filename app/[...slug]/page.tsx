import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { access } from "node:fs/promises";
import path from "node:path";

import { getLibrarySnapshot } from "@/lib/fs/library";
import { loadPageContent } from "@/app/library/actions";
import LibraryClient from "@/app/LibraryClient";
import { getVaultStateAction } from "@/app/auth/actions";
import { getAuthenticatedUsername, requireAuth } from "@/lib/auth/guard";
import { readUserData } from "@/lib/auth/user-data";
import { notePathCandidates } from "@/lib/encrypted-note";
import { getFoliaConfig } from "@/lib/config";

type DocumentPageProps = {
  params: Promise<{
    slug?: string[];
  }>;
};

export default async function DocumentPage({ params }: DocumentPageProps) {
  await requireAuth();
  const username = await getAuthenticatedUsername();
  const userData = username ? await readUserData(username) : {};
  const cookieStore = await cookies();
  const cookieTheme = cookieStore.get("folia-theme")?.value;
  const initialTheme =
    cookieTheme === "light" || cookieTheme === "dark"
      ? cookieTheme
      : userData.theme ?? null;
  const initialCollapsed = Array.isArray(userData.collapsed)
    ? userData.collapsed.filter((item) => typeof item === "string")
    : [];
  const resolvedParams = await params;
  const slug = resolvedParams.slug ?? [];
  const decodedSlug = slug.map((segment) => {
    try {
      return decodeURIComponent(segment);
    } catch {
      return segment;
    }
  });
  const rawPath = decodedSlug.join("/");
  const { libraryRoot } = await getFoliaConfig();
  const candidates = notePathCandidates(rawPath);
  let relativePath = candidates[0];
  for (const candidate of candidates) {
    try {
      await access(path.join(libraryRoot, candidate));
      relativePath = candidate;
      break;
    } catch {
      // Try the next candidate.
    }
  }

  const [snapshot, result, vaultState] = await Promise.all([
    getLibrarySnapshot(),
    loadPageContent(relativePath),
    getVaultStateAction(),
  ]);
  if (
    !result.ok &&
    result.error !== "vault-locked" &&
    result.error !== "vault-unconfigured"
  ) {
    notFound();
  }

  const initialSelectedFile = result.ok
    ? {
        path: result.path,
        name: result.name,
        isEncrypted: result.isEncrypted,
      }
    : {
        path: relativePath,
        name: path.basename(relativePath),
        isEncrypted: true,
      };

  return (
    <LibraryClient
      snapshot={snapshot}
      initialSelectedFile={initialSelectedFile}
      initialContent={result.ok ? result.content : ""}
      initialMeta={{
        createdAt: result.ok ? result.createdAt ?? null : null,
        updatedAt: result.ok ? result.updatedAt ?? null : null,
      }}
      initialCollapsed={initialCollapsed}
      initialTheme={initialTheme}
      initialVaultState={vaultState}
    />
  );
}
