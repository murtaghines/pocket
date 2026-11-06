-- Phase 6.2: Schedule auto-retry for failed imports
-- Requires pg_cron extension which is only available on Supabase Pro+ plans.
-- On plans without pg_cron, this migration is a no-op — retry can be triggered manually.

-- Enable pg_net if not already enabled (required for HTTP calls)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Only schedule the cron job if pg_cron is available
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron' AND installed_version IS NOT NULL
  ) THEN
    PERFORM cron.schedule(
      'retry-failed-imports',
      '*/15 * * * *',
      $job$
      SELECT net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/retry-failed-imports',
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
