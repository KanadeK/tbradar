import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

import { unzipSync } from "fflate";

import { buildPackage } from "./package-release.mjs";

const temporaryRoot = await mkdtemp(path.join(tmpdir(), "tbradar-determinism-"));
const firstDirectory = path.join(temporaryRoot, "first");
const secondDirectory = path.join(temporaryRoot, "second");

try {
  const first = await buildPackage(firstDirectory);
  await delay(1_200);
  const second = await buildPackage(secondDirectory);
  const firstBytes = await readFile(path.join(firstDirectory, first.archiveName));
  const secondBytes = await readFile(path.join(secondDirectory, second.archiveName));

  if (first.archiveName !== second.archiveName || !firstBytes.equals(secondBytes)) {
    throw new Error(
      `release archives differ across separated runs: ${first.digest} != ${second.digest}`,
    );
  }

  const names = Object.keys(unzipSync(new Uint8Array(firstBytes))).sort();
  for (const required of [
    "tbradar/index.html",
    "tbradar/manifest.webmanifest",
    "tbradar/LICENSE",
    "tbradar/README.md",
    "tbradar/README.zh-CN.md",
    "tbradar/THIRD_PARTY_NOTICES.md",
    "tbradar/docs/acceptance.md",
  ]) {
    if (!names.includes(required)) throw new Error(`archive is missing ${required}`);
  }
  if (names.some((name) => !name.startsWith("tbradar/"))) {
    throw new Error("archive contains a path outside its tbradar root");
  }

  console.log(
    `Deterministic package verified: ${first.digest} (${names.length} entries, runs separated by 1.2s).`,
  );
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
