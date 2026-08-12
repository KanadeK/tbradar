## What changed

Describe the reader-facing behavior and the smallest scenario that proves it.

## Evidence

- [ ] `npm run verify`
- [ ] `npm run test:e2e:ocr` when OCR, sample, worker, or image handling changed
- [ ] Screenshots or a synthetic fixture when visual/OCR behavior changed
- [ ] Documentation updated for any input, output, privacy, or release-boundary change

## Boundaries

- [ ] No private shelf photo or reading-list data is committed
- [ ] The sample still runs through production code
- [ ] New network behavior, if any, is explicitly disclosed and tested
