import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requiredFiles = [
  "LICENSE",
  "README.md",
  "README.zh-CN.md",
  "SECURITY.md",
  "docs/acceptance.md",
  "docs/architecture.md",
  "docs/research.md",
  "docs/tbradar-workbench.png",
  ".github/workflows/ci.yml",
  ".github/workflows/pages.yml",
  "public/vendor/tesseract/manifest.json",
  "public/vendor/tesseract/lang/eng.traineddata.gz",
  "public/assets/used-bookstore-reader.png",
  "public/examples/sample-reading-list.csv",
  "public/examples/sample-shelf.svg",
];

async function exists(relativePath) {
  try {
    const details = await stat(path.join(root, relativePath));
    return details.isFile() && details.size > 0;
  } catch {
    return false;
  }
}

async function walk(directory) {
  const output = [];
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (
      [
        ".git",
        "coverage",
        "dist",
        "node_modules",
        "playwright-report",
        "release",
        "test-results",
      ].includes(entry.name)
    ) {
      continue;
    }
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...(await walk(fullPath)));
    else output.push(fullPath);
  }
  return output;
}

const failures = [];
for (const relativePath of requiredFiles) {
  if (!(await exists(relativePath)))
    failures.push(`missing or empty required file: ${relativePath}`);
}

const appSource = await readFile(path.join(root, "src/App.tsx"), "utf8");
const ocrSource = await readFile(path.join(root, "src/core/ocr.ts"), "utf8");
if (!appSource.includes("recognizeShelfImage")) failures.push("the UI is not wired to real OCR");
if (!ocrSource.includes('createWorker("eng"')) failures.push("the OCR worker is not configured");
if (!["workerPath", "corePath", "langPath"].every((option) => ocrSource.includes(option))) {
  failures.push("the OCR worker does not pin all self-hosted asset paths");
}
if (/https?:|cdn\.jsdelivr/i.test(ocrSource)) {
  failures.push("the OCR module contains an external runtime URL");
}
const applicationSources = `${appSource}\n${ocrSource}`;
const withoutLocalSampleFetches = applicationSources.replace(/fetch\(assetUrl\([^)]*\)\)/g, "");
if (/\b(fetch|XMLHttpRequest|axios|FormData)\b/.test(withoutLocalSampleFetches)) {
  failures.push("application source contains a possible photo-upload primitive");
}
if (/[\u2013\u2014]/u.test(appSource))
  failures.push("user-facing App copy contains an en or em dash");
if (/\b(lorem ipsum|coming soon|placeholder feature)\b/i.test(appSource)) {
  failures.push("user-facing App copy contains placeholder content");
}

const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
];
const textExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".ts",
  ".tsx",
  ".yml",
  ".yaml",
]);
for (const fullPath of await walk(root)) {
  if (!textExtensions.has(path.extname(fullPath)) || fullPath.endsWith("package-lock.json"))
    continue;
  const contents = await readFile(fullPath, "utf8");
  if (secretPatterns.some((pattern) => pattern.test(contents))) {
    failures.push(`possible committed secret: ${path.relative(root, fullPath)}`);
  }
}

if (failures.length) {
  console.error("Static release checks failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `Static release checks passed (${requiredFiles.length} required files, no upload primitive, no obvious secrets).`,
);
