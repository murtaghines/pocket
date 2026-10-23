-- Files: a display name the user can edit (file_name stays as the identifier), and an archived state
-- that keeps the data but takes it out of every list and every analysis.
ALTER TABLE public.imports
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;

-- Remembers which transactions were hidden by archiving their file, so restoring the file only
-- un-hides those and never touches rows the user hid by hand.
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS hidden_by_archive uuid REFERENCES public.imports(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.set_import_archived(p_import_id uuid, p_archived boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF p_archived THEN
    UPDATE transactions
       SET is_hidden = true, hidden_by_archive = p_import_id
     WHERE import_id = p_import_id AND is_hidden = false;
  ELSE
    UPDATE transactions
       SET is_hidden = false, hidden_by_archive = NULL
     WHERE hidden_by_archive = p_import_id;
  END IF;
  UPDATE imports SET archived = p_archived WHERE id = p_import_id;
  PERFORM refresh_dashboard_views();
END;
$$;

-- Last time anything in each file was edited (from the audit log of its transactions).
CREATE OR REPLACE FUNCTION public.get_import_last_edits(p_user_id uuid)
RETURNS TABLE(import_id uuid, last_edited_at timestamptz)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT t.import_id, max(a.created_at)
  FROM audit_log a
  JOIN transactions t ON t.id::text = a.entity_id::text
  WHERE a.user_id = p_user_id
    AND a.entity_type = 'transaction'
    AND t.import_id IS NOT NULL
  GROUP BY t.import_id;
$$;
