import { cookies } from "next/headers";

import { getLibrarySnapshot } from "@/lib/fs/library";
import LibraryClient from "@/app/LibraryClient";
import { getAuthenticatedUsername, requireAuth } from "@/lib/auth/guard";
import { readUserData } from "@/lib/auth/user-data";

export default async function Home() {
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
  const snapshot = await getLibrarySnapshot();
  return (
    <LibraryClient
      snapshot={snapshot}
      initialCollapsed={initialCollapsed}
      initialTheme={initialTheme}
    />
  );
}
