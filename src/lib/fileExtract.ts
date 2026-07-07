import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.mjs?url";

// Shared file-reading helpers for the imports pipeline. Previously each upload hook /
// component carried its own copy of these (extractPdfText ×3, getMonthKey ×2, VALID_EXTS ×2).
// See docs/epics/uploads.md (Fase 2).

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

/** File extensions accepted by the bank-statement and investment upload flows. */
export const VALID_EXTS = [".xlsx", ".xls", ".csv", ".pdf"] as const;

/** Hard cap on upload size — keeps huge files from hitting storage and the AI extractor. */
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB

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

/**
 * Extract selectable text from a PDF (first 30 pages), accepting either a File or a raw
 * ArrayBuffer. Throws if the PDF has essentially no text (i.e. a scanned/image-only PDF).
 */
export async function extractPdfText(source: File | ArrayBuffer): Promise<string> {
  const arrayBuffer = source instanceof File ? await source.arrayBuffer() : source;
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const maxPages = Math.min(pdf.numPages, 30);
  let content = "";

  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    const pageText = (textContent.items as any[])
      .map((item) => (typeof item?.str === "string" ? item.str : ""))
      .filter(Boolean)
      .join(" ");

    content += `\n\n--- Page ${pageNum} ---\n${pageText}`;
  }

  const trimmed = content.trim();
  if (trimmed.length < 50) {
    throw new Error(
      "This PDF has no selectable text (likely scanned). Try a PDF with text or an Excel/CSV file."
    );
  }

  return trimmed;
}
