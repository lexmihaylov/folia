import { readFile } from "node:fs/promises";
import path from "node:path";

export type FoliaConfig = {
  libraryRoot: string;
};

const CONFIG_PATH = path.join(process.cwd(), "folia.config.json");

export async function getFoliaConfig(): Promise<FoliaConfig> {
  const raw = await readFile(CONFIG_PATH, "utf-8");
  const parsed = JSON.parse(raw) as Partial<FoliaConfig>;

  if (!parsed.libraryRoot || typeof parsed.libraryRoot !== "string") {
    throw new Error("folia.config.json must set a string 'libraryRoot'.");
  }

  return {
    libraryRoot: path.resolve(parsed.libraryRoot),
  };
}
