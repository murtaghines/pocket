-- Fix: refresh_dashboard_views must run as SECURITY DEFINER because
-- REFRESH MATERIALIZED VIEW is a DDL command that the authenticated role
-- cannot execute. With SECURITY INVOKER the RPC silently fails from
-- the client, leaving materialized views stale after manual edits.

CREATE OR REPLACE FUNCTION refresh_dashboard_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_totals;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_opening_balances;
END;
$$;
