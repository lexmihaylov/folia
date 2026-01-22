import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { getFoliaConfig } from "@/lib/config";

type UserData = {
  collapsed?: string[];
  theme?: "light" | "dark";
};

async function userFile(username: string) {
  const { libraryRoot } = await getFoliaConfig();
  return path.join(libraryRoot, `.folia-${username}.json`);
}

export async function readUserData(username: string): Promise<UserData> {
  try {
    const raw = await readFile(await userFile(username), "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as UserData;
  } catch {
    return {};
  }
}

export async function writeUserData(
  username: string,
  nextData: UserData,
): Promise<void> {
  const payload = JSON.stringify(nextData, null, 2);
  await writeFile(await userFile(username), payload, "utf-8");
}

export async function setCollapsedState(
  username: string,
  collapsed: string[],
): Promise<void> {
  const data = await readUserData(username);
  await writeUserData(username, { ...data, collapsed });
}

export async function setThemePreference(
  username: string,
  theme: "light" | "dark",
): Promise<void> {
  const data = await readUserData(username);
  await writeUserData(username, { ...data, theme });
}
