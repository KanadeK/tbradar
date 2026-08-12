import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { assetMappings, digest, expectedPackages, root, vendorRoot } from "./ocr-assets.mjs";

const packageVersions = {};
for (const [packageName, expectedVersion] of Object.entries(expectedPackages)) {
  const packageJson = JSON.parse(
    await readFile(path.join(root, "node_modules", packageName, "package.json"), "utf8"),
  );
  if (packageJson.version !== expectedVersion) {
    throw new Error(
      `${packageName} ${packageJson.version} is installed; expected ${expectedVersion}`,
    );
  }
  packageVersions[packageName] = packageJson.version;
}

const assets = [];
for (const mapping of assetMappings) {
  const source = path.join(root, mapping.source);
  const target = path.join(vendorRoot, mapping.target);
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(source, target);
  const result = await digest(target);
  assets.push({ path: mapping.target, size: result.size, sha256: result.sha256 });
}

const manifest = {
  schemaVersion: 1,
  generatedBy: "npm run sync:ocr",
  packages: packageVersions,
  model: {
    name: "eng/4.0.0_best_int",
    upstreamCommit: "4f36913e67e5ac9a56214ae78e6ba9113990ced5",
  },
  assets,
};
await writeFile(path.join(vendorRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(
  `Synchronized ${assets.length} self-hosted OCR assets (${assets.reduce((sum, asset) => sum + asset.size, 0)} bytes).`,
);
