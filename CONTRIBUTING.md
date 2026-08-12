# Contributing

Thank you for helping TBRadar become more accurate and easier to use.

## Local setup

```bash
npm ci
npx playwright install chromium
npm run verify
```

Run the real OCR acceptance test before changing image preprocessing or matching thresholds:

```bash
npm run test:e2e:ocr
```

## Pull requests

- Keep photographs and reading lists out of fixtures unless they are synthetic or explicitly licensed.
- Add a regression test for every parser or matcher bug.
- Do not add a server-side image upload path.
- Run `npm run release:check` for release-affecting changes.

By contributing, you agree that your contribution is licensed under the MIT License.
