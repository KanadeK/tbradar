# Acceptance and repair guide

This guide proves that TBRadar is more than a static interface. It checks parsers, matching, browser workflows, real OCR, production output, dependency risk, and deterministic release packaging.

## Supported verification environment

- Node.js 24 or later
- npm 11 or later
- Git
- Chromium installed by Playwright
- Network access for dependency installation and the first Tesseract English-model fetch

Confirm the toolchain:

```bash
node --version
npm --version
git --version
```

## Clean installation

```bash
npm ci
node node_modules/@playwright/test/cli.js install chromium
```

`npm ci` must complete without changing `package-lock.json`. The repository intentionally pins every direct dependency exactly.

## Automated gates

### 1. Fast implementation gate

```bash
npm run verify
```

This command must pass all of the following:

- static privacy, required-file, placeholder, and obvious-secret checks;
- Prettier check;
- ESLint with zero warnings;
- TypeScript project build;
- Vitest unit and component tests with at least 90% lines, 90% functions, 90% statements, and 82% branches in the non-OCR core;
- production PWA build;
- desktop and mobile Chromium workflow tests for import, matching, export, restore, validation, and reset.

### 2. Real OCR gate

```bash
npm run test:e2e:ocr
```

This is not an OCR mock. Playwright blocks every request outside the local app origin, loads `public/examples/sample-shelf.svg`, runs Tesseract.js, and asserts that the self-hosted worker, compatible Core, and English model are requested. OCR text must reach the editable evidence field and produce real title matches.

### 3. Dependency gate

```bash
npm audit --audit-level=high --registry=https://registry.npmjs.org/
```

Expected result: no high or critical production/development dependency advisory.

### 4. Release artifact gate

```bash
npm run build
npm run package
npm run package:verify
```

Expected outputs:

```text
release/tbradar-v0.1.0-web.zip
release/SHA256SUMS
```

The determinism check packages the same `dist/` tree twice with a 1.2-second separation, compares archive bytes, and inspects `tbradar/index.html` plus `tbradar/manifest.webmanifest` inside the ZIP.

Verify the published checksum on PowerShell:

```powershell
Get-FileHash -Algorithm SHA256 .\release\tbradar-v0.1.0-web.zip
Get-Content .\release\SHA256SUMS
```

Or on Linux/macOS:

```bash
cd release
sha256sum --check SHA256SUMS
```

### 5. Final clean-worktree gate

Create the intended commit first, then run:

```bash
npm run release:check
```

The gate refuses a missing commit, uncommitted changes, or any `Co-authored-by` trailer. It then runs the complete verification, real OCR, audit, package, and deterministic-package checks.

## Manual product acceptance

1. Run `npm run dev` and open `http://127.0.0.1:5173`.
2. Select **Try sample**. Confirm six wanted titles are loaded; the completed sample row is ignored.
3. Choose **Shelf scan: 0°, 90°, 270°** and select **Scan shelf**.
4. Confirm progress names the orientation being prepared and eventually shows editable OCR text.
5. Confirm at least one title appears under **Found** or **Review** with a confidence percentage and evidence fragment.
6. Deliberately alter one OCR title. Confirm matching updates without rescanning the image.
7. Move the threshold slider. Confirm result groups and totals update immediately.
8. Export JSON and CSV. Confirm the JSON has `schemaVersion: 1` and the CSV opens with `title,author,status,confidence,ocr_evidence`.
9. Refresh the page. Confirm the reading list, OCR text, and threshold restore, while the original shelf image does not.
10. Select **Clear local data**. Refresh again and confirm the session is empty.

## Failure repair matrix

| Failure                                                       | Likely cause                                                    | Repair                                                                                                                                                                   |
| ------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm ci` says lockfile and package disagree                   | `package.json` changed without refreshing the lock              | Run `npm install --package-lock-only`, review both files, commit them together, then rerun `npm ci`                                                                      |
| Install reports a corrupt cache or repeated integrity failure | Interrupted local npm cache                                     | Run `npm cache verify`; if the exact error persists, remove only this repository's `node_modules` and rerun `npm ci`                                                     |
| Playwright says the Chromium executable is missing            | Browser bundle was not installed                                | Run `node node_modules/@playwright/test/cli.js install chromium`                                                                                                         |
| Port `43173` is already in use                                | Another process owns the dedicated E2E port                     | Leave unrelated services alone and rerun with a free override, for example `$env:TBRADAR_E2E_PORT=43174` in PowerShell                                                   |
| Unit coverage falls below a threshold                         | A core branch was added without a regression fixture            | Run `npm test -- --reporter=verbose`, add the smallest behavioral test for the uncovered path, and rerun `npm test`                                                      |
| OCR asset verification reports a mismatch                     | A vendored file is missing, stale, or manually changed          | Run `npm ci`, then `npm run sync:ocr`; review `manifest.json` and commit all intentional version, asset, license, and hash changes together                              |
| OCR test stalls or reports an external request                | A self-hosted path is wrong or a dependency fell back to a CDN  | Inspect the retained Playwright trace and `public/vendor/tesseract/manifest.json`; restore `workerPath`, `corePath`, and `langPath` instead of allowing the CDN fallback |
| OCR returns little text                                       | Photo is distant, blurred, reflective, or has very small spines | Take closer overlapping photos, use even light, choose shelf mode, inspect/edit OCR text, and lower the threshold only while reviewing evidence                          |
| The synthetic SVG cannot decode in a browser                  | Browser image-decoding regression                               | Open `public/examples/sample-shelf.svg` directly, inspect the Playwright trace, and verify the `HTMLImageElement` fallback in `src/core/ocr.ts` still runs               |
| `package:verify` reports different hashes                     | A timestamp or unsorted file entered the archive                | Run `npm run build`, inspect changes in `dist/`, and keep all archive metadata fixed in `scripts/package-release.mjs`; do not weaken the byte comparison                 |
| `release:check` says the worktree is dirty                    | Changes are not yet intentionally recorded                      | Inspect `git status --short`; commit intended files or remove generated/unwanted files deliberately. Do not bypass this for a public release                             |
| GitHub Pages shows 404 assets                                 | Build used `/` instead of the repository base                   | Ensure the Pages workflow sets `GITHUB_PAGES=true` during `npm run build`, then redeploy                                                                                 |
| Release checksum differs after download                       | Wrong asset, partial download, or tag/assets were replaced      | Stop publication claims, download again, compare asset size, and recreate the release from the exact tagged commit only after local and downloaded hashes agree          |

For a clean dependency rebuild in PowerShell, the destructive target must stay scoped to this repository:

```powershell
Resolve-Path .\node_modules
Remove-Item -LiteralPath .\node_modules -Recurse -Force
npm ci
```

Do not delete the repository, `.git`, source files, or a parent workspace as a repair shortcut.

## Online publication checks

After pushing `main` and `v0.1.0`:

```bash
gh run list --repo KanadeK/tbradar --limit 10
gh release view v0.1.0 --repo KanadeK/tbradar
gh api repos/KanadeK/tbradar/contributors
git shortlog -sne HEAD
git log --format='%an|%ae|%cn|%ce' HEAD
```

Required publication evidence:

- CI and Pages runs succeed for the released commit.
- `https://kanadek.github.io/tbradar/` returns the TBRadar production page and its assets load.
- The public tag resolves to the exact local release commit.
- The GitHub Release contains the ZIP and `SHA256SUMS`.
- A freshly downloaded release ZIP matches its published checksum.
- Author, committer, shortlog, public contributors, and commit trailers contain only intended attribution.
