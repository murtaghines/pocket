import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function buildEmailHtml(code: string, firstName: string) {
  const name = firstName ? firstName : "there";
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:480px;">
        <tr><td style="background:#3391D0;padding:32px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:32px;font-weight:700;letter-spacing:-0.5px;">pocket</h1>
        </td></tr>
        <tr><td style="padding:40px 32px;">
          <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:600;">Hi ${name},</h2>
          <p style="margin:0 0 28px;color:#6b7280;font-size:15px;line-height:1.5;">
            Use this code to verify your email and continue setting up your pocket account.
          </p>
          <div style="background:#f9fafb;border:2px dashed #3391D0;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
            <div style="font-size:42px;font-weight:700;letter-spacing:12px;color:#3391D0;font-family:'SF Mono',Menlo,monospace;">${code}</div>
          </div>
          <p style="margin:0;color:#9ca3af;font-size:13px;text-align:center;">
            This code expires in 10 minutes. If you didn't request it, ignore this email.
          </p>
        </td></tr>
        <tr><td style="padding:20px;text-align:center;background:#fafafa;border-top:1px solid #f0f0f0;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">© pocket — Take control of your finances</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email, firstName } = await req.json();
    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "Email required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const normalized = email.trim().toLowerCase();
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Rate limit: 1 send per 30s per email
    const { data: recent } = await supabase
      .from("email_otps")
      .select("created_at")
      .eq("email", normalized)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (recent && Date.now() - new Date(recent.created_at).getTime() < 30_000) {
      return new Response(JSON.stringify({ error: "Please wait before requesting another code." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Invalidate previous unconsumed codes
    await supabase.from("email_otps").update({ consumed_at: new Date().toISOString() })
      .eq("email", normalized).is("consumed_at", null);

    // Generate 6-digit code
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const code_hash = await sha256(code);
    const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: insertErr } = await supabase.from("email_otps").insert({
      email: normalized, code_hash, expires_at,
    });
    if (insertErr) throw insertErr;

    // Send via Resend
    const resendResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "pocket <onboarding@resend.dev>",
        to: [normalized],
        subject: `Your pocket code: ${code}`,
        html: buildEmailHtml(code, (firstName || "").trim()),
      }),
    });

    if (!resendResp.ok) {
      const txt = await resendResp.text();
      console.error("Resend error:", txt);
      return new Response(JSON.stringify({ error: "Email service failed" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("send-otp-code error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
