-- Bring investments to parity with transactions on two fronts:
-- (1) soft-hide instead of hard delete, (2) audit trail support.
-- See docs/epics/investments.md.

-- 1) Soft-hide, mirroring transactions (20260422112309_...sql).
ALTER TABLE public.investments
  ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_investments_user_hidden
  ON public.investments(user_id, is_hidden)
  WHERE is_hidden = false;

-- 2) Let log_audit_event accept entity_type = 'investment', with the same
-- ownership-check shape used for 'transaction'/'import'/'period'.
CREATE OR REPLACE FUNCTION public.log_audit_event(_entity_type text, _entity_id uuid, _action text, _diff jsonb DEFAULT NULL::jsonb)
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
  IF _entity_type NOT IN ('transaction','import','period','investment') THEN
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
  ELSIF _entity_type = 'investment' THEN
    SELECT EXISTS(SELECT 1 FROM public.investments WHERE id = _entity_id AND user_id = _uid) INTO _ok;
  END IF;
  IF NOT _ok AND _action NOT LIKE 'delete%' THEN
    RAISE EXCEPTION 'entity not owned by user';
  END IF;
  INSERT INTO public.audit_log(user_id, entity_type, entity_id, action, diff_json)
  VALUES (_uid, _entity_type, _entity_id, _action, _diff);
END;
$function$;
