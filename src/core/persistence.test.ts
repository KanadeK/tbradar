import { beforeEach, describe, expect, it } from "vitest";

import { parseReadingListText } from "./csv";
import { clearSession, loadSession, saveSession } from "./persistence";

describe("local session persistence", () => {
  beforeEach(() => window.localStorage.clear());

  it("round-trips and clears a valid session", () => {
    const session = {
      readingList: parseReadingListText("Kindred | Octavia E. Butler").items,
      ocrText: "KINDRED",
      threshold: 0.74,
    };
    expect(saveSession(session)).toBe(true);
    expect(loadSession()).toEqual(session);
    clearSession();
    expect(loadSession()).toBeNull();
  });

  it("ignores malformed or incomplete stored data", () => {
    window.localStorage.setItem("tbradar.session.v1", "not-json");
    expect(loadSession()).toBeNull();
    window.localStorage.setItem("tbradar.session.v1", JSON.stringify({ readingList: [] }));
    expect(loadSession()).toBeNull();
  });

  it("returns false when storage rejects writes", () => {
    const broken = {
      setItem: () => {
        throw new Error("quota");
      },
    } as unknown as Storage;
    expect(saveSession({ readingList: [], ocrText: "", threshold: 0.72 }, broken)).toBe(false);
  });
});
