import { expect, test } from "@playwright/test";

test("sample list can be matched, exported, persisted, and cleared", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/TBRadar/);
  await page.getByRole("button", { name: "Try sample" }).click();
  await expect(page.getByText("Loaded 6 sample books.")).toBeVisible();
  await expect(page.getByAltText("Selected shelf preview")).toBeVisible();

  await page
    .getByLabel("Recognized shelf text")
    .fill(
      [
        "THE LEFT HAND OF DARKNESS",
        "URSULA K LE GUIN",
        "KINDRED",
        "OCTAVIA E BUTLER",
        "BRAIDING SWEETGRASS",
        "ROBIN WALL KIMMERER",
        "THE FIFTH SEASON",
        "N K JEMISIN",
      ].join("\n"),
    );
  await expect(page.getByText(/4 found/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Found (4)" })).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("tbradar-matches.csv");

  await page.reload();
  await expect(page.getByText(/4 found/)).toBeVisible();
  await page.getByRole("button", { name: "Clear local session" }).click();
  await expect(page.getByText("0 books ready")).toBeVisible();
});

test("mobile layout keeps the scanner controls usable", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium-mobile");
  await page.goto("/#scanner");
  await expect(page.getByRole("button", { name: "Load sample" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Scan shelf" })).toBeVisible();
  await expect(page.getByLabel("Recognized shelf text")).toBeVisible();
});
