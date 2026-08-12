# Privacy model

TBRadar is designed so a shelf photo can be processed without being uploaded to an application server.

## What stays on the device

- The selected image is decoded into a browser canvas and passed to a Tesseract.js web worker in the same browser context.
- The normalized reading list, editable OCR text, and threshold are stored in `localStorage` under `tbradar.session.v1` so a refresh can restore work.
- The original image is kept only in memory. It is not written to local storage, IndexedDB, a service database, or an export.
- JSON receipts include the image filename, byte size, and MIME type for traceability, but never include pixel data.

Use **Clear local data** in the app to remove the saved session. Browser site-data controls can also remove the PWA cache and Tesseract model cache.

## Network boundary

The application has no backend, analytics SDK, ad code, account system, or application-level upload function. It is hosted as static files on GitHub Pages.

The Tesseract.js 7.0.0 worker, LSTM baseline/SIMD/relaxed-SIMD cores, and `4.0.0_best_int` English model are copied from locked packages into `public/vendor/tesseract`. They are served from the same TBRadar origin and included in the PWA precache. The manifest records every size and SHA-256 hash. Recognition therefore needs no third-party runtime or model request.

Loading the site and repository also creates the ordinary access logs maintained by GitHub and its delivery infrastructure. Those logs are outside this repository; TBRadar adds no telemetry on top.

## Verification hooks

- `npm run check:static` fails if the application modules add common upload primitives such as `fetch`, `XMLHttpRequest`, `axios`, or `FormData`, or if an OCR asset differs from its locked source and manifest.
- The real OCR browser test blocks every request outside `127.0.0.1`, drives the same file input and worker used by real images, and asserts that the local worker, core, and language model were requested.
- `src/core/persistence.test.ts` verifies both saved fields and storage-failure behavior.
- A future network feature must update this document, the interface disclosure, and the static gate in the same pull request.

## Threats not solved

- A compromised browser, extension, operating system, dependency, or GitHub Pages origin can observe or alter browser behavior.
- Someone with access to the same browser profile may read the saved list and OCR text.
- Exported receipts are ordinary local files; the user controls where they are shared.
- Local processing reduces data exposure but does not make OCR results accurate. Review low-confidence evidence before acting on it.
