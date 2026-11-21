-- Step 1a: Rewrite take_portfolio_snapshot to read from investment_transactions
-- instead of the legacy investments table.
CREATE OR REPLACE FUNCTION take_portfolio_snapshot(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_value numeric;
  v_total_cost numeric;
  v_deposits numeric;
  v_withdrawals numeric;
  v_breakdown jsonb;
BEGIN
  SELECT
    COALESCE(SUM(current_value), 0),
    COALESCE(SUM(cost_basis), 0)
  INTO v_total_value, v_total_cost
  FROM holdings
  WHERE user_id = p_user_id AND NOT is_closed;

  SELECT
    COALESCE(SUM(CASE WHEN type = 'buy' THEN total_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'sell' THEN total_amount ELSE 0 END), 0)
  INTO v_deposits, v_withdrawals
  FROM investment_transactions
  WHERE user_id = p_user_id;

  SELECT COALESCE(jsonb_object_agg(
    asset_class,
    jsonb_build_object('value', class_value, 'costBasis', class_cost)
  ), '{}'::jsonb) INTO v_breakdown
  FROM (
    SELECT asset_class,
           SUM(current_value) as class_value,
           SUM(cost_basis) as class_cost
    FROM holdings
    WHERE user_id = p_user_id AND NOT is_closed
    GROUP BY asset_class
  ) sub;

  INSERT INTO portfolio_snapshots (user_id, snapshot_date, total_value, total_cost_basis,
    deposits_cumulative, withdrawals_cumulative, breakdown)
  VALUES (p_user_id, CURRENT_DATE, v_total_value, v_total_cost,
    v_deposits, v_withdrawals, v_breakdown)
  ON CONFLICT (user_id, snapshot_date, currency)
  DO UPDATE SET
    total_value = EXCLUDED.total_value,
    total_cost_basis = EXCLUDED.total_cost_basis,
    deposits_cumulative = EXCLUDED.deposits_cumulative,
    withdrawals_cumulative = EXCLUDED.withdrawals_cumulative,
    breakdown = EXCLUDED.breakdown;
END;
$$;

-- Step 1b: Rewrite log_audit_event to remove 'investment' entity type
CREATE OR REPLACE FUNCTION public.log_audit_event(
  _entity_type text, _entity_id uuid, _action text, _diff jsonb DEFAULT NULL::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _ok boolean := false;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;
  IF _entity_type NOT IN ('transaction','import','period') THEN
    RAISE EXCEPTION 'invalid entity_type: %', _entity_type;
  END IF;
  IF _action IS NULL OR length(_action) = 0 OR length(_action) > 64 THEN
    RAISE EXCEPTION 'invalid action';
  END IF;
  IF _entity_type = 'transaction' THEN
    SELECT EXISTS(SELECT 1 FROM public.transactions WHERE id = _entity_id AND user_id = _uid) INTO _ok;
  ELSIF _entity_type = 'import' THEN
    SELECT EXISTS(SELECT 1 FROM public.imports WHERE id = _entity_id AND user_id = _uid) INTO _ok;
  ELSIF _entity_type = 'period' THEN
    SELECT EXISTS(SELECT 1 FROM public.periods WHERE id = _entity_id AND user_id = _uid) INTO _ok;
  END IF;
  IF NOT _ok AND _action NOT LIKE 'delete%' THEN
    RAISE EXCEPTION 'entity not owned by user';
  END IF;
  INSERT INTO public.audit_log(user_id, entity_type, entity_id, action, diff_json)
  VALUES (_uid, _entity_type, _entity_id, _action, _diff);
END;
$function$;

-- Step 1c: Drop unused get_investment_summary RPC
DROP FUNCTION IF EXISTS public.get_investment_summary(uuid);

-- Step 1d: Drop legacy tables (CASCADE removes RLS, indexes, FKs)
DROP TABLE IF EXISTS public.investments CASCADE;
DROP TABLE IF EXISTS public.investment_accounts CASCADE;
