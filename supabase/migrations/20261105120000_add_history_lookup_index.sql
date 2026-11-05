-- Index to support per-user history-based categorization lookup.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_user_desc_norm
  ON transactions (user_id, description_norm)
  WHERE description_norm IS NOT NULL AND description_norm <> '';

-- RPC: given a user and a list of normalized descriptions, return the best
-- historical category for each one. User-corrected transactions count 10x.
-- Only returns entries with >= 2 past occurrences OR at least 1 user correction.
CREATE OR REPLACE FUNCTION history_category_lookup(
  _user_id uuid,
  _desc_norms text[]
)
RETURNS TABLE (
  description_norm_lower text,
  category text,
  movement text,
  confidence real
)
LANGUAGE sql STABLE
AS $$
  WITH votes AS (
    SELECT
      lower(t.description_norm) AS dn,
      t.category,
      t.movement::text,
      CASE WHEN t.user_corrected THEN 10 ELSE 1 END AS weight
    FROM transactions t
    WHERE t.user_id = _user_id
      AND lower(t.description_norm) = ANY (
        SELECT lower(unnest) FROM unnest(_desc_norms)
      )
      AND t.category IS NOT NULL
      AND t.movement IS NOT NULL
      AND t.movement <> 'TRANSFER'
      AND NOT t.category LIKE 'other_%'
  ),
  ranked AS (
    SELECT
      dn,
      category,
      movement,
      SUM(weight) AS total_weight,
      COUNT(*) AS cnt,
      BOOL_OR(weight > 1) AS has_user_correction,
      ROW_NUMBER() OVER (
        PARTITION BY dn
        ORDER BY SUM(weight) DESC, COUNT(*) DESC
      ) AS rn
    FROM votes
    GROUP BY dn, category, movement
  )
  SELECT
    r.dn AS description_norm_lower,
    r.category,
    r.movement,
    CASE
      WHEN r.has_user_correction THEN 0.95
      WHEN r.cnt >= 3 THEN 0.90
      ELSE 0.80
    END::real AS confidence
  FROM ranked r
  WHERE r.rn = 1
    AND (r.cnt >= 2 OR r.has_user_correction);
$$;
