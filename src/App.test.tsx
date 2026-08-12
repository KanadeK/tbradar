import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App";

describe("TBRadar workbench", () => {
  beforeEach(() => {
    window.localStorage.clear();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("matches pasted reading-list and OCR text through the real core", () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText("Titles and optional authors"), {
      target: { value: "Kindred | Octavia E. Butler\nThe Dispossessed | Ursula K. Le Guin" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Use pasted list" }));
    expect(screen.getByText(/Imported 2 books from pasted text/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Recognized shelf text"), {
      target: { value: "KINDRED\nOCTAVIA E BUTLER\nMIDDLEMARCH" },
    });
    const foundGroup = screen.getByRole("heading", { name: "Found (1)" }).parentElement;
    expect(foundGroup).not.toBeNull();
    expect(within(foundGroup as HTMLElement).getByText("Kindred")).toBeInTheDocument();
    expect(screen.getByText(/1 found, 0 to review, 1 missing/)).toBeInTheDocument();
  });

  it("shows actionable scan validation and clears local state", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Scan shelf" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Import a reading list");
    fireEvent.change(screen.getByLabelText("Titles and optional authors"), {
      target: { value: "Kindred" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Use pasted list" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear local session" }));
    expect(screen.getByText("0 books ready")).toBeInTheDocument();
  });
});
