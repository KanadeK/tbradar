# Project research and non-duplication record

Snapshot date: **2026-08-08**. Repository counts, stars, and search results change over time. This record explains the decision, not a permanent claim that no similar project can ever exist.

## Selection constraints

The project had to satisfy all of these conditions:

1. It could not duplicate the owner's existing public or local projects, including prior work on repository health, document care, data inspection, smart-home recovery, media repair, release automation, and game tooling.
2. It needed a real computation path that could be tested without a hosted backend.
3. A useful first release had to fit one repository while still leaving obvious contribution surfaces.
4. The user problem needed visible community evidence, not just a keyword with search volume.
5. The differentiation had to be behavioral, not a new skin over a familiar CRUD shell.

Two earlier directions were rejected before implementation:

- **Tenant move-in/move-out evidence packs** overlapped with existing inspection and rental-evidence products found during GitHub search.
- **Portable CalDAV VJOUR notes** overlapped with existing journal clients and would have depended heavily on inconsistent server support before delivering a reliable first use.

## Demand signal

A 2025 r/SomebodyMakeThis request titled [“Book-scanning app”](https://www.reddit.com/r/SomebodyMakeThis/comments/1mvt1j6/bookscanning_app/) described exactly the in-store moment: scan book spines and compare them with a to-read list. The post had a positive community response in the research snapshot. That is stronger evidence for a focused tool than a generic “AI bookshelf” pitch.

The recurring job is compact and legible:

- The user already has intent captured in a reading list.
- The physical shelf is slow to compare manually.
- A photo is sensitive enough that local processing is a meaningful advantage.
- The output is a short retrieval decision, not another catalog to maintain.

## GitHub search

Searches covered repository names, descriptions, README content, and several exact phrases, including:

```text
"to-read" "book spine"
wishlist "bookshelf scanner"
Goodreads "book spine" OCR
StoryGraph "bookshelf scanner"
reading list shelf photo OCR
```

No direct open-source implementation of the complete workflow was found in that snapshot: import an existing Goodreads/StoryGraph TBR list, process a shelf photo locally, match only wanted titles, expose OCR evidence, and export an auditable receipt. GitHub's secondary search limit was reached after the wider pass, so this is deliberately phrased as “no direct implementation found,” not proof of universal absence.

### Closest public repositories

| Repository                                                                                        | Stars at snapshot | What it does                                                                         | Material difference from TBRadar                                                                                   |
| ------------------------------------------------------------------------------------------------- | ----------------: | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| [MarinaWyss/ShelfScanner](https://github.com/MarinaWyss/ShelfScanner)                             |                53 | Identifies a shelf, generates recommendations and summaries, and links to purchasing | Discovery and recommendation workflow with server/database dependencies; not local TBR membership checking         |
| [suxrobGM/bookshelf-scanner](https://github.com/suxrobGM/bookshelf-scanner)                       |                20 | YOLO segmentation plus Moondream2 behind a FastAPI service                           | Attempts to identify every book through a backend; no imported wanted-list filter or browser-only privacy boundary |
| [PierreAdel/Book-spine-extractor](https://github.com/PierreAdel/Book-spine-extractor)             |                15 | Flask API using OpenCV and Tesseract for classification                              | Image upload API and catalog extraction; no user-list reconciliation or evidence receipt                           |
| [MinHanLiWesley/book-spine-recognition](https://github.com/MinHanLiWesley/book-spine-recognition) |                 7 | YOLO, RealESRGAN, Google Cloud Vision, and Gemini metadata extraction                | GPU and cloud pipeline for generalized recognition; not a zero-account local matcher                               |

Those projects validate that shelf recognition is interesting, while also showing a relatively expensive common architecture. TBRadar's defensible wedge is the opposite: recognize only enough text to answer a pre-filtered personal question, in a static browser app.

## Why this may earn attention

Stars cannot be guaranteed. The project is structured to improve its odds through concrete adoption mechanics:

- **One-sentence demo:** point a reading list at a shelf.
- **Low trust cost:** no account, backend, API key, or photo upload.
- **Immediate sample:** a visitor can exercise the real OCR path without preparing data.
- **Recognizable ecosystems:** Goodreads and StoryGraph are explicit import targets.
- **Inspectable result:** evidence and confidence invite trust and useful bug reports.
- **Contribution seams:** new CSV adapters, OCR languages, synthetic shelf fixtures, and matcher regressions are small, reviewable additions.
- **Searchable vocabulary:** book spine OCR, Goodreads export, StoryGraph CSV, TBR finder, privacy-first PWA.

The first release intentionally does not add social feeds, AI recommendations, a cloud catalog, or accounts. Those would blur the useful moment and make the privacy claim harder to verify.

## Validation criteria used

The selected direction only passed research after it had executable acceptance criteria:

- Goodreads, StoryGraph, generic CSV, and text parsers have fixtures and edge-case tests.
- A synthetic shelf image goes through Tesseract.js in a real Chromium browser.
- The result must contain at least one actual title match; fixed demo output is prohibited.
- The app exposes OCR text so false positives and false negatives can be repaired by the user.
- A release archive must be byte-identical across deliberately separated packaging runs.
- CI, Pages, release assets, checksums, author identity, and contributor history are separate publication checks.

See [acceptance.md](acceptance.md) for the executable gate and [architecture.md](architecture.md) for the implementation boundary.
