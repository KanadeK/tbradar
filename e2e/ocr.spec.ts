import { expect, test } from "@playwright/test";

test("@ocr synthetic shelf works with all external requests blocked", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium-desktop");
  test.setTimeout(300_000);
  const externalRequests: string[] = [];
  const localOcrAssets: string[] = [];
  await page.route("**/*", async (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.hostname === "127.0.0.1") {
      if (requestUrl.pathname.includes("/vendor/tesseract/")) {
        localOcrAssets.push(requestUrl.pathname);
      }
      await route.continue();
      return;
    }
    externalRequests.push(requestUrl.href);
    await route.abort("blockedbyclient");
  });
  await page.goto("/#scanner");
  await page.getByRole("button", { name: "Load sample" }).click();
  await expect(page.getByText("Loaded 6 sample books.")).toBeVisible();
  await expect(page.getByAltText("Selected shelf preview")).toBeVisible();
  await page.getByRole("button", { name: "Scan shelf" }).click();
  await expect(page.getByRole("button", { name: "Reading shelf" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Scan shelf" })).toBeEnabled({ timeout: 260_000 });
  await expect(page.getByLabel("Recognized shelf text")).not.toHaveValue("");
  const summary = page.locator(".results-heading p");
  await expect(summary).toContainText("found");
  const foundCount = Number((await summary.textContent())?.match(/^(\d+) found/)?.[1] ?? 0);
  expect(foundCount).toBeGreaterThanOrEqual(2);
  expect(externalRequests).toEqual([]);
  expect(localOcrAssets.some((asset) => asset.endsWith("/worker/worker.min.js"))).toBe(true);
  expect(localOcrAssets.some((asset) => asset.includes("/core/tesseract-core-"))).toBe(true);
  expect(localOcrAssets.some((asset) => asset.endsWith("/lang/eng.traineddata.gz"))).toBe(true);
});
