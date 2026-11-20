-- Finds files in financial-files Storage bucket with no matching import record.
-- Called by the cleanup-orphan-files edge function (CRON).

CREATE OR REPLACE FUNCTION find_orphan_storage_files()
RETURNS TABLE(file_path text) AS $$
  SELECT o.name AS file_path
  FROM storage.objects o
  LEFT JOIN imports i ON i.file_storage_url = o.name
  WHERE o.bucket_id = 'financial-files'
    AND i.id IS NULL
    AND o.created_at < NOW() - INTERVAL '2 hours'
  LIMIT 100;
$$ LANGUAGE sql SECURITY DEFINER;

COMMENT ON FUNCTION find_orphan_storage_files IS
  'Returns Storage paths in financial-files with no matching import record, older than 2 hours.';
