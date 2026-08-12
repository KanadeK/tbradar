import {
  ArrowDown,
  BookOpenText,
  Camera,
  CheckCircle,
  FileArrowDown,
  FileCsv,
  GithubLogo,
  ImageSquare,
  MagnifyingGlass,
  ShieldCheck,
  Trash,
  UploadSimple,
  WarningCircle,
  XCircle,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { markAsSample, parseReadingListCsv, parseReadingListText } from "./core/csv";
import { createScanReceipt, receiptToCsv, receiptToJson } from "./core/export";
import { matchReadingList, summarizeMatches } from "./core/matcher";
import { clearSession, loadSession, saveSession } from "./core/persistence";
import { recognizeShelfImage } from "./core/ocr";
import type { OcrProgress, ScanMode } from "./core/ocr";
import type { OcrResult, ReadingListItem, ReadingListMatch } from "./core/types";

const EMPTY_OCR: OcrResult = { text: "", lines: [], orientations: [], durationMs: 0 };

function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
}

function downloadText(name: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function formatDuration(milliseconds: number): string {
  if (!milliseconds) return "Manual text review";
  if (milliseconds < 1000) return `${milliseconds} ms`;
  return `${(milliseconds / 1000).toFixed(1)} s`;
}

function scoreLabel(score: number): string {
  return `${Math.round(score * 100)}%`;
}

function ResultRow({ match }: { match: ReadingListMatch }) {
  const icon =
    match.status === "found" ? (
      <CheckCircle weight="fill" aria-hidden="true" />
    ) : match.status === "review" ? (
      <WarningCircle weight="fill" aria-hidden="true" />
    ) : (
      <XCircle weight="fill" aria-hidden="true" />
    );

  return (
    <article className={`result-row result-row--${match.status}`}>
      <div className="result-icon">{icon}</div>
      <div className="result-copy">
        <h4>{match.item.title}</h4>
        <p>{match.item.author || "Author not supplied"}</p>
        {match.evidence ? (
          <p className="evidence">
            OCR evidence: <q>{match.evidence}</q>
          </p>
        ) : null}
      </div>
      <strong className="score" aria-label={`${scoreLabel(match.score)} confidence`}>
        {scoreLabel(match.score)}
      </strong>
    </article>
  );
}

function App() {
  const restored = useMemo(() => loadSession(), []);
  const [readingList, setReadingList] = useState<ReadingListItem[]>(restored?.readingList ?? []);
  const [listPaste, setListPaste] = useState("");
  const [listMessage, setListMessage] = useState("");
  const [listWarnings, setListWarnings] = useState<string[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState(restored?.ocrText ?? "");
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [threshold, setThreshold] = useState(restored?.threshold ?? 0.72);
  const [scanMode, setScanMode] = useState<ScanMode>("shelf");
  const [scanProgress, setScanProgress] = useState<OcrProgress | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const scannerRef = useRef<HTMLElement>(null);

  const matches = useMemo(
    () =>
      ocrText.trim() && readingList.length ? matchReadingList(readingList, ocrText, threshold) : [],
    [ocrText, readingList, threshold],
  );
  const summary = useMemo(() => summarizeMatches(matches), [matches]);
  const foundMatches = matches.filter((match) => match.status === "found");
  const reviewMatches = matches.filter((match) => match.status === "review");
  const missingMatches = matches.filter((match) => match.status === "missing");

  useEffect(() => {
    saveSession({ readingList, ocrText, threshold });
  }, [ocrText, readingList, threshold]);

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  function setShelfFile(file: File): void {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setOcrResult(null);
    setScanError("");
  }

  async function importCsv(file: File): Promise<void> {
    const result = parseReadingListCsv(await file.text());
    setReadingList(result.items);
    setListWarnings(result.warnings);
    setListMessage(
      result.items.length
        ? `Imported ${result.items.length} books from ${result.source}. ${result.ignoredRows} rows ignored.`
        : "No books were imported.",
    );
  }

  function importPastedList(): void {
    const result = parseReadingListText(listPaste);
    setReadingList(result.items);
    setListWarnings(result.warnings);
    setListMessage(
      result.items.length
        ? `Imported ${result.items.length} books from pasted text. ${result.ignoredRows} rows ignored.`
        : "No books were imported.",
    );
  }

  async function loadSample(): Promise<void> {
    setScanError("");
    try {
      const [csvResponse, imageResponse] = await Promise.all([
        fetch(assetUrl("examples/sample-reading-list.csv")),
        fetch(assetUrl("examples/sample-shelf.svg")),
      ]);
      if (!csvResponse.ok || !imageResponse.ok) throw new Error("Sample files were not available.");
      const parsed = parseReadingListCsv(await csvResponse.text());
      const blob = await imageResponse.blob();
      setReadingList(markAsSample(parsed.items));
      setListWarnings([]);
      setListMessage(`Loaded ${parsed.items.length} sample books.`);
      setShelfFile(new File([blob], "sample-shelf.svg", { type: "image/svg+xml" }));
      setOcrText("");
      scannerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      setScanError(error instanceof Error ? error.message : "The sample could not be loaded.");
    }
  }

  async function scanShelf(): Promise<void> {
    if (!readingList.length) {
      setScanError("Import a reading list before scanning.");
      return;
    }
    if (!imageFile) {
      setScanError("Choose or photograph a shelf before scanning.");
      return;
    }
    setIsScanning(true);
    setScanError("");
    setScanProgress({ status: "Starting OCR", progress: 0, orientation: null });
    try {
      const result = await recognizeShelfImage(imageFile, scanMode, setScanProgress);
      setOcrResult(result);
      setOcrText(result.text);
      if (!result.text.trim()) {
        setScanError("No text was detected. Try a closer photo or paste corrected OCR text below.");
      }
    } catch (error) {
      setScanError(
        error instanceof Error
          ? `OCR failed: ${error.message}`
          : "OCR failed before it could return text.",
      );
    } finally {
      setIsScanning(false);
      setScanProgress(null);
    }
  }

  function exportReceipt(format: "json" | "csv"): void {
    const receipt = createScanReceipt({
      threshold,
      image: imageFile,
      ocr: ocrResult ?? { ...EMPTY_OCR, text: ocrText },
      matches,
    });
    if (format === "json") {
      downloadText("tbradar-scan-receipt.json", receiptToJson(receipt), "application/json");
    } else {
      downloadText("tbradar-matches.csv", receiptToCsv(receipt), "text/csv;charset=utf-8");
    }
  }

  function resetWorkspace(): void {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    clearSession();
    setReadingList([]);
    setListPaste("");
    setListMessage("");
    setListWarnings([]);
    setImageFile(null);
    setPreviewUrl(null);
    setOcrText("");
    setOcrResult(null);
    setScanError("");
    setScanProgress(null);
    setThreshold(0.72);
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="TBRadar home">
          <MagnifyingGlass weight="bold" aria-hidden="true" />
          <span>TBRadar</span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#scanner">Scanner</a>
          <a href="#how">How it works</a>
          <a href="https://github.com/KanadeK/tbradar" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </nav>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">Local shelf finder</p>
            <h1 id="hero-title">Point your reading list at the shelf.</h1>
            <p>
              Import your list, scan a shelf, and spot wanted books without sending the photo
              anywhere.
            </p>
            <div className="hero-actions">
              <button
                className="button button--primary"
                type="button"
                onClick={() => void loadSample()}
              >
                Try sample
                <ArrowDown weight="bold" aria-hidden="true" />
              </button>
              <a
                className="button button--secondary"
                href="https://github.com/KanadeK/tbradar"
                target="_blank"
                rel="noreferrer"
              >
                <GithubLogo weight="bold" aria-hidden="true" />
                View source
              </a>
            </div>
          </div>
          <figure className="hero-image">
            <img
              src={assetUrl("assets/used-bookstore-reader.png")}
              alt="Reader checking a phone beside shelves in a used bookstore"
              width="1536"
              height="1024"
            />
          </figure>
        </section>

        <section className="trust-strip" aria-label="Privacy and compatibility">
          <p>
            <ShieldCheck weight="fill" aria-hidden="true" />
            Photos stay in this browser
          </p>
          <p>
            <FileCsv weight="fill" aria-hidden="true" />
            Goodreads, StoryGraph, or plain text
          </p>
          <p>
            <BookOpenText weight="fill" aria-hidden="true" />
            Editable OCR with evidence per match
          </p>
        </section>

        <section
          className="workspace"
          id="scanner"
          ref={scannerRef}
          aria-labelledby="scanner-title"
        >
          <div className="section-heading">
            <h2 id="scanner-title">Scan the shelf you are standing in front of.</h2>
            <p>The sample uses the same parser, OCR worker, and matcher as your own files.</p>
          </div>

          <div className="workspace-grid">
            <article className="panel">
              <div className="panel-heading">
                <div>
                  <p className="panel-kicker">Bring your list</p>
                  <h3>Books you already want</h3>
                </div>
                <FileCsv size={28} weight="duotone" aria-hidden="true" />
              </div>
              <p className="panel-help">
                Import an export file, or paste one title per line. Use a separator to include
                authors.
              </p>
              <div className="button-row">
                <label className="button button--secondary file-button">
                  <UploadSimple weight="bold" aria-hidden="true" />
                  Import CSV
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      if (file) void importCsv(file);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
                <button
                  className="button button--quiet"
                  type="button"
                  onClick={() => void loadSample()}
                >
                  Load sample
                </button>
              </div>
              <label className="field-label" htmlFor="list-paste">
                Titles and optional authors
              </label>
              <textarea
                id="list-paste"
                value={listPaste}
                onChange={(event) => setListPaste(event.target.value)}
                placeholder={"Kindred | Octavia E. Butler\nThe Dispossessed | Ursula K. Le Guin"}
                rows={5}
              />
              <button className="text-action" type="button" onClick={importPastedList}>
                Use pasted list
              </button>
              <div className="inline-status" aria-live="polite">
                {readingList.length ? (
                  <CheckCircle weight="fill" aria-hidden="true" />
                ) : (
                  <BookOpenText aria-hidden="true" />
                )}
                <span>{listMessage || `${readingList.length} books ready`}</span>
              </div>
              {listWarnings.length ? (
                <ul className="warning-list">
                  {listWarnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : null}
              {readingList.length ? (
                <details className="list-preview">
                  <summary>Review imported books ({readingList.length})</summary>
                  <ol>
                    {readingList.map((item) => (
                      <li key={item.id}>
                        <strong>{item.title}</strong>
                        <span>{item.author || "Author not supplied"}</span>
                      </li>
                    ))}
                  </ol>
                </details>
              ) : null}
            </article>

            <article className="panel">
              <div className="panel-heading">
                <div>
                  <p className="panel-kicker">Add a shelf photo</p>
                  <h3>Camera roll or live camera</h3>
                </div>
                <Camera size={28} weight="duotone" aria-hidden="true" />
              </div>
              <p className="panel-help">
                Fill the frame with spines. Shelf mode checks upright and both rotated text
                directions.
              </p>
              <label className="image-drop">
                {previewUrl ? (
                  <img src={previewUrl} alt="Selected shelf preview" />
                ) : (
                  <span>
                    <ImageSquare size={38} weight="duotone" aria-hidden="true" />
                    Choose or photograph a shelf
                  </span>
                )}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  capture="environment"
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    if (file) setShelfFile(file);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
              <fieldset className="scan-mode">
                <legend>Scan coverage</legend>
                <label>
                  <input
                    type="radio"
                    name="scan-mode"
                    value="shelf"
                    checked={scanMode === "shelf"}
                    onChange={() => setScanMode("shelf")}
                  />
                  <span>
                    <strong>Shelf mode</strong>
                    Three text directions, slower and more complete
                  </span>
                </label>
                <label>
                  <input
                    type="radio"
                    name="scan-mode"
                    value="quick"
                    checked={scanMode === "quick"}
                    onChange={() => setScanMode("quick")}
                  />
                  <span>
                    <strong>Quick mode</strong>
                    Upright text only
                  </span>
                </label>
              </fieldset>
              <button
                className="button button--primary scan-button"
                type="button"
                disabled={isScanning}
                onClick={() => void scanShelf()}
              >
                <MagnifyingGlass weight="bold" aria-hidden="true" />
                {isScanning ? "Reading shelf" : "Scan shelf"}
              </button>
              {isScanning && scanProgress ? (
                <div className="progress-state" aria-live="polite">
                  <progress value={scanProgress.progress} max={1} />
                  <span>
                    {scanProgress.status}
                    {scanProgress.orientation === null
                      ? ""
                      : ` at ${scanProgress.orientation} degrees`}
                  </span>
                </div>
              ) : null}
              {scanError ? (
                <p className="error-state" role="alert">
                  <WarningCircle weight="fill" aria-hidden="true" />
                  {scanError}
                </p>
              ) : null}
            </article>
          </div>

          <article className="text-review">
            <div>
              <p className="panel-kicker">Review the text</p>
              <h3>Correct weak OCR without rescanning</h3>
              <p>
                You can also paste OCR from another app. Matches update immediately against this
                text.
              </p>
            </div>
            <label className="field-label" htmlFor="ocr-text">
              Recognized shelf text
            </label>
            <textarea
              id="ocr-text"
              value={ocrText}
              onChange={(event) => {
                setOcrText(event.target.value);
                setOcrResult((current) =>
                  current ? { ...current, text: event.target.value } : current,
                );
              }}
              placeholder="OCR output appears here. Paste text to use the matcher without scanning."
              rows={8}
            />
            <div className="threshold-row">
              <label htmlFor="threshold">Match threshold: {Math.round(threshold * 100)}%</label>
              <input
                id="threshold"
                type="range"
                min="0.55"
                max="0.9"
                step="0.01"
                value={threshold}
                onChange={(event) => setThreshold(Number(event.target.value))}
              />
              <span>Lower catches more. Higher reduces false matches.</span>
            </div>
          </article>

          <section className="results" aria-labelledby="matches-title" aria-live="polite">
            <div className="results-heading">
              <div>
                <h3 id="matches-title">Matches</h3>
                <p>
                  {matches.length
                    ? `${summary.found} found, ${summary.review} to review, ${summary.missing} missing`
                    : "Import a list and add OCR text to see evidence-backed matches."}
                </p>
              </div>
              {matches.length ? (
                <div className="button-row export-actions">
                  <button
                    className="button button--secondary"
                    type="button"
                    onClick={() => exportReceipt("csv")}
                  >
                    <FileArrowDown weight="bold" aria-hidden="true" />
                    Export CSV
                  </button>
                  <button
                    className="button button--secondary"
                    type="button"
                    onClick={() => exportReceipt("json")}
                  >
                    <FileArrowDown weight="bold" aria-hidden="true" />
                    Export receipt
                  </button>
                </div>
              ) : null}
            </div>

            {matches.length ? (
              <div className="result-groups">
                <div className="result-group">
                  <h4>Found ({foundMatches.length})</h4>
                  {foundMatches.length ? (
                    foundMatches.map((match) => <ResultRow key={match.item.id} match={match} />)
                  ) : (
                    <p className="empty-group">No matches cleared the current threshold.</p>
                  )}
                </div>
                {reviewMatches.length ? (
                  <div className="result-group">
                    <h4>Review ({reviewMatches.length})</h4>
                    {reviewMatches.map((match) => (
                      <ResultRow key={match.item.id} match={match} />
                    ))}
                  </div>
                ) : null}
                <details className="missing-group">
                  <summary>Not seen ({missingMatches.length})</summary>
                  <div className="result-group">
                    {missingMatches.map((match) => (
                      <ResultRow key={match.item.id} match={match} />
                    ))}
                  </div>
                </details>
                <p className="scan-meta">
                  {ocrResult
                    ? `OCR checked ${ocrResult.orientations.length} view${ocrResult.orientations.length === 1 ? "" : "s"} in ${formatDuration(ocrResult.durationMs)}.`
                    : "Results are based on manually supplied OCR text."}
                </p>
              </div>
            ) : (
              <div className="empty-results">
                <MagnifyingGlass size={42} weight="duotone" aria-hidden="true" />
                <p>Your matches will appear here with the OCR phrase that caused each score.</p>
              </div>
            )}
          </section>

          <button className="reset-action" type="button" onClick={resetWorkspace}>
            <Trash weight="bold" aria-hidden="true" />
            Clear local session
          </button>
        </section>

        <section className="how" id="how" aria-labelledby="how-title">
          <div className="section-heading">
            <h2 id="how-title">A small tool with a visible chain of evidence.</h2>
            <p>No account, recommendation feed, cloud OCR, or hidden model score.</p>
          </div>
          <div className="how-flow">
            <article>
              <FileCsv size={34} weight="duotone" aria-hidden="true" />
              <div>
                <h3>Normalize the list</h3>
                <p>
                  Adapters recognize common export columns, filter wanted shelves, and remove
                  duplicates.
                </p>
              </div>
            </article>
            <article>
              <Camera size={34} weight="duotone" aria-hidden="true" />
              <div>
                <h3>Read three directions</h3>
                <p>
                  Tesseract.js runs in a worker so vertical and upright spine text can be checked
                  locally.
                </p>
              </div>
            </article>
            <article>
              <MagnifyingGlass size={34} weight="duotone" aria-hidden="true" />
              <div>
                <h3>Explain every match</h3>
                <p>
                  Character similarity, token coverage, author evidence, and thresholds stay
                  inspectable.
                </p>
              </div>
            </article>
            <article>
              <FileArrowDown size={34} weight="duotone" aria-hidden="true" />
              <div>
                <h3>Take the result with you</h3>
                <p>Export a simple CSV or a versioned JSON receipt with OCR text and scores.</p>
              </div>
            </article>
          </div>
        </section>
      </main>

      <footer>
        <p>TBRadar is open-source software. Shelf photos are processed on your device.</p>
        <a href="https://github.com/KanadeK/tbradar" target="_blank" rel="noreferrer">
          <GithubLogo weight="bold" aria-hidden="true" />
          GitHub repository
        </a>
      </footer>
    </div>
  );
}

export default App;
