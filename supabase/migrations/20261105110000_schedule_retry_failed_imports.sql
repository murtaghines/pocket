-- Phase 6.2: Schedule auto-retry CRON for failed imports
-- Runs every 15 minutes, picks up FAILED/PARTIAL imports < 24h old with < 3 retries.
-- Uses Supabase's pg_net extension to invoke the edge function.

-- Enable pg_net if not already enabled (required for HTTP calls from pg_cron)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule the retry job via pg_cron (runs every 15 minutes)
-- The edge function handles all the logic (finding candidates, downloading files, re-processing).
SELECT cron.schedule(
  'retry-failed-imports',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/retry-failed-imports',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
