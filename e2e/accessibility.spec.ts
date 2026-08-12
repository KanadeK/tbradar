import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("loaded workbench has no serious WCAG A or AA violations", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try sample" }).click();
  await expect(page.getByText("Loaded 6 sample books.")).toBeVisible();
  await page
    .getByLabel("Recognized shelf text")
    .fill("KINDRED OCTAVIA BUTLER\nBRAIDING SWEETGRASS ROBIN WALL KIMMERER");
  await expect(page.getByRole("heading", { name: "Found (2)" })).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const summary = results.violations
    .map(
      (violation) =>
        `${violation.id}: ${violation.help} (${violation.nodes.length} node${violation.nodes.length === 1 ? "" : "s"})`,
    )
    .join("\n");
  expect(results.violations, summary).toEqual([]);
});
