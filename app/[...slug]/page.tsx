import { notFound } from "next/navigation";
import { cookies } from "next/headers";

import { getLibrarySnapshot } from "@/lib/fs/library";
import { loadPageContent } from "@/app/library/actions";
import LibraryClient from "@/app/LibraryClient";
import { getAuthenticatedUsername, requireAuth } from "@/lib/auth/guard";
import { readUserData } from "@/lib/auth/user-data";

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
  const relativePath = rawPath.endsWith(".md") ? rawPath : `${rawPath}.md`;

  const [snapshot, result] = await Promise.all([
    getLibrarySnapshot(),
    loadPageContent(relativePath),
  ]);

  if (!result.ok || typeof result.content !== "string") {
    notFound();
  }

  return (
    <LibraryClient
      snapshot={snapshot}
      initialSelectedFile={{ path: result.path, name: result.name }}
      initialContent={result.content}
      initialMeta={{
        createdAt: result.createdAt ?? null,
        updatedAt: result.updatedAt ?? null,
      }}
      initialCollapsed={initialCollapsed}
      initialTheme={initialTheme}
    />
  );
}
