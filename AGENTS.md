# TBRadar contributor guide

## Scope

TBRadar is a static, local-processing web app. Images must never be uploaded by project code.

## Commands

- `npm run verify`: formatting, lint, typecheck, unit coverage, build, and browser workflow tests.
- `npm run test:e2e:ocr`: real Tesseract.js acceptance against the synthetic shelf.
- `npm run release:check`: full gate, deterministic package check, and release artifacts.

## Architecture

- Keep CSV adapters in `src/core/csv.ts`.
- Keep pure matching logic in `src/core/matcher.ts`.
- Keep browser and Tesseract APIs isolated in `src/core/ocr.ts`.
- Do not hide OCR failures with fixed demo output. The sample must travel through the same code path as user images.
- User-visible claims need an executable acceptance test or a clearly labeled limitation.
