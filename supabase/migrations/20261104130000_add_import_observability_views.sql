-- Import pipeline observability views for monitoring health and costs.

-- Daily import summary: success rate, token consumption, processing strategies
CREATE OR REPLACE VIEW import_daily_stats AS
SELECT
  date_trunc('day', uploaded_at)::date AS day,
  count(*)                             AS total_imports,
  count(*) FILTER (WHERE status = 'NORMALIZED') AS succeeded,
  count(*) FILTER (WHERE status = 'FAILED')     AS failed,
  count(*) FILTER (WHERE status = 'PARTIAL')    AS partial,
  ROUND(
    100.0 * count(*) FILTER (WHERE status = 'NORMALIZED') / NULLIF(count(*), 0), 1
  )                                    AS success_rate_pct,
  coalesce(sum(ai_input_tokens), 0)    AS total_input_tokens,
  coalesce(sum(ai_output_tokens), 0)   AS total_output_tokens,
  coalesce(sum(transactions_count), 0) AS total_transactions,
  count(*) FILTER (WHERE processing_strategy = 'deterministic_csv') AS csv_deterministic,
  count(*) FILTER (WHERE processing_strategy = 'ai_haiku')          AS ai_haiku,
  count(*) FILTER (WHERE processing_strategy = 'ai_chunked_sonnet') AS ai_chunked_sonnet,
  count(*) FILTER (WHERE processing_strategy = 'ai_vision')         AS ai_vision
FROM imports
GROUP BY 1
ORDER BY 1 DESC;

COMMENT ON VIEW import_daily_stats IS 'Daily import pipeline metrics: success rate, token usage, processing strategies';

-- Top uncovered descriptions (categorizer gaps) — candidates for new patterns
CREATE OR REPLACE VIEW top_categorizer_gaps AS
SELECT
  description_norm,
  final_category,
  movement,
  categorized_by,
  count(*)          AS occurrences,
  count(DISTINCT user_id) AS unique_users,
  max(created_at)   AS last_seen
FROM categorizer_gaps
WHERE created_at > now() - interval '90 days'
GROUP BY description_norm, final_category, movement, categorized_by
HAVING count(*) >= 2
ORDER BY occurrences DESC
LIMIT 100;

COMMENT ON VIEW top_categorizer_gaps IS 'Most common descriptions the categorizer could not handle — review for new patterns';

-- Per-user import cost summary (for admin/billing)
CREATE OR REPLACE VIEW user_import_costs AS
SELECT
  user_id,
  date_trunc('month', uploaded_at)::date AS month,
  count(*)                               AS imports,
  coalesce(sum(ai_input_tokens), 0)      AS input_tokens,
  coalesce(sum(ai_output_tokens), 0)     AS output_tokens,
  coalesce(sum(transactions_count), 0)   AS transactions,
  count(*) FILTER (WHERE processing_strategy = 'deterministic_csv') AS free_imports
FROM imports
GROUP BY user_id, 2
ORDER BY 2 DESC, input_tokens DESC;

COMMENT ON VIEW user_import_costs IS 'Monthly AI token usage per user — for cost monitoring and billing alerts';
