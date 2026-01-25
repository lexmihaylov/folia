const { execSync, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const releaseType = process.argv[2];
const allowed = new Set(["major", "minor", "patch"]);

if (!allowed.has(releaseType)) {
  console.error("Usage: node scripts/update-changelog.js <major|minor|patch>");
  process.exit(1);
}

const rootDir = path.resolve(__dirname, "..");
const pkgPath = path.join(rootDir, "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const currentVersion = pkg.version || "0.0.0";

const bumpVersion = (version, type) => {
  const [major = "0", minor = "0", patch = "0"] = version.split(".");
  const next = [Number(major), Number(minor), Number(patch)];

  if (type === "major") {
    next[0] += 1;
    next[1] = 0;
    next[2] = 0;
  } else if (type === "minor") {
    next[1] += 1;
    next[2] = 0;
  } else {
    next[2] += 1;
  }

  return next.join(".");
};

const run = (command) =>
  execSync(command, { cwd: rootDir, encoding: "utf8" }).trim();

let previousTag = "";
try {
  previousTag = run("git describe --tags --abbrev=0");
} catch (error) {
  previousTag = "";
}

const range = previousTag ? `${previousTag}..HEAD` : "HEAD";
let commits = "";
try {
  commits = run(`git log ${range} --no-merges --pretty=format:%h %s`);
} catch (error) {
  commits = "";
}

const nextVersion = bumpVersion(currentVersion, releaseType);
const today = new Date().toISOString().slice(0, 10);
const prompt = [
  "You are updating lib/changelog.ts in this repo.",
  `Release type: ${releaseType}.`,
  `Next version: ${nextVersion}.`,
  `Date for entry: ${today}.`,
  previousTag
    ? `Previous tag: ${previousTag}.`
    : "Previous tag: none (first release).",
  "Analyze the commits below and update lib/changelog.ts accordingly:",
  "- Add a new changelog entry at the top for the next version and date.",
  "- Summarize changes into sections like Added/Improved/Fixed/Changed/Removed as appropriate.",
  "- Keep items concise, user-facing, and derived from commit messages.",
  "- Keep the file format and typing intact.",
  "- Do not modify any other files.",
  "Commits:",
  commits ? commits : "(no commits found in range)",
].join("\n");

const result = spawnSync("codex", ["-e", prompt], {
  cwd: rootDir,
  stdio: "inherit",
});

if (result.error) {
  console.error("Failed to run codex:", result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 0);
