/// <reference types="vitest/config" />

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const base = process.env.GITHUB_PAGES === "true" ? "/tbradar/" : "/";

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "icon.svg",
        "assets/used-bookstore-reader.png",
        "examples/sample-reading-list.csv",
        "examples/sample-shelf.svg",
      ],
      manifest: {
        name: "TBRadar",
        short_name: "TBRadar",
        description: "Find wanted books in a shelf photo without uploading the image.",
        theme_color: "#2457d6",
        background_color: "#f6f7fb",
        display: "standalone",
        start_url: "./",
        scope: "./",
        icons: [
          {
            src: "icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,csv,gz,json,txt,md}"],
        maximumFileSizeToCacheInBytes: 5_000_000,
        navigateFallback: "index.html",
      },
    }),
  ],
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      include: ["src/core/**/*.ts"],
      exclude: ["src/core/ocr.ts"],
      thresholds: {
        lines: 90,
        functions: 90,
        statements: 90,
        branches: 82,
      },
    },
  },
});
