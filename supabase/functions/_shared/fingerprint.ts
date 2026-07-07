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
  _runningBalance?: number | null, // Kept for backwards-compat but NOT used in hash
): Promise<string> {
  if (sourceTransactionId) {
    const input = `${userId}|${accountId || 'no-account'}|${sourceTransactionId}`;
    return await sha256(input);
  }

  // Dedup key: date, amount, currency, description, and ACCOUNT.
  // NOT running_balance — it's dynamic (changes when reimporting with earlier-dated txs),
  // causing false negatives on dedup. ALSO NOT user_id — already enforced by DB uniqueness.
  const normalizedDesc = normalizeDescription(descriptionRaw);
  const input = `${accountId || 'no-account'}|${postedDate}|${amountSigned.toFixed(2)}|${currency}|${normalizedDesc}`;
  return await sha256(input);
}

export function extractMonthKey(dateStr: string): string {
  const s = (dateStr || '').trim();

  // Strict ISO YYYY-MM(-DD…) — parsed directly to avoid timezone drift.
  const iso = s.match(/^(\d{4})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}`;

  // Year-first with slash/dot separators: 2024/03/09 or 2024.03.09
  const ymd = s.match(/^(\d{4})[/.](\d{1,2})/);
  if (ymd) return `${ymd[1]}-${ymd[2].padStart(2, '0')}`;

  // Fallback: let Date parse it at noon UTC to avoid month rollover at the day boundary.
  // Guard against NaN — the old code returned a bogus "NaN-NaN" key for any non-ISO date,
  // which silently dropped those rows into the skipped-month bucket.
  const parsed = new Date(s.includes('T') ? s : `${s}T12:00:00Z`);
  const usable = isNaN(parsed.getTime()) ? new Date(s) : parsed;
  if (isNaN(usable.getTime())) return '';

  return `${usable.getUTCFullYear()}-${String(usable.getUTCMonth() + 1).padStart(2, '0')}`;
}
