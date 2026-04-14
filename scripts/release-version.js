#!/usr/bin/env node
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const releaseType = process.argv[2];
const allowed = new Set(["major", "minor", "patch"]);

if (!allowed.has(releaseType)) {
  console.error("Usage: node scripts/release-version.js <major|minor|patch>");
  process.exit(1);
}

const rootDir = path.resolve(__dirname, "..");
const pkgPath = path.join(rootDir, "package.json");

function run(command, args, options = {}) {
  execFileSync(command, args, {
    cwd: rootDir,
    stdio: "inherit",
    ...options,
  });
}

function readVersion() {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  return pkg.version || "0.0.0";
}

const currentVersion = readVersion();

run("node", [path.join("scripts", "update-changelog.js"), releaseType]);
run("npm", ["version", releaseType, "--no-git-tag-version"]);

const nextVersion = readVersion();

if (nextVersion === currentVersion) {
  console.error("Version did not change.");
  process.exit(1);
}

run("git", ["add", "package.json", "package-lock.json", "lib/changelog.ts"]);
run("git", ["commit", "-m", `chore(release): v${nextVersion}`]);
run("git", ["tag", `v${nextVersion}`]);
run("git", ["push"]);
run("git", ["push", "--tags"]);
