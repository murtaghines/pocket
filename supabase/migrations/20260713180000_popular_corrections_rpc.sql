-- Fase 7C: Surface frequently corrected patterns across users for manual
-- review and potential promotion to the shared categorizer.
CREATE OR REPLACE FUNCTION get_popular_corrections(_min_users int DEFAULT 5)
RETURNS TABLE(pattern text, movement text, category text, user_count bigint)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT pattern, movement, category, COUNT(DISTINCT user_id) as user_count
  FROM user_rules
  WHERE is_active = true AND source = 'user_correction'
  GROUP BY pattern, movement, category
  HAVING COUNT(DISTINCT user_id) >= _min_users
  ORDER BY user_count DESC
  LIMIT 50;
$$;
