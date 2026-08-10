/**
 * transactionSource.ts — tells a manual entry apart from an imported one.
 *
 * The distinction drives what the user is allowed to do with a row, so it has to
 * be right for rows that already exist, not just new ones:
 *
 *   imported (from a statement) → amount/category editable; description, date and
 *     account are properties of the file, so they're read-only. Never hard-deleted
 *     (a deleted row has no fingerprint left to dedup against, so re-uploading the
 *     same file would silently re-insert it) — it can only be hidden from totals.
 *   manual → every field editable, and deletable outright, since nothing ties it
 *     to a source file.
 *
 * `import_id` alone is NOT a safe marker: manual entries added to a month that
 * already had a statement used to be stamped with that statement's import_id,
 * which both made them look imported and put them in the blast radius of
 * "delete file" (deleteImport removes every transaction carrying the id).
 * The fingerprint is the durable marker — manual inserts have minted a
 * `manual-…` one since day one, while imported rows carry a content sha256 —
 * so it classifies pre-existing rows correctly with no backfill required.
 */

export const MANUAL_FINGERPRINT_PREFIX = "manual-";

/** Mints the unique dedup key for a manual entry. Never collides with the
 *  sha256 fingerprints that process-import computes from file contents. */
export function buildManualFingerprint(userId: string): string {
  return `${MANUAL_FINGERPRINT_PREFIX}${userId}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

export function isManualTransaction(tx: {
  import_id?: string | null;
  fingerprint?: string | null;
}): boolean {
  if (tx.fingerprint) return tx.fingerprint.startsWith(MANUAL_FINGERPRINT_PREFIX);
  // Fingerprint not loaded on this query — fall back to the link to a source file.
  return !tx.import_id;
}
