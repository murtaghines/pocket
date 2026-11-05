/**
 * retry-failed-imports — CRON edge function
 *
 * Runs on a schedule (e.g. every 15 minutes) to find FAILED or PARTIAL imports
 * that are less than 24 hours old and have been retried fewer than 3 times,
 * then re-invokes process-import for each one.
 *
 * Designed to be called by pg_cron or Supabase's scheduled functions.
 * Authorization: uses the service role key (no user auth needed).
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const MAX_RETRIES = 3;
const MAX_AGE_HOURS = 24;
const BATCH_LIMIT = 5;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const cutoff = new Date(Date.now() - MAX_AGE_HOURS * 60 * 60 * 1000).toISOString();

    // Find retryable imports: FAILED or PARTIAL, < 24h old, < 3 retries
    const { data: candidates, error: queryError } = await supabase
      .from('imports')
      .select('id, user_id, domain, file_name, status, retry_count, error_message, account_id, file_storage_url, source_type, period_id')
      .in('status', ['FAILED', 'PARTIAL'])
      .lt('retry_count', MAX_RETRIES)
      .gte('uploaded_at', cutoff)
      .order('uploaded_at', { ascending: true })
      .limit(BATCH_LIMIT);

    if (queryError) {
      console.error('[retry-failed-imports] Query error:', queryError);
      return new Response(
        JSON.stringify({ error: queryError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!candidates || candidates.length === 0) {
      console.log('[retry-failed-imports] No retryable imports found');
      return new Response(
        JSON.stringify({ message: 'No retryable imports', retried: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[retry-failed-imports] Found ${candidates.length} retryable import(s)`);

    const results: Array<{ importId: string; status: string; message: string }> = [];

    for (const imp of candidates) {
      console.log(`[retry-failed-imports] Retrying import ${imp.id} (attempt ${imp.retry_count + 1}/${MAX_RETRIES}): ${imp.file_name}, status=${imp.status}`);

      // Bump retry_count and last_retry_at before attempting
      await supabase
        .from('imports')
        .update({
          retry_count: imp.retry_count + 1,
          last_retry_at: new Date().toISOString(),
        })
        .eq('id', imp.id);

      // For PARTIAL imports: the file was already partially processed. The existing
      // transactions are protected by fingerprint dedup — re-processing the same file
      // will skip already-inserted rows and only insert the ones that failed.
      //
      // For FAILED imports: no transactions landed, so the full file is re-processed.
      //
      // We need the original file content to re-process. If we have file_storage_url,
      // download it; otherwise the import can't be retried without the file content.
      if (!imp.file_storage_url) {
        console.log(`[retry-failed-imports] Import ${imp.id} has no file_storage_url, skipping`);
        results.push({
          importId: imp.id,
          status: 'skipped',
          message: 'No file_storage_url — cannot re-download the original file',
        });
        continue;
      }

      let fileContent: string | null = null;
      try {
        const response = await fetch(imp.file_storage_url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        fileContent = await response.text();
      } catch (downloadError) {
        console.error(`[retry-failed-imports] Failed to download file for import ${imp.id}:`, downloadError);
        results.push({
          importId: imp.id,
          status: 'download_failed',
          message: `Could not download original file: ${downloadError}`,
        });
        continue;
      }

      if (!fileContent || fileContent.length === 0) {
        console.log(`[retry-failed-imports] Empty file content for import ${imp.id}, skipping`);
        results.push({ importId: imp.id, status: 'skipped', message: 'Empty file content' });
        continue;
      }

      // Delete the old FAILED import so process-import can create a fresh one
      // with the same file hash (duplicate detection would otherwise block it).
      // For PARTIAL imports, we delete the import record too — fingerprint dedup
      // on the transactions table protects already-inserted rows.
      const { error: deleteError } = await supabase
        .from('imports')
        .delete()
        .eq('id', imp.id);

      if (deleteError) {
        console.error(`[retry-failed-imports] Failed to delete old import ${imp.id}:`, deleteError);
        results.push({ importId: imp.id, status: 'delete_failed', message: deleteError.message });
        continue;
      }

      // Re-invoke process-import via internal function call
      try {
        const processResponse = await fetch(`${SUPABASE_URL}/functions/v1/process-import`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            fileContent,
            fileName: imp.file_name,
            fileStorageUrl: imp.file_storage_url,
            accountId: imp.account_id,
            domain: imp.domain,
            sourceType: imp.source_type || 'OTHER',
          }),
        });

        const processResult = await processResponse.json();

        if (processResponse.ok && processResult.success) {
          console.log(`[retry-failed-imports] Import ${imp.id} retry succeeded: ${processResult.message}`);

          // Copy the retry_count to the new import record
          if (processResult.importId) {
            await supabase
              .from('imports')
              .update({ retry_count: imp.retry_count + 1 })
              .eq('id', processResult.importId);
          }

          results.push({
            importId: imp.id,
            status: 'success',
            message: processResult.message,
          });
        } else {
          console.error(`[retry-failed-imports] Import ${imp.id} retry failed: ${processResult.error || processResult.message}`);
          results.push({
            importId: imp.id,
            status: 'failed',
            message: processResult.error || processResult.message || 'Unknown error',
          });
        }
      } catch (invokeError) {
        console.error(`[retry-failed-imports] Failed to invoke process-import for ${imp.id}:`, invokeError);
        results.push({
          importId: imp.id,
          status: 'invoke_failed',
          message: `${invokeError}`,
        });
      }
    }

    const succeeded = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'failed' || r.status === 'invoke_failed').length;

    console.log(`[retry-failed-imports] Done: ${succeeded} succeeded, ${failed} failed, ${results.length - succeeded - failed} skipped`);

    return new Response(
      JSON.stringify({
        message: `Retried ${results.length} import(s): ${succeeded} succeeded, ${failed} failed`,
        retried: results.length,
        succeeded,
        failed,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[retry-failed-imports] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
