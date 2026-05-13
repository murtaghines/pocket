import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { normalize, categorize } from "../_shared/categorizer.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { userId, dryRun = true, mode = 'all' } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[fix-categorization] Starting for user ${userId}, dryRun=${dryRun}, mode=${mode}`);

    // Fetch user profile for name matching
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('first_name, last_name, joint_account_names, investment_platforms')
      .eq('user_id', userId)
      .maybeSingle();

    // Build UserContext for categorizer
    const userContext = {
      firstName: userProfile?.first_name || '',
      lastName: userProfile?.last_name || '',
      jointAccountNames: userProfile?.joint_account_names || [],
      investmentPlatforms: userProfile?.investment_platforms || [],
    };

    console.log(`[fix-categorization] User: ${userContext.firstName} ${userContext.lastName}`);

    // Fetch category IDs
    const { data: categories } = await supabase
      .from('categories')
      .select('id, slug, movement_type')
      .eq('domain', 'CASHFLOW');

    const categorySlugToId: Record<string, string> = {};
    const categoryIdToSlug: Record<string, string> = {};
    categories?.forEach((c: any) => {
      if (c.slug) {
        categorySlugToId[c.slug] = c.id;
        categoryIdToSlug[c.id] = c.slug;
      }
    });

    // Fetch ALL cashflow transactions for this user
    const { data: allTxs, error: fetchErr } = await supabase
      .from('transactions')
      .select('id, description, description_raw, amount, movement, category, category_id, date, period_id, categorized_by')
      .eq('user_id', userId)
      .eq('domain', 'CASHFLOW');

    if (fetchErr) throw fetchErr;

    console.log(`[fix-categorization] Found ${allTxs?.length || 0} total transactions`);

    const fixes: Array<{
      id: string;
      description: string;
      oldMovement: string;
      newMovement: string;
      oldCategory: string;
      newCategory: string;
    }> = [];

    for (const tx of (allTxs || [])) {
      // Skip user-manually-set categories
      if (tx.categorized_by === 'user' || tx.categorized_by === 'user_rule') continue;

      const desc = tx.description_raw || tx.description || '';
      if (!desc.trim()) continue;

      const currentCategory = tx.category || '';
      const currentMovement = tx.movement || '';

      // Re-run the categorizer
      const rawResult = categorize(desc, tx.amount, userContext);

      // Sign-first guardrail: discard categorizer matches that contradict
      // the amount sign (TRANSFER is exempt — transfers can be ±).
      let result = rawResult;
      if (rawResult && rawResult.movement !== 'TRANSFER') {
        if (rawResult.movement === 'EXPENSE' && tx.amount > 0) result = null;
        else if (rawResult.movement === 'INCOME' && tx.amount < 0) result = null;
      }

      let targetMovement: string | null = null;
      let targetCategory: string | null = null;

      const signMovement = tx.amount > 0 ? 'INCOME' : tx.amount < 0 ? 'EXPENSE' : currentMovement;
      const isOtherCategory = currentCategory === 'other_income' || currentCategory === 'other_expense' || !currentCategory;
      const signMismatch = currentMovement !== 'TRANSFER' && currentMovement !== signMovement;

      if (signMismatch) {
        // Force a sign correction. Prefer categorizer's category if it agrees,
        // otherwise fall back to other_income / other_expense.
        if (result && result.movement === signMovement) {
          targetMovement = result.movement;
          targetCategory = result.category;
        } else {
          targetMovement = signMovement;
          targetCategory = signMovement === 'INCOME' ? 'other_income' : 'other_expense';
        }
      } else if (result && isOtherCategory && result.category !== 'other_expense' && result.category !== 'other_income') {
        // Upgrade an "other_*" placeholder to a more specific category when
        // the categorizer now knows it. Never downgrade a specific category.
        targetMovement = result.movement;
        targetCategory = result.category;
      } else {
        continue;
      }

      if (targetCategory !== currentCategory || targetMovement !== currentMovement) {
        fixes.push({
          id: tx.id,
          description: desc.substring(0, 80),
          oldMovement: currentMovement,
          newMovement: targetMovement,
          oldCategory: currentCategory,
          newCategory: targetCategory,
        });
      }
    }

    console.log(`[fix-categorization] Found ${fixes.length} transactions to re-categorize`);

    // ========== FIX DATE ASSIGNMENTS ==========
    const { data: periods } = await supabase
      .from('periods')
      .select('id, month_key')
      .eq('user_id', userId)
      .eq('domain', 'CASHFLOW');

    const periodIdToMonth: Record<string, string> = {};
    const monthToPeriodId: Record<string, string> = {};
    periods?.forEach((p: any) => {
      periodIdToMonth[p.id] = p.month_key;
      monthToPeriodId[p.month_key] = p.id;
    });

    const dateFixes: Array<{ id: string; date: string; oldPeriod: string; newPeriod: string }> = [];

    for (const tx of (allTxs || [])) {
      if (!tx.date || !tx.period_id) continue;
      const match = tx.date.match(/^(\d{4})-(\d{2})/);
      if (!match) continue;
      const txMonthKey = `${match[1]}-${match[2]}`;
      const periodMonth = periodIdToMonth[tx.period_id];
      if (periodMonth && txMonthKey !== periodMonth) {
        const correctPeriodId = monthToPeriodId[txMonthKey];
        if (correctPeriodId) {
          dateFixes.push({ id: tx.id, date: tx.date, oldPeriod: periodMonth, newPeriod: txMonthKey });
        }
      }
    }

    console.log(`[fix-categorization] Found ${dateFixes.length} date fixes`);

    // ========== APPLY FIXES ==========
    if (!dryRun) {
      let catFixCount = 0;
      for (const fix of fixes) {
        const newCategoryId = categorySlugToId[fix.newCategory] || null;
        const { error: updateErr } = await supabase
          .from('transactions')
          .update({
            movement: fix.newMovement,
            type: fix.newMovement.toLowerCase(),
            category: fix.newCategory,
            category_id: newCategoryId,
            categorized_by: 'fix_script_v2',
            category_source: 'FIX_SCRIPT_V2',
          })
          .eq('id', fix.id);
        
        if (!updateErr) catFixCount++;
        else console.error(`[fix-categorization] Error updating ${fix.id}:`, updateErr);
      }

      let dateFixCount = 0;
      for (const fix of dateFixes) {
        const correctPeriodId = monthToPeriodId[fix.newPeriod];
        if (correctPeriodId) {
          const { error: updateErr } = await supabase
            .from('transactions')
            .update({ period_id: correctPeriodId })
            .eq('id', fix.id);
          if (!updateErr) dateFixCount++;
        }
      }

      console.log(`[fix-categorization] Applied ${catFixCount} category fixes, ${dateFixCount} date fixes`);

      await supabase.from('audit_log').insert({
        user_id: userId,
        entity_type: 'bulk_fix',
        entity_id: userId,
        action: 'fix_categorization_v2',
        diff_json: {
          categoryFixes: catFixCount,
          dateFixes: dateFixCount,
          timestamp: new Date().toISOString(),
        }
      });

      return new Response(
        JSON.stringify({
          success: true,
          applied: true,
          categoryFixes: catFixCount,
          dateFixes: dateFixCount,
          details: {
            categorySamples: fixes.slice(0, 20),
            dateSamples: dateFixes.slice(0, 10),
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DRY RUN
    return new Response(
      JSON.stringify({
        success: true,
        dryRun: true,
        categoryFixesCount: fixes.length,
        dateFixesCount: dateFixes.length,
        categorySamples: fixes.slice(0, 30),
        dateSamples: dateFixes.slice(0, 10),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[fix-categorization] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
