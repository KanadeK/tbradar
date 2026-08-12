import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const vendorRoot = path.join(root, "public", "vendor", "tesseract");
export const expectedPackages = {
  "tesseract.js": "7.0.0",
  "tesseract.js-core": "7.0.0",
  "@tesseract.js-data/eng": "1.0.0",
};

export const assetMappings = [
  {
    source: "node_modules/tesseract.js/dist/worker.min.js",
    target: "worker/worker.min.js",
  },
  {
    source: "node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js",
    target: "core/tesseract-core-lstm.wasm.js",
  },
  {
    source: "node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js",
    target: "core/tesseract-core-simd-lstm.wasm.js",
  },
  {
    source: "node_modules/tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js",
    target: "core/tesseract-core-relaxedsimd-lstm.wasm.js",
  },
  {
    source: "node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz",
    target: "lang/eng.traineddata.gz",
  },
  {
    source: "node_modules/tesseract.js-core/LICENSE",
    target: "licenses/APACHE-2.0.txt",
  },
  {
    source: "third_party/licenses/eng-traineddata-MIT.txt",
    target: "licenses/eng-traineddata-MIT.txt",
  },
  {
    source: "THIRD_PARTY_NOTICES.md",
    target: "THIRD_PARTY_NOTICES.md",
  },
];

export async function digest(file) {
  const bytes = await readFile(file);
  return {
    bytes,
    size: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}
