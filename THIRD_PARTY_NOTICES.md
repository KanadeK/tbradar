# Third-party notices

TBRadar distributes the following unmodified runtime assets so OCR works without a third-party CDN:

| Component                                                                                                              | Version/source                                            | Distributed files                                   | License                                                    |
| ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------- |
| [Tesseract.js](https://github.com/naptha/tesseract.js)                                                                 | 7.0.0                                                     | Browser worker                                      | Apache-2.0                                                 |
| [Tesseract.js Core](https://github.com/naptha/tesseract.js-core)                                                       | 7.0.0                                                     | LSTM baseline, SIMD, and relaxed-SIMD WASM wrappers | Apache-2.0                                                 |
| [English traineddata](https://github.com/naptha/tessdata/tree/4f36913e67e5ac9a56214ae78e6ba9113990ced5/4.0.0_best_int) | `@tesseract.js-data/eng` 1.0.0, upstream commit `4f36913` | `eng.traineddata.gz`                                | npm package metadata: MIT; upstream repository: Apache-2.0 |

The full Apache-2.0 text and the MIT text declared by the English npm package are included beside the runtime assets in `public/vendor/tesseract/licenses/`. Package versions, sizes, and SHA-256 hashes are recorded in `public/vendor/tesseract/manifest.json` and checked by `npm run check:static`.

The files are copied without code modifications by `npm run sync:ocr`. TBRadar's own source remains licensed under the repository [MIT license](LICENSE).
