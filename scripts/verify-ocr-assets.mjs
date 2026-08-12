import { readFile } from "node:fs/promises";
import path from "node:path";

import { assetMappings, digest, expectedPackages, root, vendorRoot } from "./ocr-assets.mjs";

const manifest = JSON.parse(await readFile(path.join(vendorRoot, "manifest.json"), "utf8"));
if (manifest.schemaVersion !== 1) throw new Error("Unsupported OCR asset manifest schema.");

for (const [packageName, expectedVersion] of Object.entries(expectedPackages)) {
  const installed = JSON.parse(
    await readFile(path.join(root, "node_modules", packageName, "package.json"), "utf8"),
  ).version;
  if (installed !== expectedVersion || manifest.packages[packageName] !== expectedVersion) {
    throw new Error(`${packageName} version mismatch in installed packages or OCR manifest.`);
  }
}

for (const mapping of assetMappings) {
  const recorded = manifest.assets.find((asset) => asset.path === mapping.target);
  if (!recorded) throw new Error(`OCR manifest is missing ${mapping.target}`);
  const source = await digest(path.join(root, mapping.source));
  const target = await digest(path.join(vendorRoot, mapping.target));
  if (
    source.sha256 !== target.sha256 ||
    target.sha256 !== recorded.sha256 ||
    target.size !== recorded.size
  ) {
    throw new Error(`${mapping.target} differs from its locked package source or manifest hash.`);
  }
}

if (manifest.assets.length !== assetMappings.length) {
  throw new Error("OCR manifest contains an unexpected number of assets.");
}

console.log(
  `Verified ${assetMappings.length} self-hosted OCR assets against locked package bytes.`,
);
