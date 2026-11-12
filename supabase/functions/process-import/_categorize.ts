/**
 * Categorization & insertion module — takes raw extracted transactions and
 * runs deduplication, multi-priority categorization, batch insertion, and
 * cross-account transfer reconciliation. Internal module imported by index.ts.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { categorize, normalize as normalizeForCategorizer, type UserContext, type CategorizationResult } from "../_shared/categorizer.ts";
import { sha256, normalizeDescription, calculateFingerprint, extractMonthKey } from "../_shared/fingerprint.ts";
import { runningBalanceIsReliable, inferMultiTrackOpeningBalance } from "../_shared/runningBalance.ts";
import { merchantKey } from "../_shared/merchantKey.ts";
import {
  type MovementType,
  mapCategorySlug,
  validateCategorySlug,
} from "../_shared/categoryMap.ts";
import { type MatchType, ruleMatchesDescription } from "../_shared/userRules.ts";
import { validateAIRow } from "./_extract.ts";

// ========== UTILITY FUNCTIONS ==========

export function normalizeTargetMonth(targetMonth: string): string {
  if (targetMonth.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return targetMonth.substring(0, 7);
  }
  return targetMonth;
}

export function validateMovement(movement: string | null): MovementType {
  if (!movement) return 'EXPENSE';
  const upper = movement.toUpperCase();
  if (upper === 'INCOME' || upper === 'EXPENSE' || upper === 'TRANSFER') {
    return upper as MovementType;
  }
  return 'EXPENSE';
}

export function detectInternalTransfer(
  movement: MovementType,
  descriptionRaw: string,
  descriptionClean: string,
  userAccounts: Array<{ name: string; institution: string | null; account_role: string }>,
  userName?: { firstName: string | null; lastName: string | null }
): { isTransfer: boolean; categorySlug: string } {
  const textToCheck = `${descriptionRaw} ${descriptionClean}`.toLowerCase();

  const ownTransferPatterns = [
    /traspaso entre cuentas/i,
    /transferencia a cuenta propia/i,
    /a mi cuenta/i,
    /entre mis cuentas/i,
    /a favor de mi/i,
    /cuenta de ahorro propia/i,
    /traspaso a ahorro/i,
    /from savings/i,
    /to savings/i,
    /internal transfer/i,
    /movimiento interno/i,
    /own account/i,
  ];

  const investmentPatterns = [
    /instant access savings/i,
    /broker/i,
    /trading/i,
    /etf/i,
    /investment/i,
    /cocos/i,
    /trade republic/i,
    /degiro/i,
    /myinvestor/i,
  ];

  for (const pattern of investmentPatterns) {
    if (pattern.test(textToCheck)) {
      return { isTransfer: true, categorySlug: 'to_investment' };
    }
  }

  for (const pattern of ownTransferPatterns) {
    if (pattern.test(textToCheck)) {
      return { isTransfer: true, categorySlug: 'own_transfer' };
    }
  }

  if (userName?.firstName && userName?.lastName &&
      userName.firstName.length >= 3 && userName.lastName.length >= 3) {
    const descNorm = textToCheck.normalize('NFD').replace(/[̀-ͯ]/g, '');
    const firstNorm = userName.firstName.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const lastNorm  = userName.lastName.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const firstRe = new RegExp(`\\b${escapeRe(firstNorm)}\\b`, 'i');
    const lastRe  = new RegExp(`\\b${escapeRe(lastNorm)}\\b`, 'i');
    if (firstRe.test(descNorm) && lastRe.test(descNorm)) {
      return { isTransfer: true, categorySlug: 'own_transfer' };
    }
  }

  return { isTransfer: false, categorySlug: '' };
}

// ========== USER RULES ==========

export interface UserRuleRow {
  id: string;
  match_type: string;
  pattern: string;
  tokens: string[] | null;
  movement: string;
  category: string;
  source: string;
  account_id: string | null;
}

export function applyUserRulesMatch(
  description: string,
  rules: UserRuleRow[],
  transactionMovement: string,
  transactionAccountId: string,
): { movement: string; category: string; ruleId: string } | null {
  for (const rule of rules) {
    const isSignConflict =
      (rule.movement === 'INCOME' && transactionMovement === 'EXPENSE') ||
      (rule.movement === 'EXPENSE' && transactionMovement === 'INCOME');
    if (isSignConflict) continue;
    if (rule.account_id && rule.account_id !== transactionAccountId) continue;
    const mt = (rule.match_type || '').toLowerCase() as MatchType;
    const matched = ruleMatchesDescription(mt, rule.pattern || '', rule.tokens || [], description);
    if (matched) {
      return { movement: rule.movement, category: rule.category, ruleId: rule.id };
    }
  }
  return null;
}

// ========== CROSS-ACCOUNT TRANSFER RECONCILIATION ==========

const TRANSFER_WORDS = /\b(traspaso|transferencia|transfer|movimiento\s*interno|internal\s*transfer|own\s*account|entre\s*cuentas)\b/i;

interface ReconciliationCandidate {
  id: string;
  account_id: string;
  date: string;
  amount: number;
  currency: string;
  movement: string;
  categorized_by: string | null;
  description: string;
  description_norm: string | null;
  transfer_pair_id: string | null;
}

export async function reconcileTransferPairs(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  accountId: string,
  insertedFingerprints: Set<string>,
  userAccounts: Array<{ id: string; name: string; institution: string | null; account_role: string }>,
  userName: { firstName: string | null; lastName: string | null } | undefined,
  categorySlugToId: Record<string, string>,
): Promise<number> {
  if (userAccounts.length < 2) return 0;

  const { data: newTxs } = await supabase
    .from('transactions')
    .select('id, account_id, date, amount, currency, movement, categorized_by, description, description_norm, transfer_pair_id')
    .eq('user_id', userId)
    .eq('account_id', accountId)
    .in('fingerprint', [...insertedFingerprints].slice(0, 500))
    .is('transfer_pair_id', null);
  if (!newTxs || newTxs.length === 0) return 0;

  const dates = newTxs.map(t => t.date).sort();
  const minDate = new Date(dates[0]);
  const maxDate = new Date(dates[dates.length - 1]);
  minDate.setDate(minDate.getDate() - 2);
  maxDate.setDate(maxDate.getDate() + 2);
  const windowStart = minDate.toISOString().split('T')[0];
  const windowEnd = maxDate.toISOString().split('T')[0];

  const otherAccountIds = userAccounts.filter(a => a.id !== accountId).map(a => a.id);
  const { data: candidates } = await supabase
    .from('transactions')
    .select('id, account_id, date, amount, currency, movement, categorized_by, description, description_norm, transfer_pair_id')
    .eq('user_id', userId)
    .in('account_id', otherAccountIds)
    .is('transfer_pair_id', null)
    .gte('date', windowStart)
    .lte('date', windowEnd);
  if (!candidates || candidates.length === 0) return 0;

  const usedCandidateIds = new Set<string>();
  const pairsToUpdate: Array<{ id1: string; id2: string; categorySlug: string }> = [];

  for (const tx of newTxs as ReconciliationCandidate[]) {
    if (tx.categorized_by === 'user' || tx.categorized_by === 'user_rule') continue;
    if (looksThirdParty(tx.description_norm || tx.description, userAccounts, userName)) continue;

    const bestMatch = findBestMatch(tx, candidates as ReconciliationCandidate[], userAccounts, userName, usedCandidateIds);
    if (bestMatch) {
      usedCandidateIds.add(bestMatch.candidate.id);
      pairsToUpdate.push({
        id1: tx.id,
        id2: bestMatch.candidate.id,
        categorySlug: bestMatch.categorySlug,
      });
    }
  }

  let pairsMatched = 0;
  for (const pair of pairsToUpdate) {
    const pairId = crypto.randomUUID();
    const categoryId = categorySlugToId[pair.categorySlug] || null;
    const { error } = await supabase
      .from('transactions')
      .update({
        transfer_pair_id: pairId,
        movement: 'TRANSFER' as MovementType,
        category: pair.categorySlug,
        category_id: categoryId,
        categorized_by: 'reconciler',
        category_source: 'RECONCILER',
        confidence: 0.95,
      })
      .in('id', [pair.id1, pair.id2]);
    if (!error) {
      pairsMatched++;
      console.log(`[process-import] Reconciled transfer pair: ${pair.id1} ↔ ${pair.id2} → ${pair.categorySlug}`);
    }
  }
  return pairsMatched;
}

function looksThirdParty(
  text: string | null,
  userAccounts: Array<{ name: string; institution: string | null }>,
  userName: { firstName: string | null; lastName: string | null } | undefined,
): boolean {
  if (!text || text.trim().length === 0) return false;
  const cp = text.toLowerCase();

  for (const account of userAccounts) {
    if (account.name && cp.includes(account.name.toLowerCase())) return false;
    if (account.institution && cp.includes(account.institution.toLowerCase())) return false;
  }
  if (userName?.firstName && userName?.lastName &&
      userName.firstName.length >= 3 && userName.lastName.length >= 3) {
    const cpNorm = cp.normalize('NFD').replace(/[̀-ͯ]/g, '');
    const firstNorm = userName.firstName.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const lastNorm = userName.lastName.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`\\b${escapeRe(firstNorm)}\\b`, 'i').test(cpNorm) &&
        new RegExp(`\\b${escapeRe(lastNorm)}\\b`, 'i').test(cpNorm)) {
      return false;
    }
  }
  return true;
}

function findBestMatch(
  tx: ReconciliationCandidate,
  candidates: ReconciliationCandidate[],
  userAccounts: Array<{ id: string; name: string; institution: string | null; account_role: string }>,
  userName: { firstName: string | null; lastName: string | null } | undefined,
  usedIds: Set<string>,
): { candidate: ReconciliationCandidate; categorySlug: string } | null {
  const accountById = new Map(userAccounts.map(a => [a.id, a]));
  type ScoredMatch = { candidate: ReconciliationCandidate; score: number; categorySlug: string };
  const scored: ScoredMatch[] = [];

  for (const c of candidates) {
    if (usedIds.has(c.id)) continue;
    if (c.account_id === tx.account_id) continue;
    if (c.categorized_by === 'user' || c.categorized_by === 'user_rule') continue;
    if (c.transfer_pair_id) continue;
    if (looksThirdParty(c.description_norm || c.description, userAccounts, userName)) continue;

    if ((tx.amount > 0 && c.amount > 0) || (tx.amount < 0 && c.amount < 0)) continue;
    if (tx.amount === 0 || c.amount === 0) continue;

    const txCurrency = (tx.currency || 'EUR').toUpperCase();
    const cCurrency = (c.currency || 'EUR').toUpperCase();
    if (txCurrency !== cCurrency) continue;
    if (Math.abs(Math.abs(tx.amount) - Math.abs(c.amount)) > 0.01) continue;

    const txDate = new Date(tx.date);
    const cDate = new Date(c.date);
    const dayDiff = Math.abs((txDate.getTime() - cDate.getTime()) / (1000 * 60 * 60 * 24));
    if (dayDiff > 2) continue;

    let signals = 0;
    if (tx.movement === 'TRANSFER') signals++;
    if (c.movement === 'TRANSFER') signals++;

    const txAccount = accountById.get(tx.account_id);
    const cAccount = accountById.get(c.account_id);
    const txDescLower = (tx.description_norm || tx.description || '').toLowerCase();
    const cDescLower = (c.description_norm || c.description || '').toLowerCase();
    if (cAccount) {
      if ((cAccount.name && txDescLower.includes(cAccount.name.toLowerCase())) ||
          (cAccount.institution && txDescLower.includes(cAccount.institution.toLowerCase()))) {
        signals++;
      }
    }
    if (txAccount) {
      if ((txAccount.name && cDescLower.includes(txAccount.name.toLowerCase())) ||
          (txAccount.institution && cDescLower.includes(txAccount.institution.toLowerCase()))) {
        signals++;
      }
    }

    if (userName?.firstName && userName?.lastName &&
        userName.firstName.length >= 3 && userName.lastName.length >= 3) {
      const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const firstNorm = userName.firstName.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      const lastNorm = userName.lastName.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      const firstRe = new RegExp(`\\b${escapeRe(firstNorm)}\\b`, 'i');
      const lastRe = new RegExp(`\\b${escapeRe(lastNorm)}\\b`, 'i');
      for (const desc of [tx.description, tx.description_norm, c.description, c.description_norm]) {
        if (!desc) continue;
        const descNorm = desc.normalize('NFD').replace(/[̀-ͯ]/g, '');
        if (firstRe.test(descNorm) && lastRe.test(descNorm)) {
          signals++;
          break;
        }
      }
    }

    const txText = `${tx.description} ${tx.description_norm || ''}`;
    const cText = `${c.description} ${c.description_norm || ''}`;
    if (TRANSFER_WORDS.test(txText) && TRANSFER_WORDS.test(cText)) {
      signals++;
    }

    if (signals === 0) continue;

    let categorySlug = 'own_transfer';
    if (txAccount?.account_role === 'INVESTMENT' || cAccount?.account_role === 'INVESTMENT') {
      categorySlug = 'to_investment';
    }

    const score = signals * 10 + (2 - dayDiff);
    scored.push({ candidate: c, score, categorySlug });
  }

  if (scored.length === 0) return null;
  scored.sort((a, b) => b.score - a.score);
  if (scored.length >= 2 && scored[0].score === scored[1].score) {
    console.log(`[process-import] Reconciliation ambiguity: ${scored.length} equal-score candidates for tx ${tx.id}, skipping`);
    return null;
  }
  return scored[0];
}

// ========== MAIN CATEGORIZE-AND-INSERT FUNCTION ==========

export interface CategorizeContext {
  supabase: ReturnType<typeof createClient>;
  userId: string;
  domain: string;
  importId: string;
  accountId: string | null;
  userContext: UserContext | undefined;
  accountsForDetection: Array<{ id: string; name: string; institution: string | null; account_role: string }>;
  categorySlugToId: Record<string, string>;
  userRules: UserRuleRow[];
  merchantDict: Map<string, { category: string; confidence: number }>;
  periodIdByMonth: Record<string, string>;
  existingFingerprintsByMonth: Record<string, Set<string>>;
  existingNaturalKeysByMonth: Record<string, Set<string>>;
  dictUserName: { firstName: string; lastName: string } | undefined;
  historyDict: Map<string, { category: string; movement: MovementType; confidence: number }>;
}

export interface CategorizeStats {
  totalParsed: number;
  newTransactions: number;
  duplicatesIgnored: number;
  skippedClosedMonth: number;
  transfers: number;
  income: number;
  expenses: number;
  categorizedByRule: number;
  categorizedByCategorizer: number;
  categorizedByDictionary: number;
  categorizedByHistory: number;
  categorizedByAI: number;
  aiInputTokens: number;
  aiOutputTokens: number;
  failed: number;
}

export interface CategorizeResult {
  stats: CategorizeStats;
  monthsDistribution: Record<string, { new: number; duplicates: number }>;
  insertedFingerprints: Set<string>;
  ruleHitCounts: Map<string, number>;
  merchantVotes: Array<{ k: string; cat: string; mov: string; w: number; sample: string }>;
  categorizerGaps: Array<{ description: string; description_norm: string; movement: string; final_category: string; categorized_by: string }>;
  insertFailedCount: number;
  insertErrorSamples: string[];
  inferredInitialBalance: number | null;
}

export async function categorizeAndInsert(
  allTransactions: any[],
  ctx: CategorizeContext,
  aiTokens: { input: number; output: number },
): Promise<CategorizeResult> {
  const {
    supabase, userId, domain, importId, accountId,
    userContext, accountsForDetection, categorySlugToId, userRules,
    merchantDict, periodIdByMonth, existingFingerprintsByMonth,
    existingNaturalKeysByMonth, dictUserName, historyDict,
  } = ctx;

  const stats: CategorizeStats = {
    totalParsed: allTransactions.length,
    newTransactions: 0,
    duplicatesIgnored: 0,
    skippedClosedMonth: 0,
    transfers: 0,
    income: 0,
    expenses: 0,
    categorizedByRule: 0,
    categorizedByCategorizer: 0,
    categorizedByDictionary: 0,
    categorizedByHistory: 0,
    categorizedByAI: 0,
    aiInputTokens: aiTokens.input,
    aiOutputTokens: aiTokens.output,
    failed: 0,
  };
  const monthsDistribution: Record<string, { new: number; duplicates: number }> = {};
  for (const m of Object.keys(periodIdByMonth)) {
    monthsDistribution[m] = { new: 0, duplicates: 0 };
  }

  const newTransactions: any[] = [];
  const seenFingerprintsByMonth: Record<string, Set<string>> = {};
  const seenNaturalKeysByMonth: Record<string, Set<string>> = {};
  const occurrenceByKey: Record<string, number> = {};
  const ruleHitCounts = new Map<string, number>();
  const importRowRecords: Record<string, unknown>[] = [];
  const merchantVotes: Array<{ k: string; cat: string; mov: string; w: number; sample: string }> = [];
  const categorizerGaps: Array<{ description: string; description_norm: string; movement: string; final_category: string; categorized_by: string }> = [];

  for (let i = 0; i < allTransactions.length; i++) {
    const t = allTransactions[i];

    const validation = validateAIRow(t);
    if (!validation.valid) {
      console.log(`[process-import] Skipping invalid row ${i}: ${validation.reason}`);
      continue;
    }

    const postedDate = validation.date!;
    const amountSigned = validation.amount!;
    const descriptionRaw = t.description_raw || t.description || '';
    const descriptionClean = t.description_clean || descriptionRaw;
    const runningBalance = t.running_balance ?? null;
    const currency = t.currency || 'EUR';
    const mKey = merchantKey(descriptionRaw, dictUserName);

    const txMonthKey = extractMonthKey(postedDate);
    const txPeriodId = periodIdByMonth[txMonthKey];
    if (!txPeriodId) {
      stats.skippedClosedMonth++;
      continue;
    }
    if (!seenFingerprintsByMonth[txMonthKey]) {
      seenFingerprintsByMonth[txMonthKey] = new Set();
      seenNaturalKeysByMonth[txMonthKey] = new Set();
    }
    const existingFingerprints = existingFingerprintsByMonth[txMonthKey] || new Set<string>();
    const existingNaturalKeys = existingNaturalKeysByMonth[txMonthKey] || new Set<string>();
    const seenFingerprints = seenFingerprintsByMonth[txMonthKey];
    const seenNaturalKeys = seenNaturalKeysByMonth[txMonthKey];

    const normalizedDesc = normalizeDescription(descriptionRaw);
    const baseKey = `${postedDate}|${amountSigned.toFixed(2)}|${normalizedDesc.toLowerCase()}`;
    const occurrence = occurrenceByKey[baseKey] ?? 0;
    occurrenceByKey[baseKey] = occurrence + 1;

    const fingerprint = await calculateFingerprint(
      'import',
      postedDate,
      amountSigned,
      currency,
      descriptionRaw,
      occurrence,
    );

    const rowHash = await sha256(JSON.stringify(t));

    importRowRecords.push({
      import_id: importId,
      row_index: i,
      raw_json: t,
      row_hash_sha256: rowHash,
      parsed_date: postedDate,
      parsed_amount: amountSigned,
      parsed_currency: currency,
      parsed_description: descriptionClean,
    });

    if (existingFingerprints.has(fingerprint) || seenFingerprints.has(fingerprint)) {
      stats.duplicatesIgnored++;
      if (!monthsDistribution[txMonthKey]) monthsDistribution[txMonthKey] = { new: 0, duplicates: 0 };
      monthsDistribution[txMonthKey].duplicates++;
      console.log(`[process-import] Duplicate by fingerprint: ${descriptionClean.substring(0, 50)}`);
      continue;
    }

    const naturalKey = occurrence > 0 ? `${baseKey}|#${occurrence}` : baseKey;

    if (existingNaturalKeys.has(naturalKey) || seenNaturalKeys.has(naturalKey)) {
      stats.duplicatesIgnored++;
      if (!monthsDistribution[txMonthKey]) monthsDistribution[txMonthKey] = { new: 0, duplicates: 0 };
      monthsDistribution[txMonthKey].duplicates++;
      console.log(`[process-import] Duplicate by natural key: ${naturalKey.substring(0, 60)}`);
      continue;
    }

    seenFingerprints.add(fingerprint);
    seenNaturalKeys.add(naturalKey);

    // === CATEGORIZATION LOGIC ===
    // Priority: User Rules (1) > High-conf Dictionary (1.5) > Categorizer (2) > Dictionary (2.5) > AI

    let movement: MovementType;
    let categorySlug: string;
    let categorizedBy: string = 'ai';

    if (t.movement) {
      movement = validateMovement(t.movement);
      categorySlug = validateCategorySlug(t.category_slug, movement);
    } else {
      movement = amountSigned >= 0 ? 'INCOME' : 'EXPENSE';
      categorySlug = movement === 'INCOME' ? 'other_income' : 'other_expense';
    }

    const transferDetection = detectInternalTransfer(
      movement,
      descriptionRaw,
      descriptionClean,
      accountsForDetection,
      userContext ? { firstName: userContext.firstName, lastName: userContext.lastName } : undefined,
    );

    if (transferDetection.isTransfer && movement !== 'TRANSFER') {
      movement = 'TRANSFER';
      categorySlug = transferDetection.categorySlug;
      stats.transfers++;
    }

    let categoryId: string | null = null;
    let categorizationRuleId: string | null = null;
    let categorySource = 'AI';

    // ── Priority 1.5: high-confidence dictionary (≥0.95) ──
    let dictElevated = false;
    if (movement !== 'TRANSFER' && mKey && merchantDict.has(mKey)) {
      const hit = merchantDict.get(mKey)!;
      if (hit.confidence >= 0.95) {
        movement = amountSigned >= 0 ? 'INCOME' : 'EXPENSE';
        categorySlug = validateCategorySlug(hit.category, movement);
        categoryId = categorySlugToId[categorySlug] || null;
        categorySource = 'DICTIONARY';
        categorizedBy = 'dictionary';
        stats.categorizedByDictionary++;
        dictElevated = true;
        console.log(`[process-import] High-confidence dictionary (${hit.confidence}): "${descriptionRaw.substring(0, 40)}" [${mKey}] → ${categorySlug}`);
      }
    }

    // ── Priority 2: Advanced Categorizer (2500+ regex patterns) ──
    let categorizerMatch: CategorizationResult | null = null;
    if (!dictElevated) {
      const rawMatch = categorize(descriptionRaw, amountSigned, userContext)
                    || (normalizeForCategorizer(descriptionRaw) !== normalizeForCategorizer(descriptionClean)
                          ? categorize(descriptionClean, amountSigned, userContext)
                          : null);

      categorizerMatch = rawMatch;
      if (rawMatch && rawMatch.movement !== 'TRANSFER') {
        if (rawMatch.movement === 'EXPENSE' && amountSigned > 0) {
          console.log(`[process-import] Rejected categorizer match (positive amount but EXPENSE rule): "${descriptionRaw.substring(0, 40)}" rule=${rawMatch.matchedRule}`);
          categorizerMatch = null;
        } else if (rawMatch.movement === 'INCOME' && amountSigned < 0) {
          console.log(`[process-import] Rejected categorizer match (negative amount but INCOME rule): "${descriptionRaw.substring(0, 40)}" rule=${rawMatch.matchedRule}`);
          categorizerMatch = null;
        }
      }

      const categorizerCategory = categorizerMatch
        ? validateCategorySlug(mapCategorySlug(categorizerMatch.category), categorizerMatch.movement as MovementType)
        : null;
      const categorizerIsReal = !!categorizerMatch &&
        (categorizerMatch.movement === 'TRANSFER' || !categorizerCategory!.startsWith('other_'));

      if (categorizerMatch && categorizerIsReal) {
        const mappedCategory = mapCategorySlug(categorizerMatch.category);
        movement = categorizerMatch.movement as MovementType;
        categorySlug = mappedCategory;
        categorySlug = validateCategorySlug(categorySlug, movement);
        categoryId = categorySlugToId[categorySlug] || null;
        categorySource = 'CATEGORIZER';
        categorizedBy = 'categorizer';
        stats.categorizedByCategorizer++;

        console.log(`[process-import] Categorizer match: "${descriptionRaw.substring(0, 40)}" → ${categorizerMatch.category}→${categorySlug} (confidence: ${categorizerMatch.confidence}, rule: ${categorizerMatch.matchedRule.substring(0, 40)})`);
      } else if (movement !== 'TRANSFER' && mKey && merchantDict.has(mKey)) {
        // ── Priority 2.5: learned global merchant dictionary (lower confidence) ──
        const hit = merchantDict.get(mKey)!;
        movement = amountSigned >= 0 ? 'INCOME' : 'EXPENSE';
        categorySlug = validateCategorySlug(hit.category, movement);
        categoryId = categorySlugToId[categorySlug] || null;
        categorySource = 'DICTIONARY';
        categorizedBy = 'dictionary';
        stats.categorizedByDictionary++;
        console.log(`[process-import] Dictionary match: "${descriptionRaw.substring(0, 40)}" [${mKey}] → ${categorySlug}`);
      } else if (movement !== 'TRANSFER' && historyDict.has(normalizedDesc.toLowerCase())) {
        // ── Priority 2.7: user's own transaction history ──
        const histHit = historyDict.get(normalizedDesc.toLowerCase())!;
        movement = histHit.movement;
        categorySlug = validateCategorySlug(histHit.category, movement);
        categoryId = categorySlugToId[categorySlug] || null;
        categorySource = 'HISTORY';
        categorizedBy = 'history';
        stats.categorizedByHistory++;
        console.log(`[process-import] History match: "${descriptionRaw.substring(0, 40)}" → ${movement}/${categorySlug} (confidence: ${histHit.confidence.toFixed(2)})`);
      } else {
        if (movement !== 'TRANSFER') {
          movement = amountSigned >= 0 ? 'INCOME' : 'EXPENSE';
        }
        categorySlug = validateCategorySlug(categorySlug, movement);
        categoryId = categorySlugToId[categorySlug] || null;
        stats.categorizedByAI++;
      }
    } // end if (!dictElevated)

    // ── Priority 1: user_rules ──
    const userRuleHit = applyUserRulesMatch(descriptionRaw, userRules, movement, accountId as string)
                     || applyUserRulesMatch(descriptionClean, userRules, movement, accountId as string);

    if (userRuleHit) {
      const mappedCat = mapCategorySlug(userRuleHit.category);
      const validatedCat = validateCategorySlug(mappedCat, userRuleHit.movement as MovementType);
      movement = userRuleHit.movement as MovementType;
      categorySlug = validatedCat;
      categoryId = categorySlugToId[categorySlug] || null;
      categorizationRuleId = userRuleHit.ruleId;
      categorySource = 'USER_RULE';
      if (categorizedBy === 'categorizer') stats.categorizedByCategorizer--;
      else if (categorizedBy === 'dictionary') stats.categorizedByDictionary--;
      else if (categorizedBy === 'history') stats.categorizedByHistory--;
      else stats.categorizedByAI--;
      categorizedBy = 'user_rule';
      stats.categorizedByRule++;
      ruleHitCounts.set(userRuleHit.ruleId, (ruleHitCounts.get(userRuleHit.ruleId) || 0) + 1);
      console.log(`[process-import] user_rule match: "${descriptionRaw.substring(0, 40)}" → ${userRuleHit.movement}/${categorySlug} (rule=${userRuleHit.ruleId})`);
    }

    // ── Sign sanity check ──
    if (categorizedBy !== 'user_rule') {
      const priorSource = categorySource;
      if (movement === 'EXPENSE' && amountSigned > 0) {
        movement = 'INCOME';
        categorySlug = 'other_income';
        categoryId = categorySlugToId[categorySlug] || null;
        categorySource = 'SIGN_FALLBACK';
        categorizedBy = 'sign_fallback';
        console.log(`[process-import] Sign correction (ex-${priorSource}): positive amount ${amountSigned} re-classified EXPENSE→INCOME for "${descriptionRaw.substring(0, 40)}"`);
      } else if (movement === 'INCOME' && amountSigned < 0) {
        movement = 'EXPENSE';
        categorySlug = 'other_expense';
        categoryId = categorySlugToId[categorySlug] || null;
        categorySource = 'SIGN_FALLBACK';
        categorizedBy = 'sign_fallback';
        console.log(`[process-import] Sign correction (ex-${priorSource}): negative amount ${amountSigned} re-classified INCOME→EXPENSE for "${descriptionRaw.substring(0, 40)}"`);
      }
    }

    if (movement === 'INCOME') stats.income++;
    else if (movement === 'EXPENSE') stats.expenses++;
    else if (movement === 'TRANSFER') stats.transfers++;

    // ── Learn: record a global-dictionary vote ──
    if (mKey && movement !== 'TRANSFER' && !categorySlug.startsWith('other_') && categorizedBy !== 'dictionary') {
      merchantVotes.push({
        k: mKey, cat: categorySlug, mov: movement,
        w: categorizedBy === 'user_rule' ? 100 : 1,
        sample: (descriptionClean || descriptionRaw).substring(0, 80),
      });
    }

    // Track categorizer gaps
    if (movement !== 'TRANSFER' && (categorySlug.startsWith('other_') || categorizedBy === 'ai')) {
      categorizerGaps.push({
        description: (descriptionRaw || '').substring(0, 200),
        description_norm: (normalizedDesc || '').substring(0, 200),
        movement,
        final_category: categorySlug,
        categorized_by: categorizedBy,
      });
    }

    const confidenceMap: Record<string, number> = {
      user: 1.0, user_rule: 0.99, reconciler: 0.95,
      dictionary: 0.92, history: 0.90, categorizer: 0.85, ai: 0.50, sign_fallback: 0.20,
    };
    let confidence = confidenceMap[categorizedBy] ?? 0.50;
    if (categorizedBy === 'dictionary' && mKey && merchantDict.has(mKey)) {
      confidence = Math.max(confidence, merchantDict.get(mKey)!.confidence);
    }

    const txRecord: any = {
      user_id: userId,
      domain: domain,
      period_id: txPeriodId,
      _month_key: txMonthKey,
      import_id: importId,
      account_id: accountId,
      date: postedDate,
      amount: amountSigned,
      currency: currency,
      running_balance: runningBalance,
      description: descriptionClean || 'Sin descripción',
      description_norm: normalizeDescription(descriptionRaw),
      original_description: descriptionRaw || null,
      movement: movement,
      category: categorySlug,
      category_id: categoryId,
      categorization_rule_id: categorizationRuleId,
      category_source: categorySource,
      categorized_by: categorizedBy,
      confidence: confidence,
      fingerprint: fingerprint,
      source_row_hash: rowHash,
    };

    newTransactions.push(txRecord);
  }

  // ── Running-balance reliability check ──
  let inferredInitialBalance: number | null = null;
  const rbRowCount = newTransactions.filter((tx) => tx.running_balance != null).length;
  if (rbRowCount >= 5 && !runningBalanceIsReliable(newTransactions)) {
    // Before NULLing, try to decompose into multiple chains and infer the total opening balance
    inferredInitialBalance = inferMultiTrackOpeningBalance(newTransactions);
    if (inferredInitialBalance != null) {
      console.log(`[process-import] Running balance unreliable (multi-track) across ${rbRowCount} rows. Inferred combined opening balance: ${inferredInitialBalance}. NULLing running_balance.`);
    } else {
      console.log(`[process-import] Running balance unreliable across ${rbRowCount} rows. NULLing running_balance for this import.`);
    }
    for (const tx of newTransactions) tx.running_balance = null;
  }

  // Batch-upsert import_rows audit records
  const IMPORT_ROW_BATCH_SIZE = 50;
  for (let start = 0; start < importRowRecords.length; start += IMPORT_ROW_BATCH_SIZE) {
    const batch = importRowRecords.slice(start, start + IMPORT_ROW_BATCH_SIZE);
    const { error } = await supabase.from('import_rows').upsert(batch, {
      onConflict: 'import_id,row_hash_sha256',
      ignoreDuplicates: true,
    });
    if (error) console.log(`[process-import] import_rows batch upsert error: ${error.message}`);
  }

  // Batch-insert transactions
  const TX_BATCH_SIZE = 50;
  let insertFailedCount = 0;
  const insertErrorSamples: string[] = [];
  const allInsertedFingerprints = new Set<string>();
  if (newTransactions.length > 0) {
    let successCount = 0;
    let duplicateCount = 0;

    const recordDuplicate = (txMonthKey: string) => {
      duplicateCount++;
      if (!monthsDistribution[txMonthKey]) monthsDistribution[txMonthKey] = { new: 0, duplicates: 0 };
      monthsDistribution[txMonthKey].duplicates++;
    };
    const recordSuccess = (txMonthKey: string) => {
      successCount++;
      if (!monthsDistribution[txMonthKey]) monthsDistribution[txMonthKey] = { new: 0, duplicates: 0 };
      monthsDistribution[txMonthKey].new++;
    };
    const recordFailure = (message: string) => {
      insertFailedCount++;
      if (insertErrorSamples.length < 5) insertErrorSamples.push(message);
      console.error('[process-import] Error inserting transaction:', message);
    };

    for (let start = 0; start < newTransactions.length; start += TX_BATCH_SIZE) {
      const batch = newTransactions.slice(start, start + TX_BATCH_SIZE);
      const batchClean = batch.map(({ _month_key, ...rest }: any) => rest);

      const { data: inserted, error: batchError } = await supabase
        .from('transactions')
        .upsert(batchClean, { onConflict: 'user_id,domain,account_id,fingerprint', ignoreDuplicates: true })
        .select('fingerprint');

      if (batchError) {
        for (const tx of batch) {
          const txMonthKey: string = tx._month_key;
          const { _month_key, ...txClean } = tx;
          const { error } = await supabase.from('transactions').insert(txClean);
          if (error) {
            if (error.code === '23505') recordDuplicate(txMonthKey);
            else recordFailure(error.message);
          } else {
            recordSuccess(txMonthKey);
            allInsertedFingerprints.add(tx.fingerprint);
          }
        }
        continue;
      }

      const batchInsertedFps = new Set((inserted || []).map((r: { fingerprint: string }) => r.fingerprint));
      for (const tx of batch) {
        if (batchInsertedFps.has(tx.fingerprint)) {
          recordSuccess(tx._month_key);
          allInsertedFingerprints.add(tx.fingerprint);
        } else {
          recordDuplicate(tx._month_key);
        }
      }
    }

    stats.newTransactions = successCount;
    stats.duplicatesIgnored += duplicateCount;
    stats.failed = insertFailedCount;

    console.log(`[process-import] Inserted ${successCount} transactions, ${duplicateCount} duplicates skipped, ${insertFailedCount} failed`);
  }

  // Cross-account transfer reconciliation
  let reconcilerPairs = 0;
  if (allInsertedFingerprints.size > 0 && accountsForDetection.length >= 2) {
    try {
      reconcilerPairs = await reconcileTransferPairs(
        supabase,
        userId,
        accountId as string,
        allInsertedFingerprints,
        accountsForDetection,
        userContext ? { firstName: userContext.firstName, lastName: userContext.lastName } : undefined,
        categorySlugToId,
      );
      if (reconcilerPairs > 0) {
        console.log(`[process-import] Reconciled ${reconcilerPairs} cross-account transfer pair(s)`);
      }
    } catch (e) {
      console.error(`[process-import] Reconciliation error (non-fatal):`, e);
    }
  }

  // Update user_rule hit stats
  for (const [ruleId, hitCount] of ruleHitCounts) {
    const { error: statsError } = await supabase.rpc('increment_rule_stats', {
      _rule_id: ruleId,
      _hit_count: hitCount,
    });
    if (statsError) {
      console.error(`[process-import] Failed to update rule stats for ${ruleId}:`, statsError);
    }
  }

  // Feed the global merchant dictionary
  if (merchantVotes.length > 0) {
    const { error: voteError } = await supabase.rpc('apply_merchant_votes', { votes: merchantVotes });
    if (voteError) console.error('[process-import] apply_merchant_votes failed:', voteError.message);
    else console.log(`[process-import] merchant dictionary: recorded ${merchantVotes.length} votes`);
  }

  // Record categorizer gaps
  if (categorizerGaps.length > 0) {
    const gapRows = categorizerGaps.slice(0, 50).map(g => ({ user_id: userId, ...g }));
    const { error: gapError } = await supabase.from('categorizer_gaps').insert(gapRows);
    if (gapError) console.error('[process-import] categorizer_gaps insert failed:', gapError.message);
    else console.log(`[process-import] categorizer gaps: recorded ${gapRows.length} uncovered descriptions`);
  }

  return {
    stats,
    monthsDistribution,
    insertedFingerprints: allInsertedFingerprints,
    ruleHitCounts,
    merchantVotes,
    categorizerGaps,
    insertFailedCount,
    insertErrorSamples,
    inferredInitialBalance,
  };
}
