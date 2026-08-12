import { summarizeMatches } from "./matcher";
import type { OcrResult, ReadingListMatch, ScanReceipt } from "./types";

export interface ReceiptOptions {
  threshold: number;
  image: File | null;
  ocr: OcrResult;
  matches: ReadingListMatch[];
  generatedAt?: string;
  appVersion?: string;
}

export function createScanReceipt(options: ReceiptOptions): ScanReceipt {
  const { image, matches, ocr, threshold } = options;
  return {
    schemaVersion: 1,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    appVersion: options.appVersion ?? "0.1.0",
    threshold,
    image: {
      name: image?.name ?? null,
      size: image?.size ?? null,
      type: image?.type ?? null,
    },
    ocr: {
      orientations: ocr.orientations,
      durationMs: ocr.durationMs,
      text: ocr.text,
    },
    summary: summarizeMatches(matches),
    matches: matches.map((match) => ({
      id: match.item.id,
      title: match.item.title,
      author: match.item.author,
      score: match.score,
      status: match.status,
      evidence: match.evidence,
    })),
  };
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function receiptToCsv(receipt: ScanReceipt): string {
  const header = ["title", "author", "status", "confidence", "ocr_evidence"];
  const rows = receipt.matches.map((match) =>
    [match.title, match.author, match.status, Math.round(match.score * 100), match.evidence]
      .map(csvCell)
      .join(","),
  );
  return [header.join(","), ...rows].join("\n");
}

export function receiptToJson(receipt: ScanReceipt): string {
  return `${JSON.stringify(receipt, null, 2)}\n`;
}
