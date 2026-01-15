import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
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

    // Parse request body for the confirmation code
    const body = await req.json().catch(() => ({}));
    const { code } = body;

    if (!code || typeof code !== "string" || code.length !== 6) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid confirmation code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the confirmation code
    const { data: confirmation, error: confirmError } = await adminClient
      .from("deletion_confirmations")
      .select("*")
      .eq("user_id", userId)
      .eq("code", code)
      .single();

    if (confirmError || !confirmation) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid or expired confirmation code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if code has expired
    if (new Date(confirmation.expires_at) < new Date()) {
      await adminClient.from("deletion_confirmations").delete().eq("id", confirmation.id);
      return new Response(
        JSON.stringify({ success: false, error: "Confirmation code has expired" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Deleting account for user: ${userId}`);

    // Delete user data from all tables in the correct order (respecting foreign keys)
    const tablesToDelete = [
      "deletion_confirmations",
      "investments",
      "transactions",
      "import_rows",
      "imports",
      "uploads",
      "investment_accounts",
      "categorization_rules",
      "accounts",
      "periods",
      "audit_log",
      "user_preferences",
      "profiles",
    ];

    for (const table of tablesToDelete) {
      const { error } = await adminClient
        .from(table)
        .delete()
        .eq("user_id", userId);
      
      if (error) {
        console.error(`Error deleting from ${table}:`, error);
        // Continue with other tables even if one fails
      } else {
        console.log(`Deleted user data from ${table}`);
      }
    }

    // Delete files from storage
    const { data: files } = await adminClient.storage
      .from("financial-files")
      .list(userId);

    if (files && files.length > 0) {
      const filePaths = files.map((file) => `${userId}/${file.name}`);
      await adminClient.storage.from("financial-files").remove(filePaths);
      console.log(`Deleted ${files.length} files from storage`);
    }

    // Finally, delete the auth user
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
