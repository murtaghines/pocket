
-- 1. Remove client-side direct INSERT policy on audit_log
DROP POLICY IF EXISTS "Users can create their own audit logs" ON public.audit_log;

-- 2. Server-side helper that validates ownership before writing audit rows
CREATE OR REPLACE FUNCTION public.log_audit_event(
  _entity_type text,
  _entity_id uuid,
  _action text,
  _diff jsonb DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Allow delete actions even if the parent row is already gone (logged after delete)
  IF NOT _ok AND _action NOT LIKE 'delete%' THEN
    RAISE EXCEPTION 'entity not owned by user';
  END IF;

  INSERT INTO public.audit_log(user_id, entity_type, entity_id, action, diff_json)
  VALUES (_uid, _entity_type, _entity_id, _action, _diff);
END;
$$;

REVOKE ALL ON FUNCTION public.log_audit_event(text,uuid,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_audit_event(text,uuid,text,jsonb) TO authenticated;

-- 3. Drop the unused deletion_confirmations table (no rows, no code references)
DROP TABLE IF EXISTS public.deletion_confirmations;
