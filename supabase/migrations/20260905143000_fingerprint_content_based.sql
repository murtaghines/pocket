-- Migrate fingerprints from the old formula (which included accountId / sourceTransactionId)
-- to the new content-based formula: SHA-256("import"|"manual" | date | amount | currency | normalizedDescription).
-- Also widen the unique index to include account_id so the same content on two accounts is allowed.
--
-- Same-content duplicates (two coffees on the same day) get a collision counter appended
-- so the unique constraint is satisfied. The first occurrence keeps the clean content hash
-- (matches what the edge function computes on re-import for dedup).

-- 1. Enable pgcrypto for digest()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Helper that mirrors the JS normalizeDescription() byte-for-byte:
--    NFD decompose → strip combining marks U+0300-U+036F → lowercase → collapse ws →
--    strip ref numbers → strip masked cards → strip long digit runs → trim → truncate 200
CREATE OR REPLACE FUNCTION _normalize_description(raw text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT left(
    trim(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace(
                  normalize(lower(coalesce(raw, '')), NFD),
                  E'[̀-ͯ]', '', 'g'
                ),
                '\s+', ' ', 'g'
              ),
              'ref\.?\s*\d+', '', 'gi'
            ),
            '\*{4}\d{4}', '', 'g'
          ),
          '\d{10,}', '', 'g'
        ),
        '\s+', ' ', 'g'
      )
    ),
    200
  );
$$;

-- 3. Drop old unique index BEFORE recomputing (the old index lacks account_id,
--    so same-content transactions across different accounts would collide)
DROP INDEX IF EXISTS idx_transactions_fingerprint;

-- 4a. Recompute imported transaction fingerprints (with collision counter for same-content dups)
WITH base AS (
  SELECT id,
    encode(digest(
      'import|' || date::text || '|' || to_char(amount, 'FM999999999990.00') || '|'
      || coalesce(currency, 'EUR') || '|'
      || _normalize_description(coalesce(original_description, description)),
      'sha256'
    ), 'hex') AS base_fp,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, domain, account_id,
        encode(digest(
          'import|' || date::text || '|' || to_char(amount, 'FM999999999990.00') || '|'
          || coalesce(currency, 'EUR') || '|'
          || _normalize_description(coalesce(original_description, description)),
          'sha256'
        ), 'hex')
      ORDER BY created_at, id
    ) AS rn
  FROM transactions
  WHERE import_id IS NOT NULL
)
UPDATE transactions t
SET fingerprint = CASE
    WHEN b.rn = 1 THEN b.base_fp
    ELSE encode(digest(b.base_fp || ':' || b.rn::text, 'sha256'), 'hex')
  END
FROM base b
WHERE t.id = b.id;

-- 4b. Recompute manual transaction fingerprints (same collision handling)
WITH base AS (
  SELECT id,
    encode(digest(
      'manual|' || date::text || '|' || to_char(amount, 'FM999999999990.00') || '|'
      || coalesce(currency, 'EUR') || '|'
      || _normalize_description(description),
      'sha256'
    ), 'hex') AS base_fp,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, domain, account_id,
        encode(digest(
          'manual|' || date::text || '|' || to_char(amount, 'FM999999999990.00') || '|'
          || coalesce(currency, 'EUR') || '|'
          || _normalize_description(description),
          'sha256'
        ), 'hex')
      ORDER BY created_at, id
    ) AS rn
  FROM transactions
  WHERE import_id IS NULL
)
UPDATE transactions t
SET fingerprint = CASE
    WHEN b.rn = 1 THEN b.base_fp
    ELSE encode(digest(b.base_fp || ':' || b.rn::text, 'sha256'), 'hex')
  END
FROM base b
WHERE t.id = b.id;

-- 5. Create the new unique index that includes account_id
CREATE UNIQUE INDEX idx_transactions_fingerprint
  ON public.transactions (user_id, domain, account_id, fingerprint);

-- 6. Clean up helper
DROP FUNCTION IF EXISTS _normalize_description(text);
