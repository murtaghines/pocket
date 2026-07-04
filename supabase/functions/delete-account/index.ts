import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Identify the caller from their own token.
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "User not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    console.log(`Deleting account for user: ${userId}`);

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // 1) Remove the user's stored files. Storage is NOT covered by DB cascades,
    //    so it must be cleaned explicitly.
    const { data: files } = await adminClient.storage
      .from("financial-files")
      .list(userId);
    if (files && files.length > 0) {
      const filePaths = files.map((file) => `${userId}/${file.name}`);
      await adminClient.storage.from("financial-files").remove(filePaths);
      console.log(`Deleted ${files.length} files from storage`);
    }

    // 2) Delete the auth user. Every user-owned row in public.* is removed
    //    automatically via ON DELETE CASCADE foreign keys to auth.users, so we
    //    don't maintain a per-table delete list that could drift as the schema
    //    grows.
    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteAuthError) {
      console.error("Error deleting auth user:", deleteAuthError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to delete auth user" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Successfully deleted account for user: ${userId}`);
    return new Response(
      JSON.stringify({ success: true, message: "Account deleted successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in delete-account function:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
