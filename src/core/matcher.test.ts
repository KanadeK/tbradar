import { describe, expect, it } from "vitest";

import { parseReadingListText } from "./csv";
import {
  levenshteinDistance,
  matchBook,
  matchReadingList,
  normalizeText,
  normalizeTitle,
  statusForScore,
  summarizeMatches,
} from "./matcher";

function book(line: string) {
  return parseReadingListText(line).items[0];
}

describe("normalization and edit distance", () => {
  it("normalizes punctuation, diacritics, whitespace, and leading articles", () => {
    expect(normalizeText("  L'étranger & Me  ")).toBe("l etranger and me");
    expect(normalizeTitle("The   Left-Hand of Darkness")).toBe("left hand of darkness");
  });

  it("computes Levenshtein distance including empty strings", () => {
    expect(levenshteinDistance("kitten", "sitting")).toBe(3);
    expect(levenshteinDistance("", "book")).toBe(4);
    expect(levenshteinDistance("book", "")).toBe(4);
  });
});

describe("book matching", () => {
  it("finds exact titles inside noisy shelf text", () => {
    const result = matchBook(
      book("The Left Hand of Darkness | Ursula K. Le Guin"),
      "SALE\nTHE LEFT HAND OF DARKNESS\nURSULA K LE GUIN\nother title",
    );
    expect(result.status).toBe("found");
    expect(result.score).toBeGreaterThan(0.9);
    expect(result.evidence).toContain("LEFT HAND");
    expect(result.breakdown.authorBonus).toBe(0.04);
  });

  it("tolerates common OCR substitutions", () => {
    const result = matchBook(
      book("Braiding Sweetgrass | Robin Wall Kimmerer"),
      "BRAIDING SWEETGRAS5",
    );
    expect(result.status).toBe("found");
    expect(result.score).toBeGreaterThan(0.75);
  });

  it("uses adjacent OCR lines for split spine titles", () => {
    const result = matchBook(book("Parable of the Sower"), "PARABLE OF\nTHE SOWER\nOCTAVIA BUTLER");
    expect(result.status).toBe("found");
    expect(result.evidence).toContain("PARABLE OF THE SOWER");
  });

  it("does not turn unrelated text into a confident match", () => {
    const result = matchBook(
      book("The Dispossessed | Ursula K. Le Guin"),
      "MIDDLEMARCH\nGEORGE ELIOT",
    );
    expect(result.status).toBe("missing");
    expect(result.score).toBeLessThan(0.5);
  });

  it("penalizes very short ambiguous titles", () => {
    const result = matchBook(book("It | Stephen King"), "FIT FOR PURPOSE\nOTHER BOOKS");
    expect(result.status).not.toBe("found");
  });

  it("sorts a list by score and summarizes all statuses", () => {
    const items = parseReadingListText(
      "Kindred | Octavia E. Butler\nThe Fifth Season | N. K. Jemisin\nThe Dispossessed | Ursula K. Le Guin",
    ).items;
    const matches = matchReadingList(items, "KINDRED\nTHE FIFTH SEAS0N", 0.82);
    expect(matches[0].item.title).toBe("Kindred");
    expect(matches.map((match) => match.status)).toContain("missing");
    const summary = summarizeMatches(matches);
    expect(summary.total).toBe(3);
    expect(summary.found + summary.review + summary.missing).toBe(3);
  });

  it("maps scores to found, review, and missing using a bounded review band", () => {
    expect(statusForScore(0.8, 0.72)).toBe("found");
    expect(statusForScore(0.61, 0.72)).toBe("review");
    expect(statusForScore(0.2, 0.72)).toBe("missing");
    expect(statusForScore(0.43, 0.55)).toBe("review");
  });
});
