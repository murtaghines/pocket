import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/**
 * Apply user-created categorization rules retroactively to historical transactions.
 * 
 * Input: { rules: Array<{ pattern, categoryId, categorySlug, movement }>, excludeTransactionIds?: string[] }
 * 
 * For each rule, finds transactions matching the pattern in description/description_norm
 * that were NOT manually categorized, and updates them.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get authenticated user
    const supabaseAuth = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { rules, excludeTransactionIds = [] } = await req.json();

    if (!rules || !Array.isArray(rules) || rules.length === 0) {
      return new Response(JSON.stringify({ error: 'No rules provided' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let totalUpdated = 0;
    const results: Array<{ pattern: string; categorySlug: string; updated: number }> = [];

    for (const rule of rules) {
      const { pattern, categoryId, categorySlug, movement } = rule;
      if (!pattern || !categorySlug || !movement) continue;

      // Escape special characters for ilike
      const escapedPattern = pattern.replace(/%/g, '\\%').replace(/_/g, '\\_');

      // Find matching transactions not manually categorized
      const { data: matchingTxs, error: fetchError } = await supabase
        .from('transactions')
        .select('id')
        .eq('user_id', user.id)
        .eq('domain', 'CASHFLOW')
        .neq('categorized_by', 'user')
        .neq('categorized_by', 'user_rule')
        .or(`description_norm.ilike.%${escapedPattern}%,description.ilike.%${escapedPattern}%`);

      if (fetchError) {
        console.error(`Error fetching for pattern "${pattern}":`, fetchError);
        results.push({ pattern, categorySlug, updated: 0 });
        continue;
      }

      // Filter out the transactions we just edited (avoid double-updating)
      const txIds = (matchingTxs || [])
        .map(t => t.id)
        .filter(id => !excludeTransactionIds.includes(id));

      if (txIds.length === 0) {
        results.push({ pattern, categorySlug, updated: 0 });
        continue;
      }

      // Update in batches of 200
      let updated = 0;
      for (let i = 0; i < txIds.length; i += 200) {
        const batch = txIds.slice(i, i + 200);
        const { error: updateError } = await supabase
          .from('transactions')
          .update({
            movement,
            category: categorySlug,
            category_id: categoryId || null,
            category_source: 'RULE',
            categorized_by: 'user_rule',
          })
          .in('id', batch);

        if (!updateError) {
          updated += batch.length;
        } else {
          console.error(`Error updating batch:`, updateError);
        }
      }

      totalUpdated += updated;
      results.push({ pattern, categorySlug, updated });
    }

    console.log(`[apply-rules-retroactive] Applied ${rules.length} rules, updated ${totalUpdated} transactions`);

    return new Response(
      JSON.stringify({ success: true, totalUpdated, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[apply-rules-retroactive] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
