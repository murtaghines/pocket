import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Self-transfer signals that confirm a TRANSFER is truly between own accounts
const SELF_TRANSFER_SIGNALS = [
  'CUENTA PROPIA', 'ENTRE CUENTAS', 'TRASPASO', 'A MI CUENTA',
  'OWN ACCOUNT', 'INTERNAL TRANSFER', 'MOVIMIENTO INTERNO',
  'FROM SAVINGS', 'TO SAVINGS', 'INSTANT ACCESS',
  'BROKER', 'TRADING', 'ETF', 'INVESTMENT',
  'COCOS', 'TRADE REPUBLIC', 'DEGIRO', 'MYINVESTOR', 'INDEXA',
  'FINIZENS', 'ETORO',
  'TRASPASO A AHORRO', 'A FAVOR DE MI',
  'MERCADO PAGO A MERCADO PAGO', // self between MP accounts
];

// Patterns that should NOT be TRANSFER (generic bank transfer language)
const GENERIC_TRANSFER_PATTERNS = [
  /TRANSFERENCIA\s*(RECIBIDA|EMITIDA|INMEDIATA|SEPA|TEF)/i,
  /BIZUM\s*(RECIBIDO|ENVIADO|A\s|DE\s)/i,
  /SEPA\s*CREDIT\s*TRANSFER/i,
  /RECEIVED\s*TRANSFER/i,
  /OUTGOING\s*TRANSFER/i,
  /BANK\s*TRANSFER/i,
  /WIRE\s*TRANSFER/i,
  /FASTER\s*PAYMENT/i,
];

function isGenericTransferDescription(desc: string): boolean {
  const upper = (desc || '').toUpperCase();
  return GENERIC_TRANSFER_PATTERNS.some(p => p.test(upper));
}

function hasSelfTransferSignal(desc: string): boolean {
  const upper = (desc || '').toUpperCase();
  return SELF_TRANSFER_SIGNALS.some(s => upper.includes(s));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { userId, dryRun = true } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[fix-categorization] Starting for user ${userId}, dryRun=${dryRun}`);

    // Fetch category IDs
    const { data: categories } = await supabase
      .from('categories')
      .select('id, slug, movement_type')
      .eq('domain', 'CASHFLOW');

    const categorySlugToId: Record<string, string> = {};
    categories?.forEach((c: any) => { if (c.slug) categorySlugToId[c.slug] = c.id; });

    // ========== FIX 1: TRANSFER transactions that should be INCOME/EXPENSE ==========
    const { data: transferTxs, error: fetchErr } = await supabase
      .from('transactions')
      .select('id, description, description_raw, amount, movement, category, date, period_id')
      .eq('user_id', userId)
      .eq('movement', 'TRANSFER')
      .eq('domain', 'CASHFLOW');

    if (fetchErr) throw fetchErr;

    const transferFixes: Array<{ id: string; oldMovement: string; newMovement: string; oldCategory: string; newCategory: string; description: string }> = [];

    for (const tx of (transferTxs || [])) {
      const descRaw = tx.description_raw || tx.description || '';
      
      // If it has explicit self-transfer signals, keep as TRANSFER
      if (hasSelfTransferSignal(descRaw)) continue;
      
      // If it's a generic transfer description without self-transfer signals, fix it
      const newMovement = tx.amount >= 0 ? 'INCOME' : 'EXPENSE';
      const newCategory = tx.amount >= 0 ? 'other_income' : 'other_expense';
      
      transferFixes.push({
        id: tx.id,
        oldMovement: tx.movement,
        newMovement,
        oldCategory: tx.category,
        newCategory,
        description: descRaw.substring(0, 60),
      });
    }

    console.log(`[fix-categorization] Found ${transferFixes.length} TRANSFER transactions to fix`);

    // ========== FIX 2: Date assignments (last day of month shifted to next month) ==========
    // Find transactions where the date is the last day of a month but the period is wrong
    const { data: allTxs, error: allErr } = await supabase
      .from('transactions')
      .select('id, date, period_id')
      .eq('user_id', userId)
      .eq('domain', 'CASHFLOW');

    if (allErr) throw allErr;

    // Get all periods for this user
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
      
      // Extract month from date string directly (no Date parsing)
      const match = tx.date.match(/^(\d{4})-(\d{2})/);
      if (!match) continue;
      
      const txMonthKey = `${match[1]}-${match[2]}`;
      const periodMonth = periodIdToMonth[tx.period_id];
      
      if (periodMonth && txMonthKey !== periodMonth) {
        // Transaction date doesn't match its period
        const correctPeriodId = monthToPeriodId[txMonthKey];
        if (correctPeriodId) {
          dateFixes.push({
            id: tx.id,
            date: tx.date,
            oldPeriod: periodMonth,
            newPeriod: txMonthKey,
          });
        }
      }
    }

    console.log(`[fix-categorization] Found ${dateFixes.length} transactions with wrong period assignment`);

    // ========== APPLY FIXES ==========
    if (!dryRun) {
      let transferFixCount = 0;
      for (const fix of transferFixes) {
        const newCategoryId = categorySlugToId[fix.newCategory] || null;
        const { error: updateErr } = await supabase
          .from('transactions')
          .update({
            movement: fix.newMovement,
            type: fix.newMovement.toLowerCase(),
            category: fix.newCategory,
            category_id: newCategoryId,
            categorized_by: 'fix_script',
            category_source: 'FIX_SCRIPT',
          })
          .eq('id', fix.id);
        
        if (!updateErr) transferFixCount++;
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

      console.log(`[fix-categorization] Applied ${transferFixCount} transfer fixes, ${dateFixCount} date fixes`);

      // Audit log
      await supabase.from('audit_log').insert({
        user_id: userId,
        entity_type: 'bulk_fix',
        entity_id: userId,
        action: 'fix_categorization',
        diff_json: {
          transferFixes: transferFixCount,
          dateFixes: dateFixCount,
          timestamp: new Date().toISOString(),
        }
      });

      return new Response(
        JSON.stringify({
          success: true,
          applied: true,
          transferFixes: transferFixCount,
          dateFixes: dateFixCount,
          details: {
            transferSamples: transferFixes.slice(0, 10),
            dateSamples: dateFixes.slice(0, 10),
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DRY RUN: Just return what would be changed
    return new Response(
      JSON.stringify({
        success: true,
        dryRun: true,
        transferFixesCount: transferFixes.length,
        dateFixesCount: dateFixes.length,
        transferSamples: transferFixes.slice(0, 20),
        dateSamples: dateFixes.slice(0, 20),
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

