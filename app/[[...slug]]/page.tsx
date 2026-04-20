import { notFound } from "next/navigation";
import { access } from "node:fs/promises";
import path from "node:path";

import { loadPageContent } from "@/app/library/actions";
import LibraryClient from "@/app/LibraryClient";
import { getSharedLibraryPageData } from "@/app/library/server/page-data";
import { getFoliaConfig } from "@/lib/config";
import { notePathCandidates } from "@/lib/encrypted-note";

type LibraryPageProps = {
  params: Promise<{
    slug?: string[];
  }>;
};

export default async function LibraryPage({ params }: LibraryPageProps) {
  const { initialTheme, initialCollapsed, snapshot, vaultState } =
    await getSharedLibraryPageData();
  const resolvedParams = await params;
  const slug = resolvedParams.slug ?? [];

  if (slug.length === 0) {
    return (
      <LibraryClient
        snapshot={snapshot}
        initialCollapsed={initialCollapsed}
        initialTheme={initialTheme}
        initialVaultState={vaultState}
      />
    );
  }

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

  const result = await loadPageContent(relativePath);
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
