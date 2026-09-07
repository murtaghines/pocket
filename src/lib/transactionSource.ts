/**
 * transactionSource.ts — tells a manual entry apart from an imported one.
 *
 * The distinction drives what the user is allowed to do with a row:
 *
 *   imported (from a statement) → amount/category editable; description, date and
 *     account are properties of the file, so they're read-only. Never hard-deleted
 *     (a deleted row has no fingerprint left to dedup against, so re-uploading the
 *     same file would silently re-insert it) — it can only be hidden from totals.
 *   manual → every field editable, and deletable outright, since nothing ties it
 *     to a source file.
 *
 * Both use content-based SHA-256 fingerprints with a "manual" / "import" prefix
 * so they never collide. The DB unique constraint includes account_id, so the
 * same content on two different accounts is allowed.
 */

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function normalizeDescription(desc: string): string {
  return (desc || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/ref\.?\s*\d+/gi, '')
    .replace(/\*{4}\d{4}/g, '')
    .replace(/\d{10,}/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 200);
}

/** Content-based dedup key for a manual entry. Uses the same formula as
 *  imported fingerprints but with a "manual" prefix, so the two never collide. */
export async function buildManualFingerprint(
  date: string,
  amount: number,
  currency: string,
  description: string,
): Promise<string> {
  const normalizedDesc = normalizeDescription(description);
  const input = `manual|${date}|${amount.toFixed(2)}|${currency}|${normalizedDesc}`;
  return sha256(input);
}

export function isManualTransaction(tx: {
  import_id?: string | null;
}): boolean {
  return !tx.import_id;
}
