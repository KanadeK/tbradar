# Security policy

## Supported versions

Security fixes are applied to the latest release.

## Report a vulnerability

Please use GitHub's private vulnerability reporting for this repository. Do not open a public issue with a working exploit, private reading-list data, or shelf photographs.

TBRadar performs OCR in the browser. It does not contain an upload endpoint. A first OCR run downloads the Tesseract.js runtime and English model from jsDelivr; the browser caches those assets for later runs.
