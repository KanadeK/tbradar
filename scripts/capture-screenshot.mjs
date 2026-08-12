import { mkdir } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = 4175;
const baseUrl = `http://127.0.0.1:${port}`;
const vite = path.join(root, "node_modules", "vite", "bin", "vite.js");
const server = spawn(process.execPath, [vite, "--host", "127.0.0.1", "--port", String(port)], {
  cwd: root,
  shell: false,
  stdio: "ignore",
});

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      // Vite is still starting.
    }
    await delay(250);
  }
  throw new Error(`Vite did not start at ${baseUrl}`);
}

await mkdir(path.join(root, "test-results"), { recursive: true });
const browser = await chromium.launch();
try {
  await waitForServer();
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await desktop.goto(baseUrl);
  await desktop.locator(".hero-image img").evaluate((image) => {
    if (!image.complete || image.naturalWidth === 0) {
      return new Promise((resolve, reject) => {
        image.addEventListener("load", () => resolve(undefined), { once: true });
        image.addEventListener("error", reject, { once: true });
      });
    }
  });
  await desktop.screenshot({ path: path.join(root, "test-results", "visual-desktop.png") });

  await desktop.getByRole("button", { name: "Try sample" }).click();
  await desktop.getByText("Loaded 6 sample books.").waitFor();
  await desktop
    .getByLabel("Recognized shelf text")
    .fill(
      [
        "KINDRED OCTAVIA BUTLER",
        "BRAIDING SWEETGRASS ROBIN WALL KIMMERER",
        "THE LEFT HAND OF DARKNESS URSULA K LE GUIN",
        "THE FIFTH SEASON N K JEMISIN",
        "MIDDLEmarch GEORGE ELIOT",
      ].join("\n"),
    );
  const results = desktop.locator(".results");
  await results.scrollIntoViewIfNeeded();
  await results.screenshot({ path: path.join(root, "docs", "tbradar-workbench.png") });

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  const mobile = await mobileContext.newPage();
  await mobile.goto(baseUrl);
  await mobile.screenshot({ path: path.join(root, "test-results", "visual-mobile.png") });
  await mobileContext.close();
  console.log("Captured desktop, mobile, and README workbench screenshots.");
} finally {
  await browser.close();
  server.kill();
}
