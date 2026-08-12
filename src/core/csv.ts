import Papa from "papaparse";

import type { ReadingListItem, ReadingListParseResult, ReadingListSource } from "./types";

const TITLE_HEADERS = ["title", "booktitle", "bookname", "name"];
const AUTHOR_HEADERS = ["author", "authors", "authorlf", "bookauthor", "creator"];
const STATUS_HEADERS = [
  "exclusiveshelf",
  "bookshelves",
  "readstatus",
  "readingstatus",
  "status",
  "shelf",
];
const WANTED_STATUSES = [
  "toread",
  "wanttoread",
  "wantread",
  "wishlist",
  "tbr",
  "unread",
  "想读",
  "未读",
];

function normalizeHeader(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function cleanCell(value: unknown): string {
  return typeof value === "string" ? value.replace(/^\uFEFF/, "").trim() : "";
}

function stableId(title: string, author: string): string {
  const input = `${normalizeHeader(title)}|${normalizeHeader(author)}`;
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `book-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function findHeader(headers: string[], aliases: string[]): string | undefined {
  return headers.find((header) => aliases.includes(normalizeHeader(header)));
}

function detectSource(headers: string[]): ReadingListSource {
  const normalized = new Set(headers.map(normalizeHeader));
  if (normalized.has("exclusiveshelf") || normalized.has("bookshelves")) {
    return "goodreads";
  }
  if (normalized.has("readstatus") || normalized.has("starrating")) {
    return "storygraph";
  }
  return "generic";
}

function isWantedStatus(value: string): boolean {
  const normalized = normalizeHeader(value);
  return WANTED_STATUSES.some((status) => normalized.includes(status));
}

function dedupe(items: ReadingListItem[]): ReadingListItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${normalizeHeader(item.title)}|${normalizeHeader(item.author)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function parseReadingListCsv(input: string): ReadingListParseResult {
  if (!input.trim()) {
    return { items: [], source: "generic", warnings: ["The CSV file is empty."], ignoredRows: 0 };
  }

  const parsed = Papa.parse<Record<string, string>>(input.replace(/^\uFEFF/, ""), {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim(),
  });
  const headers = parsed.meta.fields ?? [];
  const source = detectSource(headers);
  const titleHeader = findHeader(headers, TITLE_HEADERS);
  const authorHeader = findHeader(headers, AUTHOR_HEADERS);
  const statusHeader = findHeader(headers, STATUS_HEADERS);
  const warnings = parsed.errors.map(
    (error) => `CSV row ${typeof error.row === "number" ? error.row + 2 : "?"}: ${error.message}`,
  );

  if (!titleHeader) {
    return {
      items: [],
      source,
      warnings: [...warnings, "No title column was found. Use a column named Title or Book Title."],
      ignoredRows: parsed.data.length,
    };
  }

  const statusValues = statusHeader
    ? parsed.data.map((row) => cleanCell(row[statusHeader])).filter(Boolean)
    : [];
  const shouldFilterStatus = statusValues.some(isWantedStatus);
  let ignoredRows = 0;
  const items: ReadingListItem[] = [];

  parsed.data.forEach((row, index) => {
    const title = cleanCell(row[titleHeader]);
    const author = authorHeader ? cleanCell(row[authorHeader]) : "";
    const status = statusHeader ? cleanCell(row[statusHeader]) : "";
    if (title.length < 2 || (shouldFilterStatus && !isWantedStatus(status))) {
      ignoredRows += 1;
      return;
    }
    items.push({
      id: stableId(title, author),
      title,
      author,
      source,
      sourceRow: index + 2,
    });
  });

  const uniqueItems = dedupe(items);
  ignoredRows += items.length - uniqueItems.length;
  if (shouldFilterStatus) {
    warnings.push(
      "Only rows marked as to-read, want-to-read, TBR, wishlist, or unread were imported.",
    );
  }

  return { items: uniqueItems, source, warnings, ignoredRows };
}

export function parseReadingListText(input: string): ReadingListParseResult {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  let ignoredRows = 0;
  const items = lines.flatMap<ReadingListItem>((line, index) => {
    const parts = line.split(/\t|\||\s+[—–-]\s+/u).map((part) => part.trim());
    const title = parts[0] ?? "";
    const author = parts.slice(1).join(" ");
    if (title.length < 2) {
      ignoredRows += 1;
      return [];
    }
    return [
      {
        id: stableId(title, author),
        title,
        author,
        source: "text",
        sourceRow: index + 1,
      },
    ];
  });
  const uniqueItems = dedupe(items);
  ignoredRows += items.length - uniqueItems.length;
  return {
    items: uniqueItems,
    source: "text",
    warnings: uniqueItems.length ? [] : ["Add one book per line before importing."],
    ignoredRows,
  };
}

export function markAsSample(items: ReadingListItem[]): ReadingListItem[] {
  return items.map((item) => ({ ...item, source: "sample" }));
}
