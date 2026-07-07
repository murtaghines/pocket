import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Simple hash function
function generateHash(hashSource: string): string {
  let hash = 0;
  for (let i = 0; i < hashSource.length; i++) {
    const char = hashSource.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

// Normalize description for hash comparison
function normalizeDescription(desc: string): string {
  return (desc || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 30);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const authClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: authData, error: authError } = await authClient.auth.getUser();
    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    await req.json().catch(() => ({}));
    const userId = authData.user.id;

    console.log(`Running integrity check for user ${userId}`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get all transactions for this user
    const { data: transactions, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: true });

    if (fetchError) throw fetchError;

    if (!transactions || transactions.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No transactions to check',
          stats: { duplicatesRemoved: 0, transfersLinked: 0, hashesUpdated: 0 }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Checking integrity of ${transactions.length} transactions`);

    // NOTE (Fase 4, 2026-07-07): `transaction_hash` and `linked_transaction_id` columns
    // were dropped from `transactions` — the real dedup key is now the DB-enforced
    // UNIQUE(user_id, domain, fingerprint) index, computed once at import time from
    // immutable source fields (never from user edits). This residual pass is a secondary
    // safety net over (date, amount, description) for rows that predate that index or came
    // in through a path that doesn't set a fingerprint; it no longer persists a hash column,
    // it just recomputes in-memory each run. Transfer-pair linking is disabled (no column to
    // store it in) — see docs/epics/uploads.md Fase 4 for the split/link redesign this needs.
    const duplicatesToDelete: string[] = [];
    const seenHashes = new Map<string, string>(); // hash -> transaction id

    // Pass 1: find residual duplicates by (date, amount, normalized description)
    for (const t of transactions) {
      const dateStr = (t.date || '').replace(/-/g, '');
      const amountStr = Math.abs(t.amount || 0).toFixed(2);
      const normalizedDesc = normalizeDescription(t.description);
      const hash = generateHash(`${dateStr}|${amountStr}|${normalizedDesc}`);

      if (seenHashes.has(hash)) {
        duplicatesToDelete.push(t.id);
        console.log(`Duplicate found: ${t.description} (${t.date})`);
      } else {
        seenHashes.set(hash, t.id);
      }
    }

    // Apply updates
    let duplicatesRemoved = 0;

    // Delete duplicates
    if (duplicatesToDelete.length > 0) {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .in('id', duplicatesToDelete);

      if (error) {
        console.error('Error deleting duplicates:', error);
      } else {
        duplicatesRemoved = duplicatesToDelete.length;
      }
    }

    const message = `Integrity verified: ${duplicatesRemoved} duplicates removed`;
    console.log(message);

    return new Response(
      JSON.stringify({
        success: true,
        message,
        stats: {
          duplicatesRemoved,
          transfersLinked: 0,
          hashesUpdated: 0,
          totalChecked: transactions.length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in integrity check:', errorMessage);

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
