import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email, code, firstName, lastName } = await req.json();
    if (!email || !code) {
      return new Response(JSON.stringify({ error: "Email and code required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const normalized = String(email).trim().toLowerCase();
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Get latest unconsumed OTP
    const { data: otp, error: fetchErr } = await supabase
      .from("email_otps")
      .select("*")
      .eq("email", normalized)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!otp) {
      return new Response(JSON.stringify({ error: "No active code. Please request a new one." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (new Date(otp.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: "Code expired. Please request a new one." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (otp.attempts >= 5) {
      return new Response(JSON.stringify({ error: "Too many attempts. Please request a new code." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const submittedHash = await sha256(String(code).trim());
    if (submittedHash !== otp.code_hash) {
      await supabase.from("email_otps").update({ attempts: otp.attempts + 1 }).eq("id", otp.id);
      return new Response(JSON.stringify({ error: "Invalid code" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Mark consumed
    await supabase.from("email_otps").update({ consumed_at: new Date().toISOString() }).eq("id", otp.id);

    // Find or create the user
    const { data: existingList } = await supabase.auth.admin.listUsers();
    let user = existingList.users.find(u => u.email?.toLowerCase() === normalized);

    if (!user) {
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email: normalized,
        email_confirm: true,
        user_metadata: {
          first_name: (firstName || "").trim(),
          last_name: (lastName || "").trim(),
        },
      });
      if (createErr || !created.user) throw createErr || new Error("Failed to create user");
      user = created.user;
    } else if (!user.email_confirmed_at) {
      await supabase.auth.admin.updateUserById(user.id, { email_confirm: true });
    }

    // Generate magic link to obtain a hashed_token the client can exchange for a session
    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: normalized,
    });
    if (linkErr || !linkData) throw linkErr || new Error("Failed to generate session");

    return new Response(
      JSON.stringify({
        ok: true,
        userId: user.id,
        hashed_token: linkData.properties?.hashed_token,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("verify-otp-code error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
