#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const koPath = path.join(root, "src/i18n/locales/ko.json");
const allowlistPath = path.join(__dirname, "ko-ascii-allowlist.json");

const koMessages = JSON.parse(fs.readFileSync(koPath, "utf8"));
const allowlist = new Set(JSON.parse(fs.readFileSync(allowlistPath, "utf8")));

const asciiOnly = /^[\x00-\x7F]+$/;
const issues = [];

for (const [key, value] of Object.entries(koMessages)) {
  if (typeof value !== "string") continue;
  const trimmed = value.trim();
  if (!trimmed) continue;
  if (!asciiOnly.test(trimmed)) continue;
  if (allowlist.has(trimmed)) continue;
  if (/^[0-9\s.,:%/+\-()]+$/.test(trimmed)) continue;
  issues.push({ key, value: trimmed });
}

if (issues.length > 0) {
  console.error(
    `[i18n] Korean consistency check failed: ${issues.length} ASCII-only values.`,
  );
  for (const issue of issues) {
    console.error(`- ${issue.key}: ${issue.value}`);
  }
  process.exit(1);
}

console.log("[i18n] Korean consistency check passed.");
