import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { zipSync } from "fflate";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixedMtime = new Date(1980, 0, 1, 0, 0, 0);

async function filesBelow(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await filesBelow(fullPath)));
    else files.push(fullPath);
  }
  return files.sort((left, right) => left.localeCompare(right, "en"));
}

export async function buildPackage(outputDirectory) {
  const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
  const distDirectory = path.join(root, "dist");
  const distFiles = await filesBelow(distDirectory).catch(() => []);
  if (!distFiles.some((file) => path.basename(file) === "index.html")) {
    throw new Error("dist/index.html is missing. Run npm run build first.");
  }

  const archiveName = `tbradar-v${packageJson.version}-web.zip`;
  const entries = {};
  for (const file of distFiles) {
    const relative = path.relative(distDirectory, file).split(path.sep).join("/");
    entries[`tbradar/${relative}`] = [
      new Uint8Array(await readFile(file)),
      { level: 9, mtime: fixedMtime, os: 0, attrs: 0 },
    ];
  }
  for (const relative of [
    "LICENSE",
    "README.md",
    "README.zh-CN.md",
    "THIRD_PARTY_NOTICES.md",
    "docs/acceptance.md",
  ]) {
    const archivePath = `tbradar/${relative}`;
    entries[archivePath] = [
      new Uint8Array(await readFile(path.join(root, relative))),
      { level: 9, mtime: fixedMtime, os: 0, attrs: 0 },
    ];
  }

  const archive = zipSync(entries, { level: 9 });
  const digest = createHash("sha256").update(archive).digest("hex");
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(path.join(outputDirectory, archiveName), archive);
  await writeFile(path.join(outputDirectory, "SHA256SUMS"), `${digest}  ${archiveName}\n`);
  return { archiveName, digest, entries: Object.keys(entries).length, bytes: archive.length };
}

const isDirect =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirect) {
  const result = await buildPackage(path.join(root, "release"));
  console.log(
    `${result.archiveName}: ${result.bytes} bytes, ${result.entries} files, sha256 ${result.digest}`,
  );
}
