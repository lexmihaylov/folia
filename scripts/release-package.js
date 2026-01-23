#!/usr/bin/env node
const { spawnSync } = require("node:child_process");
const fs = require("node:fs/promises");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const bundleDir = path.join(distDir, "standalone");

function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, { stdio: "inherit", ...options });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${cmd} ${args.join(" ")}`);
  }
}

function hasTar() {
  const checker = process.platform === "win32" ? "where" : "which";
  const result = spawnSync(checker, ["tar"], { stdio: "ignore" });
  return result.status === 0;
}

async function copy(src, dest) {
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.cp(src, dest, { recursive: true });
}

async function removeIfExists(targetPath) {
  await fs.rm(targetPath, { force: true });
}

async function main() {
  await fs.rm(distDir, { recursive: true, force: true });
  run("npm", ["run", "build"], { cwd: rootDir });
  await fs.mkdir(path.join(bundleDir, ".next"), { recursive: true });
  await fs.mkdir(path.join(bundleDir, "scripts"), { recursive: true });

  await copy(path.join(rootDir, ".next", "standalone"), bundleDir);
  await copy(path.join(rootDir, ".next", "static"), path.join(bundleDir, ".next", "static"));
  await copy(
    path.join(rootDir, "folia.config.json"),
    path.join(bundleDir, "folia.config.json"),
  );
  await copy(
    path.join(rootDir, "scripts", "install-service.sh"),
    path.join(bundleDir, "scripts", "install-service.sh"),
  );
  await copy(
    path.join(rootDir, "scripts", "update-release.sh"),
    path.join(bundleDir, "scripts", "update-release.sh"),
  );
  await copy(
    path.join(rootDir, "scripts", "install-release.sh"),
    path.join(bundleDir, "scripts", "install-release.sh"),
  );

  await removeIfExists(path.join(bundleDir, "knowledgebase"));
  await removeIfExists(path.join(bundleDir, "credentials.json"));

  if (!hasTar()) {
    throw new Error("tar not found in PATH. Install tar to create the release archive.");
  }

  const pkg = require(path.join(rootDir, "package.json"));
  const version = pkg.version || "0.0.0";
  const archive = path.join(distDir, `folia-kb-standalone-${version}.tar.gz`);

  run("tar", ["-czf", archive, "-C", bundleDir, "."]);
  await fs.rm(bundleDir, { recursive: true, force: true });
  console.log(`Created ${archive}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
