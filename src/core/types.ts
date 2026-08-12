export type ReadingListSource = "goodreads" | "storygraph" | "generic" | "text" | "sample";

export interface ReadingListItem {
  id: string;
  title: string;
  author: string;
  source: ReadingListSource;
  sourceRow: number;
}

export interface ReadingListParseResult {
  items: ReadingListItem[];
  source: ReadingListSource;
  warnings: string[];
  ignoredRows: number;
}

export interface OcrBoundingBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface OcrLine {
  text: string;
  confidence: number;
  bbox: OcrBoundingBox;
  orientation: number;
}

export interface OcrResult {
  text: string;
  lines: OcrLine[];
  orientations: number[];
  durationMs: number;
}

export type MatchStatus = "found" | "review" | "missing";

export interface MatchBreakdown {
  characterSimilarity: number;
  tokenCoverage: number;
  tokenPrecision: number;
  authorBonus: number;
}

export interface ReadingListMatch {
  item: ReadingListItem;
  score: number;
  status: MatchStatus;
  evidence: string;
  breakdown: MatchBreakdown;
}

export interface MatchSummary {
  found: number;
  review: number;
  missing: number;
  total: number;
}

export interface ScanReceipt {
  schemaVersion: 1;
  generatedAt: string;
  appVersion: string;
  threshold: number;
  image: {
    name: string | null;
    size: number | null;
    type: string | null;
  };
  ocr: {
    orientations: number[];
    durationMs: number;
    text: string;
  };
  summary: MatchSummary;
  matches: Array<{
    id: string;
    title: string;
    author: string;
    score: number;
    status: MatchStatus;
    evidence: string;
  }>;
}
