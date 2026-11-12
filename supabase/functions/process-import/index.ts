/**
 * process-import — orchestrator
 *
 * Handles auth, duplicate detection, strategy decision, delegates extraction
 * to _extract.ts and categorization+insertion to _categorize.ts, then finalizes.
 */
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { type UserContext } from "../_shared/categorizer.ts";
import { sha256, extractMonthKey, normalizeDescription } from "../_shared/fingerprint.ts";
import { merchantKey } from "../_shared/merchantKey.ts";
import { type MovementType } from "../_shared/categoryMap.ts";
import { tryDeterministicParse } from "../_shared/csvParser.ts";
import { extractTransactions, setRequestStartTime } from "./_extract.ts";
import {
  normalizeTargetMonth,
  categorizeAndInsert,
  type UserRuleRow,
  type CategorizeContext,
} from "./_categorize.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// ========== MAIN HANDLER ==========

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    setRequestStartTime(Date.now());

    // ── Auth ──
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse body before auth — service-role callers pass userId in the body
    const {
      fileContent,
      imageContent,
      fileHash,
      fileName,
      fileSize,
      fileMime,
      fileStorageUrl,
      accountId = null,
      domain,
      targetMonth,
      sourceType = 'OTHER',
      confirmOutOfMonth = false,
      userId: bodyUserId,
    } = await req.json();

    const token = authHeader.replace('Bearer ', '');
    let userId: string;

    if (token === SUPABASE_SERVICE_ROLE_KEY) {
      // Internal call (e.g. retry-failed-imports CRON) — trust userId from body
      if (!bodyUserId) {
        return new Response(JSON.stringify({ error: 'Service-role calls must include userId' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      userId = bodyUserId;
    } else {
      const authClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: authData, error: authError } = await authClient.auth.getUser();
      if (authError || !authData?.user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      userId = authData.user.id;
    }

    const hasText = !!fileContent;
    const hasImages = Array.isArray(imageContent) && imageContent.length > 0;

    if ((!hasText && !hasImages) || !domain) {
      console.error('Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: fileContent or imageContent, domain' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const hintedTargetMonth = targetMonth ? normalizeTargetMonth(targetMonth) : null;
    const autoDistribute = !hintedTargetMonth;

    console.log(`[process-import] Starting: domain=${domain}, targetMonth=${hintedTargetMonth ?? 'AUTO'}, mode=${hasImages ? 'vision(' + imageContent.length + ' images)' : 'text(' + fileContent.length + ' chars)'}`);

    // ── Duplicate file detection ──
    const calculatedFileHash = fileHash || await sha256(hasText ? fileContent : imageContent[0].base64);

    const { data: existingImport } = await supabase
      .from('imports')
      .select('id, status, file_name, uploaded_at, transactions_count')
      .eq('user_id', userId)
      .eq('file_hash_sha256', calculatedFileHash)
      .eq('status', 'NORMALIZED')
      .maybeSingle();

    if (existingImport) {
      console.log(`[process-import] Duplicate file detected! Hash: ${calculatedFileHash.substring(0, 16)}...`);
      return new Response(
        JSON.stringify({
          error: 'duplicate_file',
          message: `This file was already processed (${existingImport.file_name}, ${existingImport.transactions_count || 0} transactions). Duplicate files are not allowed.`,
          existingImportId: existingImport.id,
          existingUploadedAt: existingImport.uploaded_at
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Resolve initial period ──
    let initialPeriodId: string | null = null;
    if (hintedTargetMonth) {
      const { data: period } = await supabase
        .from('periods')
        .select('id, status')
        .eq('user_id', userId)
        .eq('month_key', hintedTargetMonth)
        .eq('domain', domain)
        .maybeSingle();

      if (period) {
        if (period.status === 'CLOSED') {
          return new Response(
            JSON.stringify({
              error: 'period_closed',
              message: `The period ${hintedTargetMonth} is closed. You must reopen it to add data.`
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        initialPeriodId = period.id;
      } else {
        const { data: newPeriod, error: createError } = await supabase
          .from('periods')
          .insert({
            user_id: userId,
            month_key: hintedTargetMonth,
            domain: domain,
            status: 'OPEN'
          })
          .select('id')
          .single();

        if (createError) {
          console.error('[process-import] Error creating period:', createError);
          throw new Error(`Failed to create period: ${createError.message}`);
        }
        initialPeriodId = newPeriod.id;
      }
    }

    // ── Gather context for categorization ──
    const { data: userAccounts } = await supabase
      .from('accounts')
      .select('id, name, institution, account_role')
      .eq('user_id', userId);

    const accountsForDetection = userAccounts || [];

    const { data: userProfile } = await supabase
      .from('profiles')
      .select('first_name, last_name, custom_category_rules')
      .eq('user_id', userId)
      .maybeSingle();

    const { data: userPrefs } = await supabase
      .from('user_preferences')
      .select('country, joint_account_names, own_name_aliases')
      .eq('user_id', userId)
      .maybeSingle();

    const customRules = (userProfile?.custom_category_rules as any[]) || [];
    const customCategories = customRules
      .filter((r: any) => r.type === 'custom_category')
      .map((r: any) => ({
        slug: r.slug,
        name: r.name,
        movement: r.movement as 'INCOME' | 'EXPENSE',
        keywords: r.keywords as string[],
      }));

    const hasCustomCats = customCategories.length > 0;
    const hasJointNames = !!userPrefs?.joint_account_names?.length;
    const hasOwnNameAliases = !!userPrefs?.own_name_aliases?.length;
    const hasName = !!(userProfile?.first_name && userProfile?.last_name);

    const userContext: UserContext | undefined =
      (hasName || hasCustomCats || hasJointNames || hasOwnNameAliases || userPrefs?.country)
        ? {
            firstName: userProfile?.first_name || '',
            lastName: userProfile?.last_name || '',
            country: (userPrefs?.country as UserContext['country']) || undefined,
            jointAccountNames: userPrefs?.joint_account_names || undefined,
            ownNameAliases: userPrefs?.own_name_aliases || undefined,
            customCategories: hasCustomCats ? customCategories : undefined,
          }
        : undefined;

    if (userContext) {
      console.log(`[process-import] UserContext built: name=${hasName ? `${userContext.firstName} ${userContext.lastName}` : '(none)'}, country=${userContext.country || 'none'}, customCats=${hasCustomCats}, jointNames=${hasJointNames}, ownNameAliases=${hasOwnNameAliases}`);
    } else {
      console.log(`[process-import] No UserContext (no profile data)`);
    }

    const { data: allCategories } = await supabase
      .from('categories')
      .select('id, slug')
      .eq('domain', domain);

    const categorySlugToId: Record<string, string> = {};
    for (const cat of (allCategories || [])) {
      if (cat.slug) {
        categorySlugToId[cat.slug] = cat.id;
      }
    }

    const { data: userRulesRaw } = await supabase
      .from('user_rules')
      .select('id, match_type, pattern, tokens, movement, category, source, account_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('source', { ascending: false })
      .order('created_at', { ascending: false });
    const userRules: UserRuleRow[] = (userRulesRaw || []) as UserRuleRow[];
    console.log(`[process-import] Loaded ${userRules.length} active user_rules`);

    // ── Rate limit ──
    const { count: activeImports } = await supabase
      .from('imports')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('status', ['UPLOADED', 'PARSED'])
      .gte('uploaded_at', new Date(Date.now() - 5 * 60_000).toISOString());
    if (activeImports && activeImports >= 5) {
      return new Response(
        JSON.stringify({
          error: 'rate_limited',
          message: 'Too many concurrent imports. Please wait a few minutes before uploading more files.',
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Create import record ──
    const { data: importRecord, error: importError } = await supabase
      .from('imports')
      .insert({
        user_id: userId,
        period_id: initialPeriodId,
        account_id: accountId,
        domain: domain,
        source_type: sourceType,
        file_name: fileName || 'unknown',
        file_mime: fileMime,
        file_size: fileSize,
        file_storage_url: fileStorageUrl,
        file_hash_sha256: calculatedFileHash,
        status: 'UPLOADED'
      })
      .select('id')
      .single();

    if (importError) {
      console.error('[process-import] Error creating import:', importError);
      throw new Error(`Failed to create import: ${importError.message}`);
    }

    const importId = importRecord.id;
    console.log(`[process-import] Created import record: ${importId}`);
    await supabase.from('imports').update({ status: 'PARSED' }).eq('id', importId);

    // ── EXTRACTION — delegate to _extract.ts ──
    const csvResult = (hasText && domain === 'CASHFLOW') ? tryDeterministicParse(fileContent) : null;
    if (csvResult) {
      console.log(`[process-import] Deterministic CSV parse succeeded: ${csvResult.transactions.length} rows, delimiter="${csvResult.delimiter}", headerRow=${csvResult.headerRow}`);
    }

    const extraction = await extractTransactions({
      fileContent: hasText ? fileContent : null,
      imageContent: hasImages ? imageContent : null,
      domain,
      csvResult,
    });

    if (extraction.error) {
      console.log(`[process-import] Extraction failed, marking import ${importId} FAILED`);
      await supabase.from('imports').update({
        status: 'FAILED',
        error_message: `AI extraction failed: ${extraction.error.message}`,
      }).eq('id', importId);

      return new Response(
        JSON.stringify({
          error: extraction.error.type,
          message: extraction.error.type === 'ai_processing_failed'
            ? `Error de procesamiento: ${extraction.error.message}`
            : extraction.error.message,
        }),
        { status: extraction.error.statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const allTransactions = extraction.transactions;
    console.log(`[process-import] Total transactions parsed: ${allTransactions.length}`);

    // ── MULTI-MONTH DISTRIBUTION ──
    const monthCounts: Record<string, number> = {};
    for (const t of allTransactions) {
      const txDate = t.posted_date || t.date;
      if (txDate) {
        const k = extractMonthKey(txDate);
        monthCounts[k] = (monthCounts[k] || 0) + 1;
      }
    }

    const detectedMonths = Object.keys(monthCounts).sort();

    const periodIdByMonth: Record<string, string> = {};
    const skippedMonths: Array<{ month: string; reason: string; count: number }> = [];

    for (const m of detectedMonths) {
      if (hintedTargetMonth === m && initialPeriodId) {
        periodIdByMonth[m] = initialPeriodId;
        continue;
      }
      const { data: existingPeriod } = await supabase
        .from('periods')
        .select('id, status')
        .eq('user_id', userId)
        .eq('month_key', m)
        .eq('domain', domain)
        .maybeSingle();

      if (existingPeriod) {
        if (existingPeriod.status === 'CLOSED') {
          skippedMonths.push({ month: m, reason: 'period_closed', count: monthCounts[m] });
          continue;
        }
        periodIdByMonth[m] = existingPeriod.id;
      } else {
        const { data: newPeriod, error: createErr } = await supabase
          .from('periods')
          .insert({ user_id: userId, month_key: m, domain, status: 'OPEN' })
          .select('id')
          .single();
        if (createErr) {
          console.error(`[process-import] Failed to create period for ${m}:`, createErr);
          skippedMonths.push({ month: m, reason: 'period_create_failed', count: monthCounts[m] });
          continue;
        }
        periodIdByMonth[m] = newPeriod.id;
      }
    }

    // Patch the import row's period_id
    const earliestValidMonth = detectedMonths.find((m) => periodIdByMonth[m]) || null;
    const importPeriodId =
      (earliestValidMonth && periodIdByMonth[earliestValidMonth]) ||
      initialPeriodId ||
      null;
    if (importPeriodId && importPeriodId !== initialPeriodId) {
      await supabase.from('imports').update({ period_id: importPeriodId }).eq('id', importId);
    }

    // Pre-fetch existing fingerprints for dedup
    const existingFingerprintsByMonth: Record<string, Set<string>> = {};
    const existingNaturalKeysByMonth: Record<string, Set<string>> = {};
    if (detectedMonths.length > 0) {
      const minMonth = detectedMonths[0];
      const maxMonth = detectedMonths[detectedMonths.length - 1];
      const [, maxM] = maxMonth.split('-').map(Number);
      const [maxY] = maxMonth.split('-').map(Number);
      const queryStart = `${minMonth}-01`;
      const nextM = maxM === 12 ? 1 : maxM + 1;
      const nextY = maxM === 12 ? maxY + 1 : maxY;
      const queryEnd = `${nextY}-${String(nextM).padStart(2, '0')}-01`;

      const { data: existingTxs } = await supabase
        .from('transactions')
        .select('fingerprint, date, amount, description_norm')
        .eq('user_id', userId)
        .eq('domain', domain)
        .eq('account_id', accountId)
        .gte('date', queryStart)
        .lt('date', queryEnd);

      for (const m of detectedMonths) {
        existingFingerprintsByMonth[m] = new Set();
        existingNaturalKeysByMonth[m] = new Set();
      }
      for (const tx of existingTxs || []) {
        const k = extractMonthKey(tx.date);
        if (!existingFingerprintsByMonth[k]) continue;
        if (tx.fingerprint) existingFingerprintsByMonth[k].add(tx.fingerprint);
        existingNaturalKeysByMonth[k].add(
          `${tx.date}|${parseFloat(String(tx.amount)).toFixed(2)}|${(tx.description_norm || '').toLowerCase()}`
        );
      }
      console.log(`[process-import] Distribution: ${JSON.stringify(monthCounts)}, valid months: ${Object.keys(periodIdByMonth).length}, skipped: ${skippedMonths.length}`);
    }

    // Preload merchant dictionary
    const dictUserName = userContext
      ? { firstName: userContext.firstName, lastName: userContext.lastName }
      : undefined;
    const merchantDict = new Map<string, { category: string; confidence: number }>();
    {
      const keysNeeded = new Set<string>();
      for (const tt of allTransactions) {
        const k = merchantKey(tt.description_raw || tt.description || '', dictUserName);
        if (k) keysNeeded.add(k);
      }
      if (keysNeeded.size > 0) {
        const { data: dictRows } = await supabase
          .from('merchant_categories')
          .select('merchant_key, resolved_category, resolved_confidence')
          .in('merchant_key', [...keysNeeded])
          .not('resolved_category', 'is', null);
        for (const r of dictRows || []) {
          merchantDict.set(r.merchant_key, {
            category: r.resolved_category as string,
            confidence: (r.resolved_confidence as number) ?? 0.9,
          });
        }
        console.log(`[process-import] merchant dictionary: ${merchantDict.size}/${keysNeeded.size} merchants resolved`);
      }
    }

    // Preload user's transaction history for self-learning categorization
    const historyDict = new Map<string, { category: string; movement: MovementType; confidence: number }>();
    {
      const descNormsNeeded = new Set<string>();
      for (const tt of allTransactions) {
        const raw = tt.description_raw || tt.description || '';
        const norm = normalizeDescription(raw).toLowerCase();
        if (norm.length >= 3) descNormsNeeded.add(norm);
      }
      if (descNormsNeeded.size > 0) {
        const { data: histRows } = await supabase.rpc('history_category_lookup', {
          _user_id: userId,
          _desc_norms: [...descNormsNeeded],
        });
        for (const r of histRows || []) {
          historyDict.set(r.description_norm_lower, {
            category: r.category,
            movement: r.movement as MovementType,
            confidence: r.confidence,
          });
        }
        console.log(`[process-import] history lookup: ${historyDict.size}/${descNormsNeeded.size} descriptions matched from past transactions`);
      }
    }

    // ── CATEGORIZE & INSERT — delegate to _categorize.ts ──
    const catCtx: CategorizeContext = {
      supabase,
      userId,
      domain,
      importId,
      accountId,
      userContext,
      accountsForDetection,
      categorySlugToId,
      userRules,
      merchantDict,
      periodIdByMonth,
      existingFingerprintsByMonth,
      existingNaturalKeysByMonth,
      dictUserName,
      historyDict,
    };

    const catResult = await categorizeAndInsert(
      allTransactions,
      catCtx,
      { input: extraction.aiInputTokens, output: extraction.aiOutputTokens },
    );

    const { stats, monthsDistribution, insertFailedCount, insertErrorSamples, inferredInitialBalance } = catResult;

    // ── Infer initial_balance from the earliest transaction with running_balance ──
    // Formula: initial_balance = earliest_tx.running_balance - earliest_tx.amount
    // Runs on EVERY import for this account (not just when new transactions were
    // added), because a re-import or correction could change running_balance data.
    // The initial_balance always reflects the state before the globally-earliest
    // known transaction.
    if (accountId) {
      try {
        const { data: earliest } = await supabase
          .from('transactions')
          .select('amount, running_balance, date')
          .eq('user_id', userId)
          .eq('account_id', accountId)
          .not('running_balance', 'is', null)
          .order('date', { ascending: true })
          .order('amount', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (earliest?.running_balance != null && earliest?.amount != null) {
          const inferred = Math.round(
            (parseFloat(String(earliest.running_balance)) - parseFloat(String(earliest.amount))) * 100
          ) / 100;
          if (Number.isFinite(inferred)) {
            const { data: acct } = await supabase
              .from('accounts')
              .select('initial_balance')
              .eq('id', accountId)
              .single();
            const current = parseFloat(String(acct?.initial_balance ?? 0));
            if (current !== inferred) {
              await supabase
                .from('accounts')
                .update({ initial_balance: inferred, initial_balance_source: 'inferred' })
                .eq('id', accountId);
              console.log(`[process-import] Updated initial_balance: ${current} → ${inferred} (from ${earliest.date}: balance=${earliest.running_balance}, amount=${earliest.amount})`);
            }
          }
        } else if (inferredInitialBalance != null) {
          // Fallback: multi-track chain decomposition (e.g. Revolut savings with multiple pockets)
          const { data: acct } = await supabase
            .from('accounts')
            .select('initial_balance')
            .eq('id', accountId)
            .single();
          const current = parseFloat(String(acct?.initial_balance ?? 0));
          if (current !== inferredInitialBalance) {
            await supabase
              .from('accounts')
              .update({ initial_balance: inferredInitialBalance, initial_balance_source: 'multi_track' })
              .eq('id', accountId);
            console.log(`[process-import] Updated initial_balance (multi-track fallback): ${current} → ${inferredInitialBalance}`);
          }
        } else {
          // Flag the account so the UI can warn the user to set it manually
          await supabase
            .from('accounts')
            .update({ initial_balance_source: 'failed' })
            .eq('id', accountId)
            .is('initial_balance_source', null);
          console.log(`[process-import] No running_balance data for account ${accountId} — cannot infer initial_balance, flagged for review`);
        }
      } catch (e) {
        console.error(`[process-import] initial_balance inference failed for account ${accountId}:`, e);
      }
    }

    // ── Infer initial_balance from the earliest transaction with running_balance ──
    // Formula: initial_balance = earliest_tx.running_balance - earliest_tx.amount
    // Runs on EVERY import for this account (not just when new transactions were
    // added), because a re-import or correction could change running_balance data.
    // The initial_balance always reflects the state before the globally-earliest
    // known transaction.
    if (accountId) {
      try {
        const { data: earliest } = await supabase
          .from('transactions')
          .select('amount, running_balance, date')
          .eq('user_id', userId)
          .eq('account_id', accountId)
          .not('running_balance', 'is', null)
          .order('date', { ascending: true })
          .order('amount', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (earliest?.running_balance != null && earliest?.amount != null) {
          const inferred = Math.round(
            (parseFloat(String(earliest.running_balance)) - parseFloat(String(earliest.amount))) * 100
          ) / 100;
          if (Number.isFinite(inferred)) {
            const { data: acct } = await supabase
              .from('accounts')
              .select('initial_balance')
              .eq('id', accountId)
              .single();
            const current = parseFloat(String(acct?.initial_balance ?? 0));
            if (current !== inferred) {
              await supabase
                .from('accounts')
                .update({ initial_balance: inferred })
                .eq('id', accountId);
              console.log(`[process-import] Updated initial_balance: ${current} → ${inferred} (from ${earliest.date}: balance=${earliest.running_balance}, amount=${earliest.amount})`);
            }
          }
        } else {
          console.log(`[process-import] No running_balance data for account ${accountId} — cannot infer initial_balance`);
        }
      } catch (e) {
        console.error(`[process-import] initial_balance inference failed for account ${accountId}:`, e);
      }
    }

    // ── Finalize import status ──
    const insertedCount = stats.newTransactions;
    let importStatus: 'NORMALIZED' | 'FAILED' | 'PARTIAL' = 'NORMALIZED';
    let importErrorMessage: string | null = null;

    if (insertFailedCount > 0 && insertedCount === 0) {
      importStatus = 'FAILED';
      importErrorMessage = `All ${insertFailedCount} transaction insert(s) failed. First errors: ${insertErrorSamples.join(' | ')}`;
    } else if (insertFailedCount > 0) {
      importStatus = 'PARTIAL';
      importErrorMessage = `${insertFailedCount} of ${insertFailedCount + insertedCount} transaction(s) failed to insert. First errors: ${insertErrorSamples.join(' | ')}`;
    } else if (insertedCount === 0 && stats.duplicatesIgnored > 0) {
      importErrorMessage = 'All transactions already existed';
    }

    await supabase.from('imports').update({
      status: importStatus,
      transactions_count: insertedCount,
      error_message: importErrorMessage,
      ai_input_tokens: stats.aiInputTokens,
      ai_output_tokens: stats.aiOutputTokens,
      processing_strategy: extraction.processingStrategy,
    }).eq('id', importId);

    await supabase.from('audit_log').insert({
      user_id: userId,
      entity_type: 'import',
      entity_id: importId,
      action: 'create',
      diff_json: {
        file_name: fileName,
        domain,
        target_month_hint: hintedTargetMonth,
        months_distribution: monthsDistribution,
        skipped_months: skippedMonths,
        stats
      }
    });

    // Build response message
    let message = `Processed ${stats.newTransactions} new transactions`;
    if (stats.duplicatesIgnored > 0) {
      message += `, ${stats.duplicatesIgnored} duplicates ignored`;
    }
    if (stats.transfers > 0) {
      message += `, ${stats.transfers} transfers`;
    }
    if (stats.categorizedByRule > 0) {
      message += `, ${stats.categorizedByRule} by rules`;
    }
    if (stats.categorizedByCategorizer > 0) {
      message += `, ${stats.categorizedByCategorizer} by categorizer`;
    }
    if (stats.categorizedByHistory > 0) {
      message += `, ${stats.categorizedByHistory} by history`;
    }
    if (insertFailedCount > 0) {
      message += `, ${insertFailedCount} failed to save`;
    }


    const totalCategorized = stats.categorizedByRule + stats.categorizedByCategorizer + stats.categorizedByHistory;
    const aiSavingsPercent = stats.newTransactions > 0
      ? Math.round((totalCategorized / stats.newTransactions) * 100)
      : 0;
    console.log(`[process-import] Categorization stats: rules=${stats.categorizedByRule}, categorizer=${stats.categorizedByCategorizer}, dictionary=${stats.categorizedByDictionary}, history=${stats.categorizedByHistory}, AI=${stats.categorizedByAI}, local_coverage=${aiSavingsPercent}%`);
    console.log(`[process-import] AI token usage total: input=${stats.aiInputTokens}, output=${stats.aiOutputTokens}, strategy=${extraction.processingStrategy}`);

    return new Response(
      JSON.stringify({
        success: true,
        message,
        importId,
        status: importStatus,
        failed: insertFailedCount,
        partial: insertFailedCount > 0 && insertedCount > 0,
        errorMessage: importErrorMessage,
        stats,
        monthsDistribution,
        skippedMonths,
        detectedMonths,
        autoDistributed: autoDistribute,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[process-import] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
