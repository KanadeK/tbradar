import { describe, expect, it } from "vitest";

import { parseReadingListText } from "./csv";
import { createScanReceipt, receiptToCsv, receiptToJson } from "./export";
import { matchReadingList } from "./matcher";

describe("scan receipt export", () => {
  it("creates a versioned, inspectable receipt", () => {
    const matches = matchReadingList(
      parseReadingListText("Kindred | Octavia E. Butler\nBeloved | Toni Morrison").items,
      "KINDRED\nOCTAVIA BUTLER",
    );
    const image = new File(["bytes"], "shelf.jpg", { type: "image/jpeg" });
    const receipt = createScanReceipt({
      threshold: 0.72,
      image,
      ocr: { text: "KINDRED", lines: [], orientations: [0, 90, 270], durationMs: 1543 },
      matches,
      generatedAt: "2026-08-08T00:00:00.000Z",
      appVersion: "test",
    });

    expect(receipt.schemaVersion).toBe(1);
    expect(receipt.generatedAt).toBe("2026-08-08T00:00:00.000Z");
    expect(receipt.image).toEqual({ name: "shelf.jpg", size: 5, type: "image/jpeg" });
    expect(receipt.summary.total).toBe(2);
    expect(receipt.matches[0]).toHaveProperty("evidence");
    expect(receiptToJson(receipt)).toMatch(/\n$/);
  });

  it("exports escaped CSV and supports a manual-text receipt", () => {
    const matches = matchReadingList(
      parseReadingListText('A Title, With Comma | An "Author"').items,
      'A TITLE, WITH COMMA\nAN "AUTHOR"',
    );
    const receipt = createScanReceipt({
      threshold: 0.7,
      image: null,
      ocr: { text: "manual", lines: [], orientations: [], durationMs: 0 },
      matches,
      generatedAt: "2026-08-08T00:00:00.000Z",
    });
    const csv = receiptToCsv(receipt);
    expect(csv.split("\n")[0]).toBe("title,author,status,confidence,ocr_evidence");
    expect(csv).toContain('"A Title, With Comma"');
    expect(csv).toContain('"An ""Author"""');
    expect(receipt.image.name).toBeNull();
  });
});
