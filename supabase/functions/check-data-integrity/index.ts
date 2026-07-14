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

    // Pass 2: Backfill transfer pair reconciliation across accounts
    let transfersLinked = 0;

    const { data: accounts } = await supabase
      .from('accounts').select('id, name, institution, account_role')
      .eq('user_id', userId);
    const { data: profile } = await supabase
      .from('profiles').select('first_name, last_name')
      .eq('id', userId).single();

    if (accounts && accounts.length >= 2) {
      const userName = profile ? { firstName: profile.first_name, lastName: profile.last_name } : undefined;

      const { data: unpaired } = await supabase
        .from('transactions')
        .select('id, account_id, date, amount, currency, movement, categorized_by, counterparty_raw, description, description_norm, transfer_pair_id')
        .eq('user_id', userId)
        .is('transfer_pair_id', null);

      if (unpaired && unpaired.length > 0) {
        const { data: categories } = await supabase
          .from('categories').select('id, slug')
          .in('slug', ['own_transfer', 'to_investment']);
        const slugToId: Record<string, string> = {};
        (categories || []).forEach(c => { slugToId[c.slug] = c.id; });

        const TRANSFER_WORDS_RE = /\b(traspaso|transferencia|transfer|movimiento\s*interno|internal\s*transfer|own\s*account|entre\s*cuentas)\b/i;
        const accountById = new Map(accounts.map(a => [a.id, a]));
        const usedIds = new Set<string>();

        function isThirdParty(cp: string | null): boolean {
          if (!cp || cp.trim().length === 0) return false;
          const cpLow = cp.toLowerCase();
          for (const acct of accounts!) {
            if (acct.name && cpLow.includes(acct.name.toLowerCase())) return false;
            if (acct.institution && cpLow.includes(acct.institution.toLowerCase())) return false;
          }
          if (userName?.firstName && userName?.lastName &&
              userName.firstName.length >= 3 && userName.lastName.length >= 3) {
            const cpNorm = cpLow.normalize('NFD').replace(/[̀-ͯ]/g, '');
            const fN = userName.firstName.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
            const lN = userName.lastName.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
            const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            if (new RegExp(`\\b${esc(fN)}\\b`, 'i').test(cpNorm) &&
                new RegExp(`\\b${esc(lN)}\\b`, 'i').test(cpNorm)) return false;
          }
          return true;
        }

        for (const tx of unpaired) {
          if (usedIds.has(tx.id)) continue;
          if (tx.categorized_by === 'user' || tx.categorized_by === 'user_rule') continue;
          if (isThirdParty(tx.counterparty_raw)) continue;

          type Scored = { c: typeof unpaired[0]; score: number; catSlug: string };
          const scored: Scored[] = [];

          for (const c of unpaired) {
            if (c.id === tx.id || usedIds.has(c.id)) continue;
            if (c.account_id === tx.account_id) continue;
            if (c.categorized_by === 'user' || c.categorized_by === 'user_rule') continue;
            if (c.transfer_pair_id) continue;
            if (isThirdParty(c.counterparty_raw)) continue;
            if ((tx.amount > 0 && c.amount > 0) || (tx.amount < 0 && c.amount < 0)) continue;
            if (tx.amount === 0 || c.amount === 0) continue;
            const txCur = (tx.currency || 'EUR').toUpperCase();
            const cCur = (c.currency || 'EUR').toUpperCase();
            if (txCur !== cCur) continue;
            if (Math.abs(Math.abs(tx.amount) - Math.abs(c.amount)) > 0.01) continue;
            const dayDiff = Math.abs((new Date(tx.date).getTime() - new Date(c.date).getTime()) / 86400000);
            if (dayDiff > 2) continue;

            let signals = 0;
            if (tx.movement === 'TRANSFER') signals++;
            if (c.movement === 'TRANSFER') signals++;
            const txAcct = accountById.get(tx.account_id);
            const cAcct = accountById.get(c.account_id);
            if (tx.counterparty_raw && cAcct) {
              const cpL = tx.counterparty_raw.toLowerCase();
              if ((cAcct.name && cpL.includes(cAcct.name.toLowerCase())) ||
                  (cAcct.institution && cpL.includes(cAcct.institution.toLowerCase()))) signals++;
            }
            if (c.counterparty_raw && txAcct) {
              const cpL = c.counterparty_raw.toLowerCase();
              if ((txAcct.name && cpL.includes(txAcct.name.toLowerCase())) ||
                  (txAcct.institution && cpL.includes(txAcct.institution.toLowerCase()))) signals++;
            }
            if (userName?.firstName && userName?.lastName &&
                userName.firstName.length >= 3 && userName.lastName.length >= 3) {
              const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const fN = userName.firstName.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
              const lN = userName.lastName.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
              const fRe = new RegExp(`\\b${esc(fN)}\\b`, 'i');
              const lRe = new RegExp(`\\b${esc(lN)}\\b`, 'i');
              for (const desc of [tx.description, tx.description_norm, c.description, c.description_norm]) {
                if (!desc) continue;
                const dN = (desc as string).normalize('NFD').replace(/[̀-ͯ]/g, '');
                if (fRe.test(dN) && lRe.test(dN)) { signals++; break; }
              }
            }
            const txText = `${tx.description} ${tx.description_norm || ''}`;
            const cText = `${c.description} ${c.description_norm || ''}`;
            if (TRANSFER_WORDS_RE.test(txText) && TRANSFER_WORDS_RE.test(cText)) signals++;

            if (signals === 0) continue;
            let catSlug = 'own_transfer';
            if (txAcct?.account_role === 'INVESTMENT' || cAcct?.account_role === 'INVESTMENT') catSlug = 'to_investment';
            scored.push({ c, score: signals * 10 + (2 - dayDiff), catSlug });
          }

          if (scored.length === 0) continue;
          scored.sort((a, b) => b.score - a.score);
          if (scored.length >= 2 && scored[0].score === scored[1].score) continue;

          const best = scored[0];
          usedIds.add(tx.id);
          usedIds.add(best.c.id);
          const pairId = crypto.randomUUID();
          const catId = slugToId[best.catSlug] || null;
          const { error: pairErr } = await supabase.from('transactions').update({
            transfer_pair_id: pairId, movement: 'TRANSFER',
            category: best.catSlug, category_id: catId,
            categorized_by: 'reconciler', category_source: 'RECONCILER',
            confidence: 0.95,
          }).in('id', [tx.id, best.c.id]);
          if (!pairErr) {
            transfersLinked++;
            console.log(`Backfill reconciled: ${tx.id} ↔ ${best.c.id}`);
          }
        }
      }
    }

    const message = `Integrity verified: ${duplicatesRemoved} duplicates removed, ${transfersLinked} transfer pairs linked`;
    console.log(message);

    return new Response(
      JSON.stringify({
        success: true,
        message,
        stats: {
          duplicatesRemoved,
          transfersLinked,
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
