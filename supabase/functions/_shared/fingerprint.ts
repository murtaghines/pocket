// Deduplication + hashing primitives for the imports pipeline.
//
// These four pure functions were extracted verbatim from process-import/index.ts so they
// can be unit-tested (see tests/fingerprint.test.ts) and eventually shared with the other
// edge functions that currently re-implement the same logic (check-data-integrity).
//
// They rely only on the global Web Crypto API (`crypto.subtle`), which is available in both
// Deno and Node 20+, so this module imports nothing and is safe to load under Vitest.
//
// NOTE (Fase 1): process-import still holds its own private copies of these. Rewire it to
// import from here as part of the fingerprint-NULL correctness fix, then redeploy and run
// the imports-reviewer. Until then, keep the two implementations byte-identical.

export async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function normalizeDescription(desc: string): string {
  return (desc || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/ref\.?\s*\d+/gi, '')
    .replace(/\*{4}\d{4}/g, '')
    .replace(/\d{10,}/g, '')
    .trim()
    .substring(0, 200);
}

export async function calculateFingerprint(
  userId: string,
  accountId: string | null,
  sourceTransactionId: string | null,
  postedDate: string,
  amountSigned: number,
  currency: string,
  descriptionRaw: string,
  runningBalance: number | null,
): Promise<string> {
  if (sourceTransactionId) {
    const input = `${userId}|${accountId || 'no-account'}|${sourceTransactionId}`;
    return await sha256(input);
  }

  const normalizedDesc = normalizeDescription(descriptionRaw);
  const balancePart = runningBalance !== null ? `|${runningBalance.toFixed(2)}` : '';
  const input = `${userId}|${accountId || 'no-account'}|${postedDate}|${amountSigned.toFixed(2)}|${currency}|${normalizedDesc}${balancePart}`;
  return await sha256(input);
}

export function extractMonthKey(dateStr: string): string {
  // Parse YYYY-MM-DD directly to avoid timezone issues with new Date()
  const match = dateStr.match(/^(\d{4})-(\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}`;
  }
  // Fallback for other formats
  const date = new Date(dateStr + 'T12:00:00Z');
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}
