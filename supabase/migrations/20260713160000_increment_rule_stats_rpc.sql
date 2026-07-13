-- Activates the previously-dead user_rules.applied_count / last_applied_at columns.
-- process-import calls this once per rule per import (batched hit count), so rule
-- effectiveness becomes visible in Settings → Categories & rules.
CREATE OR REPLACE FUNCTION public.increment_rule_stats(_rule_id uuid, _hit_count int)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.user_rules
  SET applied_count = COALESCE(applied_count, 0) + _hit_count,
      last_applied_at = now()
  WHERE id = _rule_id;
$$;

REVOKE ALL ON FUNCTION public.increment_rule_stats(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_rule_stats(uuid, int) TO service_role;
