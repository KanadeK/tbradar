import { createWorker, OEM, PSM } from "tesseract.js";
import type { Worker as TesseractWorker } from "tesseract.js";

import type { OcrBoundingBox, OcrLine, OcrResult } from "./types";

export type ScanMode = "quick" | "shelf";

export interface OcrProgress {
  status: string;
  progress: number;
  orientation: number | null;
}

type ProgressListener = (progress: OcrProgress) => void;

interface TesseractLineShape {
  text?: string;
  confidence?: number;
  bbox?: OcrBoundingBox;
}

interface TesseractBlockShape {
  paragraphs?: Array<{ lines?: TesseractLineShape[] }>;
}

let workerPromise: Promise<TesseractWorker> | null = null;
let activeListener: ProgressListener | null = null;
let activeOrientation: number | null = null;

function workerLogger(message: { status: string; progress: number }): void {
  activeListener?.({
    status: message.status,
    progress: message.progress,
    orientation: activeOrientation,
  });
}

async function getWorker(listener: ProgressListener): Promise<TesseractWorker> {
  activeListener = listener;
  const base = import.meta.env.BASE_URL;
  workerPromise ??= createWorker("eng", OEM.LSTM_ONLY, {
    logger: workerLogger,
    workerPath: `${base}vendor/tesseract/worker/worker.min.js`,
    corePath: `${base}vendor/tesseract/core`,
    langPath: `${base}vendor/tesseract/lang`,
  });
  const worker = await workerPromise;
  await worker.setParameters({
    tessedit_pageseg_mode: PSM.SPARSE_TEXT,
    preserve_interword_spaces: "1",
    user_defined_dpi: "300",
  });
  return worker;
}

interface ImageSource {
  source: CanvasImageSource;
  width: number;
  height: number;
  dispose: () => void;
}

async function loadImageSource(file: File): Promise<ImageSource> {
  if ("createImageBitmap" in window) {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        dispose: () => bitmap.close(),
      };
    } catch {
      // SVG decoding through createImageBitmap differs between browsers.
      // The HTMLImageElement path below is the compatible fallback.
    }
  }
  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = "async";
  image.src = objectUrl;
  await image.decode();
  return {
    source: image,
    width: image.naturalWidth,
    height: image.naturalHeight,
    dispose: () => URL.revokeObjectURL(objectUrl),
  };
}

async function prepareImage(file: File, orientation: number): Promise<Blob> {
  const image = await loadImageSource(file);
  try {
    const longest = Math.max(image.width, image.height);
    const upscale = longest < 1800 ? Math.min(2.2, 1800 / longest) : 1;
    const downscale = longest * upscale > 2600 ? 2600 / (longest * upscale) : 1;
    const scale = upscale * downscale;
    const sourceWidth = Math.max(1, Math.round(image.width * scale));
    const sourceHeight = Math.max(1, Math.round(image.height * scale));
    const swapsAxes = orientation === 90 || orientation === 270;
    const canvas = document.createElement("canvas");
    canvas.width = swapsAxes ? sourceHeight : sourceWidth;
    canvas.height = swapsAxes ? sourceWidth : sourceHeight;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("This browser could not create an image canvas.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    if (orientation === 90) {
      context.translate(canvas.width, 0);
      context.rotate(Math.PI / 2);
    } else if (orientation === 180) {
      context.translate(canvas.width, canvas.height);
      context.rotate(Math.PI);
    } else if (orientation === 270) {
      context.translate(0, canvas.height);
      context.rotate(-Math.PI / 2);
    }
    context.drawImage(image.source, 0, 0, sourceWidth, sourceHeight);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error("The shelf image could not be prepared.")),
        "image/jpeg",
        0.94,
      );
    });
  } finally {
    image.dispose();
  }
}

function extractLines(blocks: unknown, orientation: number): OcrLine[] {
  if (!Array.isArray(blocks)) return [];
  return (blocks as TesseractBlockShape[]).flatMap((block) =>
    (block.paragraphs ?? []).flatMap((paragraph) =>
      (paragraph.lines ?? []).flatMap((line) => {
        const text = line.text?.trim() ?? "";
        if (!text) return [];
        return [
          {
            text,
            confidence: line.confidence ?? 0,
            bbox: line.bbox ?? { x0: 0, y0: 0, x1: 0, y1: 0 },
            orientation,
          },
        ];
      }),
    ),
  );
}

export async function recognizeShelfImage(
  file: File,
  mode: ScanMode,
  listener: ProgressListener,
): Promise<OcrResult> {
  const startedAt = performance.now();
  const orientations = mode === "shelf" ? [0, 90, 270] : [0];
  const worker = await getWorker(listener);
  const allText: string[] = [];
  const allLines: OcrLine[] = [];

  try {
    for (let index = 0; index < orientations.length; index += 1) {
      const orientation = orientations[index];
      activeOrientation = orientation;
      listener({
        status: `Preparing ${orientation} degree view`,
        progress: index / orientations.length,
        orientation,
      });
      const prepared = await prepareImage(file, orientation);
      const result = await worker.recognize(prepared, {}, { blocks: true, text: true });
      const text = result.data.text.trim();
      if (text) allText.push(text);
      allLines.push(...extractLines(result.data.blocks, orientation));
    }
  } finally {
    activeOrientation = null;
    activeListener = null;
  }

  return {
    text: allText.join("\n"),
    lines: allLines,
    orientations,
    durationMs: Math.round(performance.now() - startedAt),
  };
}

export async function shutdownOcr(): Promise<void> {
  if (!workerPromise) return;
  const worker = await workerPromise;
  await worker.terminate();
  workerPromise = null;
}
