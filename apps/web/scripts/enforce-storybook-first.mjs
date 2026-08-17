#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, "..");

const registryPath = path.join(__dirname, "storybook-poc-registry.json");
const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));

const toPosix = (input) => input.replace(/\\/g, "/");

const getDiffBase = () => {
  if (process.env.BASE_SHA) return process.env.BASE_SHA;

  try {
    return execSync("git merge-base HEAD origin/main", {
      cwd: appRoot,
      encoding: "utf8",
    }).trim();
  } catch {
    return "HEAD~1";
  }
};

const getChangedFiles = () => {
  const base = getDiffBase();
  const head = process.env.HEAD_SHA || "HEAD";

  const raw = execSync(`git diff --name-only ${base}...${head}`, {
    cwd: appRoot,
    encoding: "utf8",
  });

  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => toPosix(line.replace(/^apps\/web\//, "")));
};

const changedFiles = new Set(getChangedFiles());
const violations = [];

for (const [productionPath, pocPath] of Object.entries(registry)) {
  const prodChanged = changedFiles.has(productionPath);
  if (!prodChanged) continue;

  if (!changedFiles.has(pocPath)) {
    violations.push(
      `Production file changed without matching POC story: ${productionPath} -> ${pocPath}`,
    );
  }
}

const storybookDir = process.env.SB_BUILD_DIR;

if (storybookDir && fs.existsSync(storybookDir)) {
  const indexJsonPath = path.join(storybookDir, "index.json");
  const storiesJsonPath = path.join(storybookDir, "stories.json");
  const manifestPath = fs.existsSync(indexJsonPath)
    ? indexJsonPath
    : fs.existsSync(storiesJsonPath)
      ? storiesJsonPath
      : null;

  if (manifestPath) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    // Storybook 10 uses `entries`; older builds used `stories`.
    const stories = manifest.stories || manifest.entries || {};
    const importPaths = new Set(
      Object.values(stories)
        .map((entry) => entry?.importPath)
        .filter(Boolean)
        .map((p) => toPosix(String(p).replace(/^\.\//, ""))),
    );

    for (const [productionPath, pocPath] of Object.entries(registry)) {
      if (!changedFiles.has(productionPath)) continue;

      const compiled = Array.from(importPaths).some((p) => p.endsWith(pocPath));
      if (!compiled) {
        violations.push(
          `POC story not found in Storybook manifest: ${pocPath} (for ${productionPath})`,
        );
      }
    }
  }
}

if (violations.length > 0) {
  console.error("[gate] Storybook-first enforcement failed.");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log("[gate] Storybook-first enforcement passed.");
