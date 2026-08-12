import { describe, expect, it } from "vitest";

import { markAsSample, parseReadingListCsv, parseReadingListText } from "./csv";

describe("parseReadingListCsv", () => {
  it("adapts Goodreads exports and keeps only wanted shelves", () => {
    const result = parseReadingListCsv(`Title,Author,Exclusive Shelf
Kindred,Octavia E. Butler,to-read
Beloved,Toni Morrison,read
Kindred,Octavia E. Butler,to-read`);

    expect(result.source).toBe("goodreads");
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({ title: "Kindred", author: "Octavia E. Butler" });
    expect(result.ignoredRows).toBe(2);
    expect(result.warnings[0]).toContain("Only rows marked");
  });

  it("adapts StoryGraph exports", () => {
    const result = parseReadingListCsv(`Title,Authors,Read Status,Star Rating
Braiding Sweetgrass,Robin Wall Kimmerer,to-read,
Parable of the Sower,Octavia E. Butler,read,5`);

    expect(result.source).toBe("storygraph");
    expect(result.items.map((item) => item.title)).toEqual(["Braiding Sweetgrass"]);
  });

  it("accepts a generic title-only CSV and strips a BOM", () => {
    const result = parseReadingListCsv("\uFEFFBook Title\nPiranesi\nMiddlemarch\n");

    expect(result.source).toBe("generic");
    expect(result.items).toHaveLength(2);
    expect(result.items[0].author).toBe("");
  });

  it("does not filter an unknown status vocabulary", () => {
    const result = parseReadingListCsv("Title,Status\nDune,queued\nKindred,later\n");
    expect(result.items).toHaveLength(2);
    expect(result.warnings).toEqual([]);
  });

  it("returns actionable warnings for missing input and columns", () => {
    expect(parseReadingListCsv(" ").warnings[0]).toContain("empty");
    const missing = parseReadingListCsv("Writer,Year\nOctavia Butler,1979");
    expect(missing.items).toEqual([]);
    expect(missing.ignoredRows).toBe(1);
    expect(missing.warnings.at(-1)).toContain("No title column");
  });
});

describe("parseReadingListText", () => {
  it("handles pipes, tabs, spaced hyphens, duplicates, and blank rows", () => {
    const result = parseReadingListText(
      "Kindred | Octavia E. Butler\nThe Fifth Season\tN. K. Jemisin\nPiranesi - Susanna Clarke\nKindred | Octavia E. Butler\n\nA",
    );

    expect(result.items).toHaveLength(3);
    expect(result.ignoredRows).toBe(2);
    expect(result.items[2]).toMatchObject({ title: "Piranesi", author: "Susanna Clarke" });
    expect(new Set(result.items.map((item) => item.id)).size).toBe(3);
  });

  it("warns when no usable lines exist and can mark fixtures as samples", () => {
    const empty = parseReadingListText("\nA\n");
    expect(empty.warnings[0]).toContain("one book per line");
    const sample = markAsSample(parseReadingListText("Kindred").items);
    expect(sample[0].source).toBe("sample");
  });
});
