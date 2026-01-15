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
    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Missing userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    const duplicatesToDelete: string[] = [];
    const hashUpdates: { id: string; hash: string }[] = [];
    const transferPairs: { id1: string; id2: string }[] = [];
    const seenHashes = new Map<string, string>(); // hash -> transaction id

    // Pass 1: Check/generate hashes and find duplicates
    for (const t of transactions) {
      // Generate hash if missing
      let hash = t.transaction_hash;
      if (!hash) {
        const dateStr = (t.date || '').replace(/-/g, '');
        const amountStr = Math.abs(t.amount || 0).toFixed(2);
        const normalizedDesc = normalizeDescription(t.description);
        const hashSource = `${dateStr}|${amountStr}|${normalizedDesc}`;
        hash = generateHash(hashSource);
        hashUpdates.push({ id: t.id, hash });
      }

      // Check for duplicates
      if (seenHashes.has(hash)) {
        duplicatesToDelete.push(t.id);
        console.log(`Duplicate found: ${t.description} (${t.date})`);
      } else {
        seenHashes.set(hash, t.id);
      }
    }

    // Pass 2: Detect transfer pairs (unlinked transfers)
    const transfers = transactions.filter(t => 
      t.type === 'transfer' && 
      !t.linked_transaction_id &&
      !duplicatesToDelete.includes(t.id)
    );

    // Group by absolute amount for faster matching
    const transfersByAmount = new Map<string, typeof transactions>();
    for (const t of transfers) {
      const key = Math.abs(t.amount).toFixed(2);
      if (!transfersByAmount.has(key)) {
        transfersByAmount.set(key, []);
      }
      transfersByAmount.get(key)!.push(t);
    }

    // Find matching pairs (opposite amounts, different banks, within 48h)
    for (const [amountKey, sameAmountTransfers] of transfersByAmount) {
      const outgoing = sameAmountTransfers.filter(t => t.amount < 0);
      const incoming = sameAmountTransfers.filter(t => t.amount > 0);

      for (const out of outgoing) {
        if (transferPairs.some(p => p.id1 === out.id || p.id2 === out.id)) continue;

        const outDate = new Date(out.date).getTime();
        
        for (const inc of incoming) {
          if (transferPairs.some(p => p.id1 === inc.id || p.id2 === inc.id)) continue;
          
          // Different banks
          if (out.bank && inc.bank && out.bank === inc.bank) continue;
          
          // Within 48 hours
          const incDate = new Date(inc.date).getTime();
          const hoursDiff = Math.abs(outDate - incDate) / (1000 * 60 * 60);
          
          if (hoursDiff <= 48) {
            transferPairs.push({ id1: out.id, id2: inc.id });
            console.log(`Transfer pair found: ${out.description} <-> ${inc.description}`);
            break;
          }
        }
      }
    }

    // Apply updates
    let duplicatesRemoved = 0;
    let hashesUpdated = 0;
    let transfersLinked = 0;

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

    // Update missing hashes
    for (const { id, hash } of hashUpdates) {
      if (duplicatesToDelete.includes(id)) continue;
      
      const { error } = await supabase
        .from('transactions')
        .update({ transaction_hash: hash })
        .eq('id', id);
      
      if (!error) hashesUpdated++;
    }

    // Link transfer pairs
    for (const { id1, id2 } of transferPairs) {
      // Update both transactions to link to each other
      const { error: err1 } = await supabase
        .from('transactions')
        .update({ linked_transaction_id: id2 })
        .eq('id', id1);

      const { error: err2 } = await supabase
        .from('transactions')
        .update({ linked_transaction_id: id1 })
        .eq('id', id2);

      if (!err1 && !err2) transfersLinked++;
    }

    const message = `Integrity verified: ${duplicatesRemoved} duplicates removed, ${transfersLinked} transfer pairs linked, ${hashesUpdated} hashes updated`;
    console.log(message);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message,
        stats: {
          duplicatesRemoved,
          transfersLinked,
          hashesUpdated,
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
