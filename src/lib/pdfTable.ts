// ===========================================================================
// Table-aware PDF reconstruction (pure — no pdfjs, unit-tested in tests/fileExtract.test.ts)
// ===========================================================================
// Banks like Revolut export statements with SEPARATE "Money out" and "Money in" columns:
// the sign of an amount is encoded by which column it sits in. A flat join of pdfjs text
// items loses that, so the AI can't tell outflows from inflows. When (and only when) a
// statement has both an out- and an in-column, `reconstructDocument` rebuilds rows by
// x-position and emits each amount PRE-SIGNED (out → −, in → +). Anything else uses the
// flat join, identical to the historical behavior — so single-column statements, other
// banks and investment PDFs are byte-for-byte unchanged.
//
// This module deliberately has NO pdfjs import: fileExtract.ts does the pdfjs I/O and hands
// the raw text items here, which keeps the logic testable in a plain Node/vitest env.

/** One pdfjs text run: its string plus the x/y of its transform origin (PDF points). */
export interface PdfTextItem {
  str: string;
  x: number;
  y: number;
}

interface Row {
  y: number;
  cells: PdfTextItem[];
}
interface Col {
  name: string;
  x: number;
}

// A cell is a header label if it names a known statement column. Covers EN/ES wording.
const HEADER_KW =
  /^(transaction\s*\/?\s*value\s*date|transaction date|value date|date|fecha|description|descripci|concepto|money\s*(in|out)|paid\s*(in|out)|debit|credit|withdrawal|deposit|cargo|abono|d[eé]bito|cr[eé]dito|importe|amount|balance|saldo|aer|nir)/i;
// Short fragments of a wrapped two-line header ("Money" / "out") — merged into one column.
const HEADER_FRAG = /^(in|out|paid|money|value|date)$/i;
// Legal / boilerplate footer lines that are never transactions.
const FOOTER_RE =
  /Revolut Bank UAB|licensed and regulated|Registered address|Page \d+ of \d+|©|Report lost|Get help|Scan the QR|in-app chat|Deposit Insurance|Investment Insurance|Konstitucijos|Volume \d+,? Book|number of registration|established a branch|protected by|edb-banken|Entsch[aä]digung|Commercial Registry/i;
// Balance/interest SUMMARY rows (top-of-statement totals) — not transactions.
const SUMMARY_RE =
  /^(opening balance|closing balance|total deposit|total withdrawal|total interest|average balance|balance summary|interest summary|annual equivalent rate|nominal interest rate|applicable withholding|tax rate)/i;
// A date cell that anchors a transaction row ("Jun 1, 2026" or "01/07/2026").
const DATE_RE =
  /^[A-Za-z]{3,}\.?\s+\d{1,2},?\s+\d{4}$|^\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}$/;
const IN_COL = /(money|paid)\s*in|credit|abono|ingreso/i;
const OUT_COL = /(money|paid)\s*out|debit|cargo|retiro|withdrawal/i;
const BAL_COL = /balance|saldo/i;
const DATE_COL = /date|fecha/i;
const DESC_COL = /descrip|concepto/i;

/** Flat join — the historical behavior, used verbatim for non-two-column PDFs. */
function flatJoin(items: PdfTextItem[]): string {
  return items
    .map((it) => it.str)
    .filter(Boolean)
    .join(" ");
}

/** Group text items into visual rows (same baseline within a small y tolerance). */
function groupRows(items: PdfTextItem[]): Row[] {
  const clean = items
    .filter((it) => it.str && it.str.trim())
    .map((it) => ({ str: it.str.replace(/\s+/g, " ").trim(), x: it.x, y: it.y }));
  clean.sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: Row[] = [];
  let cur: Row | null = null;
  for (const it of clean) {
    if (!cur || Math.abs(cur.y - it.y) > 3.2) {
      cur = { y: it.y, cells: [] };
      rows.push(cur);
    }
    cur.cells.push(it);
  }
  return rows;
}

const isHeaderRow = (row: Row): boolean =>
  row.cells.filter((c) => HEADER_KW.test(c.str)).length >= 3;

/**
 * Detect the transaction-table columns from the header row plus the row directly above and
 * below it (banks wrap "Money out" onto two lines). Header fragments are clustered by x, so
 * "Money"@468 + "out"@484 collapse into one `Money out` column.
 */
function detectColumns(rows: Row[]): { columns: Col[]; headerIndex: number } | null {
  const hi = rows.findIndex(isHeaderRow);
  if (hi < 0) return null;
  const pool: PdfTextItem[] = [];
  for (const idx of [hi - 1, hi, hi + 1]) {
    if (idx < 0 || idx >= rows.length) continue;
    for (const c of rows[idx].cells) {
      if (HEADER_KW.test(c.str) || HEADER_FRAG.test(c.str)) pool.push(c);
    }
  }
  pool.sort((a, b) => a.x - b.x);
  const clusters: { x: number; parts: PdfTextItem[] }[] = [];
  for (const it of pool) {
    const last = clusters[clusters.length - 1];
    if (last && Math.abs(last.x - it.x) <= 30) {
      last.parts.push(it);
      last.x = last.parts.reduce((s, p) => s + p.x, 0) / last.parts.length;
    } else {
      clusters.push({ x: it.x, parts: [it] });
    }
  }
  const columns: Col[] = clusters.map((cl) => {
    const parts = [...cl.parts].sort((a, b) => b.y - a.y || a.x - b.x);
    return { name: parts.map((p) => p.str).join(" ").replace(/\s+/g, " ").trim(), x: cl.x };
  });
  if (columns.length < 3) return null;
  return { columns, headerIndex: hi };
}

const hasInOut = (cols: Col[]): boolean =>
  !!(cols.find((c) => IN_COL.test(c.name)) && cols.find((c) => OUT_COL.test(c.name)));

const nearestCol = (x: number, cols: Col[]): Col =>
  cols.reduce((best, c) => (Math.abs(c.x - x) < Math.abs(best.x - x) ? c : best), cols[0]);

const findCol = (cols: Col[], re: RegExp): Col | undefined =>
  cols.find((c) => re.test(c.name));

/**
 * Reconstruct one page's transactions given the two-column layout. Emits one line per
 * date-anchored row as `date | description | ±amount | bal balance`, attaching description
 * fragments (which wrap above/below the data row) to the nearest transaction by y.
 */
function reconstructTwoColumnPage(rows: Row[], cols: Col[], headerIndex: number): string[] {
  const dateCol = findCol(cols, DATE_COL) || cols[0];
  const descCol = findCol(cols, DESC_COL) || cols[1] || cols[0];
  const inCol = findCol(cols, IN_COL);
  const outCol = findCol(cols, OUT_COL);
  const balCol = findCol(cols, BAL_COL);

  const slotOf = (row: Row): Record<string, string> => {
    const slot: Record<string, string> = {};
    for (const c of row.cells) {
      const col = nearestCol(c.x, cols);
      slot[col.name] = slot[col.name] ? `${slot[col.name]} ${c.str}` : c.str;
    }
    return slot;
  };

  interface Tx {
    y: number;
    date: string;
    desc: { y: number; text: string }[];
    amount: string;
    balance: string;
  }
  const txs: Tx[] = [];
  const fragments: { y: number; text: string }[] = [];

  const body = headerIndex >= 0 ? rows.slice(headerIndex + 1) : rows;
  for (const row of body) {
    const joined = row.cells.map((c) => c.str).join(" ");
    if (FOOTER_RE.test(joined)) continue;
    if (SUMMARY_RE.test((row.cells[0]?.str || "").trim())) continue;

    const slot = slotOf(row);
    const dateVal = (slot[dateCol.name] || "").trim();
    const isDate =
      DATE_RE.test(dateVal) || DATE_RE.test(dateVal.split(" ").slice(0, 3).join(" "));

    if (isDate) {
      const outV = outCol ? (slot[outCol.name] || "").trim() : "";
      const inV = inCol ? (slot[inCol.name] || "").trim() : "";
      let amount = "";
      if (outV && /\d/.test(outV)) amount = `-${outV}`;
      else if (inV && /\d/.test(inV)) amount = `+${inV}`;
      const ownDesc = (slot[descCol.name] || "").trim();
      txs.push({
        y: row.y,
        date: dateVal,
        desc: ownDesc ? [{ y: row.y, text: ownDesc }] : [],
        amount,
        balance: balCol ? (slot[balCol.name] || "").trim() : "",
      });
    } else {
      const descText = (slot[descCol.name] || "").trim();
      if (descText) fragments.push({ y: row.y, text: descText });
    }
  }

  // Attach each stray description fragment to the closest transaction by baseline distance.
  for (const f of fragments) {
    let best: Tx | null = null;
    let bd = Infinity;
    for (const t of txs) {
      const d = Math.abs(t.y - f.y);
      if (d < bd) {
        bd = d;
        best = t;
      }
    }
    if (best && bd <= 20) best.desc.push(f);
  }

  return txs.map((t) => {
    const desc =
      [...t.desc]
        .sort((a, b) => b.y - a.y)
        .map((d) => d.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim() || "(no description)";
    const amt = t.amount ? ` | ${t.amount}` : "";
    const bal = t.balance ? ` | bal ${t.balance}` : "";
    return `${t.date} | ${desc}${amt}${bal}`;
  });
}

/**
 * Turn a document's per-page text items into the string handed to the AI extractor.
 * Two-column statements (some page has both an out- and an in-column) are reconstructed;
 * every other document uses the flat join — identical to the pre-existing behavior.
 */
export function reconstructDocument(pages: PdfTextItem[][]): string {
  const pageRows = pages.map(groupRows);
  const detections = pageRows.map(detectColumns);
  const twoColumn = detections.some((d) => d !== null && hasInOut(d.columns));

  const parts: string[] = [];
  if (!twoColumn) {
    for (let p = 0; p < pages.length; p++) {
      parts.push(`\n\n--- Page ${p + 1} ---\n${flatJoin(pages[p])}`);
    }
    return parts.join("").trim();
  }

  // Carry the last seen two-column layout across pages (continuation pages may omit the header).
  let cols: Col[] | null = null;
  for (let p = 0; p < pages.length; p++) {
    const det = detections[p];
    let body: string;
    if (det && hasInOut(det.columns)) {
      cols = det.columns;
      body = reconstructTwoColumnPage(pageRows[p], det.columns, det.headerIndex).join("\n");
    } else if (cols) {
      body = reconstructTwoColumnPage(pageRows[p], cols, -1).join("\n");
    } else {
      body = flatJoin(pages[p]);
    }
    parts.push(`\n\n--- Page ${p + 1} ---\n${body}`);
  }
  return parts.join("").trim();
}
