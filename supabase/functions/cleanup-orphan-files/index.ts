/**
 * cleanup-orphan-files — CRON edge function
 *
 * Runs daily to remove files from the financial-files Storage bucket that
 * have no matching import record. These orphans happen when a user's tab
 * closes after the file is uploaded to Storage but before the edge function
 * creates the import record (~1-second window).
 *
 * Uses the `find_orphan_storage_files` RPC (only returns files > 2 hours
 * old, so in-flight uploads are never touched).
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { data: orphans, error: queryError } = await supabase.rpc(
      "find_orphan_storage_files"
    );

    if (queryError) {
      console.error("[cleanup-orphan-files] RPC error:", queryError);
      return new Response(JSON.stringify({ error: queryError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!orphans || orphans.length === 0) {
      console.log("[cleanup-orphan-files] No orphan files found");
      return new Response(
        JSON.stringify({ message: "No orphan files", deleted: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paths = orphans.map((o: { file_path: string }) => o.file_path);
    console.log(
      `[cleanup-orphan-files] Found ${paths.length} orphan file(s), deleting...`
    );

    const { error: deleteError } = await supabase.storage
      .from("financial-files")
      .remove(paths);

    if (deleteError) {
      console.error("[cleanup-orphan-files] Delete error:", deleteError);
      return new Response(
        JSON.stringify({
          error: deleteError.message,
          attempted: paths.length,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(
      `[cleanup-orphan-files] Deleted ${paths.length} orphan file(s)`
    );

    return new Response(
      JSON.stringify({
        message: `Deleted ${paths.length} orphan file(s)`,
        deleted: paths.length,
        paths,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[cleanup-orphan-files] Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
