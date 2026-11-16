/**
 * resolve-import-split — Resolves a multi-track import split.
 *
 * When process-import detects multiple balance chains in a single document,
 * it hides secondary-chain transactions and stores split metadata on the import.
 * This function receives the user's decision about where each secondary track
 * should go: an existing account, a new account, or discard.
 *
 * Request body:
 * {
 *   importId: string,
 *   decisions: Array<{
 *     chain_index: number,         // which chain (1+, 0 is always the primary)
 *     action: 'assign' | 'create' | 'discard',
 *     account_id?: string,         // for 'assign' — existing account to move txns to
 *     new_account?: {              // for 'create' — create a new account
 *       name: string,
 *       institution?: string,
 *       currency?: string,
 *     },
 *   }>
 * }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', ''),
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;
    const body = await req.json();
    const { importId, decisions } = body;

    if (!importId || !Array.isArray(decisions) || decisions.length === 0) {
      return new Response(JSON.stringify({ error: 'importId and decisions[] are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load the import and validate ownership + split status
    const { data: imp, error: impError } = await supabase
      .from('imports')
      .select('id, user_id, account_id, split_tracks')
      .eq('id', importId)
      .single();

    if (impError || !imp) {
      return new Response(JSON.stringify({ error: 'Import not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (imp.user_id !== userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const splitTracks = imp.split_tracks as any;
    if (!splitTracks || splitTracks.status !== 'pending') {
      return new Response(JSON.stringify({ error: 'No pending split to resolve' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const primaryAccountId = imp.account_id;
    const tracks = splitTracks.tracks as any[];

    // Process each decision
    const results: Array<{ chain_index: number; action: string; account_id?: string; transaction_count: number }> = [];

    for (const decision of decisions) {
      const { chain_index, action } = decision;

      // Skip primary chain (index 0 — already assigned)
      if (chain_index === 0) continue;

      const track = tracks.find((t: any) => t.chain_index === chain_index);
      if (!track) {
        console.warn(`[resolve-import-split] Track ${chain_index} not found in split metadata`);
        continue;
      }

      // Get hidden transactions for this chain from this import
      // We identify them by the import_id + is_hidden + account_id (they were inserted into the primary account)
      const { data: hiddenTxns, error: txError } = await supabase
        .from('transactions')
        .select('id, fingerprint')
        .eq('user_id', userId)
        .eq('import_id', importId)
        .eq('account_id', primaryAccountId)
        .eq('is_hidden', true);

      if (txError) {
        console.error(`[resolve-import-split] Error fetching hidden txns for chain ${chain_index}:`, txError.message);
        continue;
      }

      const txIds = (hiddenTxns || []).map(t => t.id);

      if (action === 'discard') {
        // Delete the hidden transactions entirely
        if (txIds.length > 0) {
          const DEL_BATCH = 50;
          for (let start = 0; start < txIds.length; start += DEL_BATCH) {
            const batch = txIds.slice(start, start + DEL_BATCH);
            await supabase.from('transactions').delete()
              .eq('user_id', userId)
              .in('id', batch);
          }
        }
        results.push({ chain_index, action: 'discarded', transaction_count: txIds.length });
        track.assigned_account_id = null;
        track.resolution = 'discarded';

      } else if (action === 'assign' && decision.account_id) {
        // Move transactions to an existing account
        const targetAccountId = decision.account_id;

        // Verify user owns the target account
        const { data: targetAcct } = await supabase
          .from('accounts')
          .select('id')
          .eq('id', targetAccountId)
          .eq('user_id', userId)
          .single();

        if (!targetAcct) {
          console.warn(`[resolve-import-split] Target account ${targetAccountId} not found for user`);
          continue;
        }

        if (txIds.length > 0) {
          const UPD_BATCH = 50;
          for (let start = 0; start < txIds.length; start += UPD_BATCH) {
            const batch = txIds.slice(start, start + UPD_BATCH);
            await supabase.from('transactions')
              .update({ account_id: targetAccountId, is_hidden: false })
              .eq('user_id', userId)
              .in('id', batch);
          }
        }

        // Set initial_balance on the target account from this chain's opening
        if (Number.isFinite(track.opening_balance)) {
          await supabase.from('accounts')
            .update({ initial_balance: track.opening_balance, initial_balance_source: 'multi_track_secondary' })
            .eq('id', targetAccountId);
        }

        results.push({ chain_index, action: 'assigned', account_id: targetAccountId, transaction_count: txIds.length });
        track.assigned_account_id = targetAccountId;
        track.resolution = 'assigned';

      } else if (action === 'create' && decision.new_account) {
        // Create a new account and move transactions there
        const { name, institution, currency } = decision.new_account;

        const { data: newAcct, error: createError } = await supabase
          .from('accounts')
          .insert({
            user_id: userId,
            name: name || 'Secondary Account',
            institution: institution || null,
            currency: currency || 'EUR',
            initial_balance: Number.isFinite(track.opening_balance) ? track.opening_balance : 0,
            initial_balance_source: 'multi_track_secondary',
            split_source_account_id: primaryAccountId,
          })
          .select('id')
          .single();

        if (createError || !newAcct) {
          console.error(`[resolve-import-split] Error creating account for chain ${chain_index}:`, createError?.message);
          continue;
        }

        if (txIds.length > 0) {
          const UPD_BATCH = 50;
          for (let start = 0; start < txIds.length; start += UPD_BATCH) {
            const batch = txIds.slice(start, start + UPD_BATCH);
            await supabase.from('transactions')
              .update({ account_id: newAcct.id, is_hidden: false })
              .eq('user_id', userId)
              .in('id', batch);
          }
        }

        results.push({ chain_index, action: 'created', account_id: newAcct.id, transaction_count: txIds.length });
        track.assigned_account_id = newAcct.id;
        track.resolution = 'created';
      }
    }

    // Update split metadata to resolved
    splitTracks.status = 'resolved';
    splitTracks.resolved_at = new Date().toISOString();
    await supabase.from('imports')
      .update({ split_tracks: splitTracks })
      .eq('id', importId);

    console.log(`[resolve-import-split] Resolved split for import ${importId}: ${JSON.stringify(results)}`);

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (error: unknown) {
    console.error('[resolve-import-split] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
