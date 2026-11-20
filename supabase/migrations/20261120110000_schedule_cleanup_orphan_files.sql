-- Schedule daily cleanup of orphan storage files.
-- Requires pg_cron (Supabase Pro+). No-op on plans without it.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron' AND installed_version IS NOT NULL
  ) THEN
    PERFORM cron.schedule(
      'cleanup-orphan-files',
      '0 4 * * *',
      $job$
      SELECT net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/cleanup-orphan-files',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
        ),
        body := '{}'::jsonb
      ) AS request_id;
      $job$
    );
  END IF;
END
$$;
