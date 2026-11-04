import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.mjs?url";
import { reconstructDocument, type PdfTextItem } from "./pdfTable";

// Shared file-reading helpers for the imports pipeline. Previously each upload hook /
// component carried its own copy of these (extractPdfText ×3, getMonthKey ×2, VALID_EXTS ×2).
// See docs/epics/uploads.md (Fase 2).

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

/** File extensions accepted by the bank-statement and investment upload flows. */
export const VALID_EXTS = [".xlsx", ".csv", ".pdf", ".jpg", ".jpeg", ".png", ".webp", ".heic"] as const;

/** Extensions that are images — sent to Claude Vision instead of text extraction. */
export const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic"]);

/** Hard cap on upload size — keeps huge files from hitting storage and the AI extractor. */
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB

/** Max image dimension before resizing — keeps vision token cost down. */
const IMAGE_MAX_DIMENSION = 2000;

/**
 * Validate a picked file for upload. Returns a human-readable reason when it should be
 * rejected (bad extension or too large), or `null` when it's OK to upload.
 */
export function uploadFileRejection(file: File): string | null {
  const ext = "." + (file.name.split(".").pop()?.toLowerCase() || "");
  if (!(VALID_EXTS as readonly string[]).includes(ext)) {
    return `unsupported type (use ${VALID_EXTS.join(", ")})`;
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    return `too large (${mb} MB, max ${MAX_UPLOAD_BYTES / 1024 / 1024} MB)`;
  }
  return null;
}

/** `YYYY-MM` key for a Date in local time — matches how the app buckets months. */
export function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export interface PdfExtractResult {
  text: string;
  totalPages: number;
  processedPages: number;
  truncated: boolean;
  /** True when the PDF has no selectable text (scanned / image-only). */
  scanned?: boolean;
}

const PDF_MAX_PAGES = 30;

/**
 * Extract selectable text from a PDF (first 30 pages), accepting either a File or a raw
 * ArrayBuffer. Throws if the PDF has essentially no text (i.e. a scanned/image-only PDF).
 *
 * The text handed to the AI extractor is reconstructed by `reconstructDocument`
 * ([./pdfTable](./pdfTable.ts)), which only changes the output for **two-column** bank
 * statements (separate "Money out" / "Money in" columns, e.g. Revolut). Every other PDF falls
 * back to the historical flat join, so single-column statements and other banks are unchanged.
 * `reconstructTables` defaults to true; the investment upload path passes `false` so investment
 * statements (holdings/quantities/prices, not just signed rows) are never reshaped.
 */
export async function extractPdfText(
  source: File | ArrayBuffer,
  opts: { reconstructTables?: boolean } = {},
): Promise<PdfExtractResult> {
  const arrayBuffer = source instanceof File ? await source.arrayBuffer() : source;
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const processedPages = Math.min(pdf.numPages, PDF_MAX_PAGES);
  const pages: PdfTextItem[][] = [];

  for (let pageNum = 1; pageNum <= processedPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    pages.push(
      (textContent.items as any[]).map((item) => ({
        str: typeof item?.str === "string" ? item.str : "",
        x: item?.transform?.[4] ?? 0,
        y: item?.transform?.[5] ?? 0,
      })),
    );
  }

  const trimmed = reconstructDocument(pages, opts.reconstructTables ?? true);
  if (trimmed.length < 50) {
    return {
      text: "",
      totalPages: pdf.numPages,
      processedPages,
      truncated: pdf.numPages > PDF_MAX_PAGES,
      scanned: true,
    };
  }

  return {
    text: trimmed,
    totalPages: pdf.numPages,
    processedPages,
    truncated: pdf.numPages > PDF_MAX_PAGES,
  };
}

/** Check whether a file extension is an image type we handle via vision. */
export function isImageFile(fileName: string): boolean {
  const ext = "." + (fileName.split(".").pop()?.toLowerCase() || "");
  return IMAGE_EXTS.has(ext);
}

/**
 * Convert an image File to a base64 data string, optionally resizing to keep
 * vision token cost down. Returns `{base64, mediaType}` ready for the Anthropic
 * API image content block.
 */
export async function imageToBase64(
  file: File,
): Promise<{ base64: string; mediaType: string }> {
  const mediaType = file.type || "image/jpeg";

  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;

  // Resize if either dimension exceeds the cap — halves vision tokens.
  if (width > IMAGE_MAX_DIMENSION || height > IMAGE_MAX_DIMENSION) {
    const scale = IMAGE_MAX_DIMENSION / Math.max(width, height);
    const w = Math.round(width * scale);
    const h = Math.round(height * scale);

    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();

    const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.85 });
    return {
      base64: await blobToBase64(blob),
      mediaType: "image/jpeg",
    };
  }

  bitmap.close();
  return { base64: await blobToBase64(file), mediaType };
}

/**
 * Render a scanned (image-only) PDF's pages to base64 images for Claude Vision.
 * Returns one {base64, mediaType} per page, capped at `maxPages`.
 */
export async function renderPdfPagesToImages(
  source: File | ArrayBuffer,
  maxPages = 10,
): Promise<Array<{ base64: string; mediaType: string }>> {
  const arrayBuffer = source instanceof File ? await source.arrayBuffer() : source;
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pageCount = Math.min(pdf.numPages, maxPages);
  const results: Array<{ base64: string; mediaType: string }> = [];

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 });

    // Cap rendered size
    let scale = 2.0;
    if (viewport.width > IMAGE_MAX_DIMENSION || viewport.height > IMAGE_MAX_DIMENSION) {
      scale = (IMAGE_MAX_DIMENSION / Math.max(viewport.width, viewport.height)) * 2.0;
    }
    const vp = page.getViewport({ scale });

    const canvas = new OffscreenCanvas(Math.round(vp.width), Math.round(vp.height));
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx as any, viewport: vp }).promise;

    const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.85 });
    results.push({ base64: await blobToBase64(blob), mediaType: "image/jpeg" });
  }

  return results;
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
