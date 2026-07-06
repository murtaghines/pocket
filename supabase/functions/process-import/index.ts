import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { categorize, type UserContext, type CategorizationResult, type Category } from "../_shared/categorizer.ts";
import { sha256, normalizeDescription, calculateFingerprint, extractMonthKey } from "../_shared/fingerprint.ts";
import {
  type MovementType,
  INCOME_SLUGS,
  EXPENSE_SLUGS,
  TRANSFER_SLUGS,
  mapCategorySlug,
  validateCategorySlug,
} from "../_shared/categoryMap.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// ========== MOVEMENT TYPES ==========
// Category-slug resolution (MovementType, slug lists, mapCategorySlug, validateCategorySlug)
// now lives in ../_shared/categoryMap.ts (unit-tested in tests/categoryMap.test.ts).

// ========== TX_TYPE to MOVEMENT MAPPING ==========
const TX_TYPE_TO_MOVEMENT: Record<string, MovementType> = {
  'INCOME': 'INCOME',
  'INTEREST': 'INCOME',
  'REFUND': 'INCOME',
  'EXPENSE': 'EXPENSE',
  'FEE': 'EXPENSE',
  'TRANSFER_INTERNAL': 'TRANSFER',
  'SAVINGS_MOVE': 'TRANSFER',
  'OTHER': 'EXPENSE',
};

// ========== VALID VALUES ==========
const VALID_TX_TYPES = ['INCOME', 'EXPENSE', 'TRANSFER_INTERNAL', 'SAVINGS_MOVE', 'INTEREST', 'FEE', 'REFUND', 'OTHER'];
const VALID_PAYMENT_CHANNELS = ['CARD', 'TRANSFER', 'BIZUM', 'QR', 'CASH', 'DIRECT_DEBIT', 'OTHER'];

// ========== CHUNKING CONFIG ==========
const CHUNK_SIZE_THRESHOLD = 6000;
const MAX_CHUNK_SIZE = 4000;

// ========== SIMPLIFIED EXTRACTION PROMPT (for large files) ==========
const SIMPLE_EXTRACTION_PROMPT = `You are a financial data extraction expert. Extract transactions from this bank statement data.

CRITICAL: Respond ONLY with a valid JSON array. No markdown, no explanation, just the JSON.

For each transaction, extract ONLY these essential fields:
- posted_date: ISO format (YYYY-MM-DD)
- description_raw: Original description as-is
- amount_signed: Numeric value (positive for deposits/income, negative for withdrawals/expenses)
- running_balance: Balance after transaction if shown, otherwise null
- currency: Currency code if visible (EUR, USD, etc.)
- bank: Bank name if identifiable

Example output:
[
  {"posted_date":"2024-12-15","description_raw":"COMPRA TARJETA MERCADONA","amount_signed":-87.43,"running_balance":1234.56,"currency":"EUR","bank":"Santander"},
  {"posted_date":"2024-12-14","description_raw":"NOMINA DICIEMBRE","amount_signed":2850.00,"running_balance":3084.56,"currency":"EUR","bank":"Santander"}
]

Extract ALL transactions visible in the data. Do not skip any.`;

// ========== FULL PROMPT (for smaller files) ==========
const CASHFLOW_ANALYSIS_PROMPT = `You are a financial data extraction expert specialized in bank statements from any country. Your task is to analyze messy, unstructured financial data and extract clean transaction data.

CRITICAL: Respond ONLY with a valid JSON array. No markdown, no explanation, just the JSON.

For each transaction, extract:
- posted_date: ISO format (YYYY-MM-DD). This is the main transaction date shown on the statement.
- value_date: ISO format (YYYY-MM-DD) if available as a separate "value date" or "fecha valor", otherwise null.
- description_raw: Original raw description from the statement.
- description_clean: Clean, readable description removing reference numbers and noise.
- amount_signed: Numeric value (positive for income, negative for expenses/transfers out).
- running_balance: Balance after transaction if shown, otherwise null.
- source_transaction_id: External transaction ID/reference if visible (e.g., MercadoPago ID), otherwise null.
- payment_channel: One of: CARD, TRANSFER, BIZUM, QR, CASH, DIRECT_DEBIT, OTHER
- counterparty_raw: Name of the other party if identifiable (beneficiary, payer, merchant), otherwise null.
- movement: One of: INCOME, EXPENSE, TRANSFER (the fundamental type of money movement)
- category_slug: The specific category slug from the list below
- bank: Bank name if identifiable
- currency: Currency code (EUR, USD, GBP, ARS, MXN, etc.) - detect from symbols or context

=== MOVEMENT CLASSIFICATION (Step 1 - CRITICAL) ===

You MUST first determine the movement type, then assign a category within that movement.

INCOME: Money entering the user from external sources, increasing available cash.
- Salary, payroll, wages ("Nómina", "Sueldo", "Salary", "Payroll")
- Refunds and chargebacks ("Devolución", "Refund", "Chargeback")
- Sales income from selling items
- Interest received, dividends
- Category slugs: salary, refunds, freelance, rents, investment, transfers, other_income

EXPENSE: Money leaving to a third party representing real consumption or payment.
- Purchases at stores, restaurants, services
- Rent, utilities, subscriptions
- Payments to external merchants or people
- CRITICAL: If a "transfer" goes to a THIRD PARTY (not own account, not investment), it's EXPENSE, not TRANSFER!
- Category slugs: housing, groceries, restaurants, transport, health, entertainment, shopping, education, subscriptions, travel, sports, pets, other_expense

TRANSFER: Movement between the user's OWN accounts or to their OWN investment accounts. NO consumption.
- Between own bank accounts (Santander ↔ Revolut ↔ MercadoPago)
- To own savings/investment accounts (broker, instant access savings, trading)
- CRITICAL: Only TRANSFER if destination is CONFIRMED to be user's own account or investment platform!
- CRITICAL: "Transferencia recibida/emitida", "Bizum recibido/enviado" are NOT automatically TRANSFER!
- Category slugs: own_transfer (between own accounts), to_investment (to savings/investment)

=== TRANSFER vs EXPENSE/INCOME DECISION (CRITICAL RULE) ===

A transaction is ONLY a TRANSFER if you can confirm with HIGH CONFIDENCE that:
1. It goes to another account belonging to the SAME USER (own_transfer), OR
2. It goes to the user's OWN investment/savings account (to_investment)

Signals for TRANSFER (own_transfer):
- "Traspaso entre cuentas", "Transferencia a cuenta propia", "A mi cuenta"
- Counterparty matches user's other known accounts/banks
- "From savings", "To savings" within same bank
- Movement between digital wallets of same person

Signals for TRANSFER (to_investment):
- Destination is a broker, trading platform, investment account
- "Instant Access Savings", "Trading", "ETF", "Broker", "Cocos", "Trade Republic"
- Movement to remunerative savings accounts

CRITICAL - These are NOT TRANSFER:
- "Transferencia recibida" or "Transferencia emitida" without explicit self-transfer context
- "Bizum recibido" or "Bizum enviado" (these are payments to/from other people)
- Any transfer to/from a person whose name is NOT the user
- When uncertain: positive amount → INCOME, negative amount → EXPENSE

If UNCERTAIN whether a transfer goes to own account or third party:
→ Use the amount sign: positive = INCOME, negative = EXPENSE

=== CATEGORY ASSIGNMENT (Step 2) ===

After determining movement, assign the specific category_slug:

INCOME categories:
- salary: Payroll, wages, regular employment income (Nómina, Sueldo, Payroll)
- refunds: Returns, refunds, chargebacks (Devolución, Refund)
- freelance: Freelance, contract payments, consulting fees
- rents: Rental income from property
- investment: Investment returns, dividends, interest
- transfers: Money received from own accounts
- other_income: Other income not fitting above categories

EXPENSE categories:
- housing: Rent, mortgage, utilities (luz, gas, agua), home services, internet
- groceries: Supermarket, grocery stores, food shopping (Mercadona, Lidl, Carrefour)
- restaurants: Restaurants, bars, cafes, delivery, take-away (Glovo, UberEats)
- transport: Public transport, taxi, Uber, fuel, tolls, parking
- health: Medical, pharmacy, health insurance, treatments
- entertainment: Events, cinema, games, recreational activities, hobbies
- shopping: Clothing, technology, home goods, non-food purchases (Amazon, Zara)
- education: Courses, books, training, tuition (Udemy, Coursera)
- subscriptions: Streaming, software, recurring memberships (Netflix, Spotify)
- travel: Flights, hotels, tourism, vacation expenses
- sports: Gym, sports equipment, sports activities
- pets: Veterinary, pet shops, pet food
- other_expense: Expenses not fitting above categories, transfers to third parties

TRANSFER categories:
- own_transfer: Transfer between user's own accounts
- to_investment: Transfer to user's investment/savings accounts

Example output:
[
  {"posted_date":"2024-12-15","value_date":null,"description_raw":"COMPRA TARJETA *1234 MERCADONA","description_clean":"Supermercado Mercadona","amount_signed":-87.43,"running_balance":1234.56,"source_transaction_id":null,"payment_channel":"CARD","counterparty_raw":"MERCADONA","movement":"EXPENSE","category_slug":"groceries","bank":"Santander","currency":"EUR"},
  {"posted_date":"2024-12-14","value_date":"2024-12-14","description_raw":"NOMINA DICIEMBRE EMPRESA SA","description_clean":"Nómina Diciembre","amount_signed":2850.00,"running_balance":3084.56,"source_transaction_id":null,"payment_channel":"TRANSFER","counterparty_raw":"EMPRESA SA","movement":"INCOME","category_slug":"salary","bank":"Santander","currency":"EUR"},
  {"posted_date":"2024-12-13","value_date":null,"description_raw":"TRF A CTA PROPIA REVOLUT","description_clean":"Traspaso a Revolut","amount_signed":-500.00,"running_balance":2584.56,"source_transaction_id":null,"payment_channel":"TRANSFER","counterparty_raw":null,"movement":"TRANSFER","category_slug":"own_transfer","bank":"Santander","currency":"EUR"},
  {"posted_date":"2024-12-12","value_date":null,"description_raw":"BIZUM A JUAN GARCIA","description_clean":"Bizum a Juan García","amount_signed":-30.00,"running_balance":2554.56,"source_transaction_id":null,"payment_channel":"BIZUM","counterparty_raw":"JUAN GARCIA","movement":"EXPENSE","category_slug":"other_expense","bank":"Santander","currency":"EUR"}
]`;

const INVESTING_ANALYSIS_PROMPT = `You are an investment data extraction expert. Analyze investment platform statements and extract transaction data.

CRITICAL: Respond ONLY with a valid JSON array. No markdown, no explanation, just the JSON.

For each transaction, extract:
- posted_date: ISO format (YYYY-MM-DD)
- value_date: ISO format if available, otherwise null
- description_raw: Original description
- description_clean: Clean description of the investment activity
- amount_signed: Numeric value (positive for contributions/dividends, negative for withdrawals/fees)
- source_transaction_id: Platform transaction ID if visible
- movement: One of: INCOME, EXPENSE, TRANSFER
- category_slug: See below
- platform: Platform name (Cocos, Trade Republic, DEGIRO, Revolut, etc.)
- asset_type: Type of asset (stocks, etf, bonds, crypto, fund, savings, other)
- currency: Currency code (EUR, USD, etc.)

Movement/Category mapping for investments:
- Contributions/deposits: TRANSFER + to_investment
- Withdrawals to own account: TRANSFER + own_transfer
- Dividends: INCOME + investment
- Interest: INCOME + investment
- Platform fees: EXPENSE + other_expense
- Buy/Sell trades: TRANSFER + to_investment (internal platform movement)

Example output:
[
  {"posted_date":"2024-12-15","value_date":null,"description_raw":"Aporte mensual","description_clean":"Aporte mensual","amount_signed":500.00,"source_transaction_id":"TX123456","movement":"TRANSFER","category_slug":"to_investment","platform":"Cocos","asset_type":"fund","currency":"EUR"},
  {"posted_date":"2024-12-10","value_date":"2024-12-11","description_raw":"Dividendo Apple Inc AAPL","description_clean":"Dividendo Apple Inc","amount_signed":12.50,"source_transaction_id":null,"movement":"INCOME","category_slug":"investment","platform":"DEGIRO","asset_type":"stocks","currency":"USD"},
  {"posted_date":"2024-12-05","value_date":null,"description_raw":"Comisión custodia","description_clean":"Comisión custodia mensual","amount_signed":-1.50,"source_transaction_id":null,"movement":"EXPENSE","category_slug":"other_expense","platform":"Trade Republic","asset_type":"other","currency":"EUR"}
]`;

// ========== UTILITY FUNCTIONS ==========
// sha256 / normalizeDescription / calculateFingerprint / extractMonthKey now live in
// ../_shared/fingerprint.ts (unit-tested in tests/fingerprint.test.ts). Imported above.

function normalizeTargetMonth(targetMonth: string): string {
  if (targetMonth.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return targetMonth.substring(0, 7);
  }
  return targetMonth;
}

function validatePaymentChannel(channel: string | null): string | null {
  if (!channel) return null;
  const upper = channel.toUpperCase();
  return VALID_PAYMENT_CHANNELS.includes(upper) ? upper : 'OTHER';
}

function validateMovement(movement: string | null): MovementType {
  if (!movement) return 'EXPENSE';
  const upper = movement.toUpperCase();
  if (upper === 'INCOME' || upper === 'EXPENSE' || upper === 'TRANSFER') {
    return upper as MovementType;
  }
  return 'EXPENSE';
}

function getLegacyType(movement: MovementType): string {
  switch (movement) {
    case 'INCOME': return 'income';
    case 'EXPENSE': return 'expense';
    case 'TRANSFER': return 'transfer';
  }
}

function getLegacyTxType(movement: MovementType, categorySlug: string): string {
  if (movement === 'TRANSFER') {
    return categorySlug === 'to_investment' ? 'SAVINGS_MOVE' : 'TRANSFER_INTERNAL';
  }
  if (movement === 'INCOME') {
    if (categorySlug === 'refunds') return 'REFUND';
    return 'INCOME';
  }
  return 'EXPENSE';
}

function detectInternalTransfer(
  movement: MovementType,
  descriptionRaw: string,
  descriptionClean: string,
  counterpartyRaw: string | null,
  userAccounts: Array<{ name: string; institution: string | null; account_role: string }>,
  userName?: { firstName: string | null; lastName: string | null }
): { isTransfer: boolean; categorySlug: string } {
  // DO NOT blindly trust AI's TRANSFER classification.
  // Only confirm as transfer if explicit signals are found below.
  
  const textToCheck = `${descriptionRaw} ${descriptionClean} ${counterpartyRaw || ''}`.toLowerCase();
  
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
  
  // Check if the user's own name appears in the description/counterparty
  // If so, it's a transfer between own accounts (sending money to yourself)
  if (userName) {
    const descNorm = textToCheck.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    if (userName.firstName && userName.firstName.length >= 3) {
      const firstNorm = userName.firstName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (userName.lastName && userName.lastName.length >= 3) {
        const lastNorm = userName.lastName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        // Both first AND last name must appear to avoid false positives
        if (descNorm.includes(firstNorm) && descNorm.includes(lastNorm)) {
          return { isTransfer: true, categorySlug: 'own_transfer' };
        }
      }
    }
  }
  
  if (counterpartyRaw) {
    const normalizedCounterparty = counterpartyRaw.toLowerCase();
    for (const account of userAccounts) {
      if (account.name && normalizedCounterparty.includes(account.name.toLowerCase())) {
        const categorySlug = account.account_role === 'INVESTMENT' ? 'to_investment' : 'own_transfer';
        return { isTransfer: true, categorySlug };
      }
      if (account.institution && normalizedCounterparty.includes(account.institution.toLowerCase())) {
        return { isTransfer: true, categorySlug: 'own_transfer' };
      }
    }
  }
  
  return { isTransfer: false, categorySlug: '' };
}

async function applyCategoryRules(
  supabase: any,
  userId: string,
  domain: string,
  descriptionClean: string,
  counterpartyRaw: string | null
): Promise<{ categoryId: string | null; categorySlug: string | null; ruleId: string | null } | null> {
  
  const { data: rules, error } = await supabase
    .from('categorization_rules')
    .select(`
      id, 
      category_id,
      pattern, 
      match_field, 
      match_type,
      categories!inner(slug)
    `)
    .eq('user_id', userId)
    .eq('domain', domain)
    .order('priority', { ascending: false });
  
  if (error || !rules || rules.length === 0) {
    return null;
  }
  
  for (const rule of rules) {
    const textToMatch = rule.match_field === 'counterparty' 
      ? (counterpartyRaw || '').toLowerCase()
      : descriptionClean.toLowerCase();
    
    let matches = false;
    const mt = rule.match_type.toUpperCase();
    
    if (mt === 'CONTAINS') {
      matches = textToMatch.includes(rule.pattern.toLowerCase());
    } else if (mt === 'STARTS_WITH') {
      matches = textToMatch.startsWith(rule.pattern.toLowerCase());
    } else if (mt === 'REGEX') {
      try {
        const regex = new RegExp(rule.pattern, 'i');
        matches = regex.test(textToMatch);
      } catch {
        // Invalid regex, skip
      }
    } else if (mt === 'EXACT') {
      matches = textToMatch === rule.pattern.toLowerCase();
    }
    
    if (matches) {
      return { 
        categoryId: rule.category_id, 
        categorySlug: rule.categories?.slug || null,
        ruleId: rule.id 
      };
    }
  }
  
  return null;
}

// ========== USER RULES (learned from corrections in My Data) ==========
// These take priority over Settings rules and over the generic categorizer.
interface UserRuleRow {
  id: string;
  match_type: string;
  pattern: string;
  tokens: string[] | null;
  movement: string;
  category: string;
  source: string;
}

function normalizeForRule(text: string): string {
  return (text || '')
    .toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function applyUserRulesMatch(
  description: string,
  rules: UserRuleRow[],
): { movement: string; category: string; ruleId: string } | null {
  const norm = normalizeForRule(description);
  for (const rule of rules) {
    let matched = false;
    const mt = (rule.match_type || '').toLowerCase();
    if (mt === 'fuzzy') {
      const tokens: string[] = rule.tokens || [];
      matched = tokens.length > 0 && tokens.every((t) => norm.includes(t.toUpperCase()));
    } else if (mt === 'contains') {
      matched = norm.includes((rule.pattern || '').toUpperCase());
    } else if (mt === 'starts_with') {
      matched = norm.startsWith((rule.pattern || '').toUpperCase());
    } else if (mt === 'ends_with') {
      matched = norm.endsWith((rule.pattern || '').toUpperCase());
    } else if (mt === 'exact') {
      matched = norm === (rule.pattern || '').toUpperCase();
    } else if (mt === 'regex') {
      try { matched = new RegExp(rule.pattern, 'i').test(description); } catch { /* ignore */ }
    }
    if (matched) {
      return { movement: rule.movement, category: rule.category, ruleId: rule.id };
    }
  }
  return null;
}

async function getCategoryIdBySlug(
  supabase: any,
  slug: string,
  domain: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', slug)
    .eq('domain', domain)
    .maybeSingle();
  
  if (error || !data) return null;
  return data.id;
}

// ========== ROBUST JSON PARSER ==========
function parseJsonFromAIResponse(rawContent: string): { transactions: any[] | null; error: string | null } {
  let jsonString = rawContent.trim();
  
  jsonString = jsonString.replace(/^```(?:json|JSON)?\s*\n?/g, '');
  jsonString = jsonString.replace(/\n?```\s*$/g, '');
  jsonString = jsonString.trim();
  
  if (!jsonString.startsWith('[') && !jsonString.startsWith('{')) {
    const arrayMatch = jsonString.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      jsonString = arrayMatch[0];
    } else {
      return { transactions: null, error: 'No JSON array found in response' };
    }
  }
  
  if (jsonString.startsWith('[') && !jsonString.endsWith(']')) {
    console.log('[process-import] Detected truncated JSON, attempting to fix...');
    
    let depth = 0;
    let lastValidIndex = -1;
    
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString[i];
      if (char === '[' || char === '{') {
        depth++;
      } else if (char === ']' || char === '}') {
        depth--;
        if (depth === 1 && char === '}') {
          lastValidIndex = i;
        }
      }
    }
    
    if (lastValidIndex > 0) {
      jsonString = jsonString.substring(0, lastValidIndex + 1) + ']';
      console.log('[process-import] Fixed truncated JSON, length now:', jsonString.length);
    }
  }
  
  try {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) {
      return { transactions: null, error: 'Parsed result is not an array' };
    }
    return { transactions: parsed, error: null };
  } catch (parseError) {
    const errorMsg = parseError instanceof Error ? parseError.message : 'Unknown parse error';
    return { transactions: null, error: errorMsg };
  }
}

// ========== CHUNKING LOGIC ==========
function splitIntoChunks(content: string): string[] {
  const chunks: string[] = [];
  
  const pagePattern = /---\s*Page\s*\d+\s*---/gi;
  const pages = content.split(pagePattern).filter(p => p.trim().length > 0);
  
  if (pages.length > 1) {
    let currentChunk = '';
    for (const page of pages) {
      if (currentChunk.length + page.length > MAX_CHUNK_SIZE && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = page;
      } else {
        currentChunk += '\n' + page;
      }
    }
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }
  } else {
    let remaining = content;
    while (remaining.length > MAX_CHUNK_SIZE) {
      let breakPoint = remaining.lastIndexOf('\n', MAX_CHUNK_SIZE);
      if (breakPoint < MAX_CHUNK_SIZE / 2) {
        breakPoint = MAX_CHUNK_SIZE;
      }
      chunks.push(remaining.substring(0, breakPoint).trim());
      remaining = remaining.substring(breakPoint).trim();
    }
    if (remaining.length > 0) {
      chunks.push(remaining);
    }
  }
  
  console.log(`[process-import] Split content into ${chunks.length} chunks`);
  return chunks;
}

// ========== AI CALL WITH RETRY ==========
async function callAIWithRetry(
  content: string,
  prompt: string,
  isLargeFile: boolean,
  retryCount = 0
): Promise<{ transactions: any[] | null; error: string | null }> {
  const maxRetries = 2;

  const effectivePrompt = isLargeFile ? SIMPLE_EXTRACTION_PROMPT : prompt;
  // Escalate to the stronger model for large files and on retry; Haiku is the fast/cheap
  // default for a first pass on a normal-sized chunk. (Migrated off Lovable's Gemini gateway.)
  const model = (isLargeFile || retryCount > 0) ? 'claude-sonnet-5' : 'claude-haiku-4-5';

  console.log(`[process-import] AI call attempt ${retryCount + 1}: model=${model}, contentLength=${content.length}, isLargeFile=${isLargeFile}`);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY ?? '',
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 16000,
      // Extraction is a structured task — no thinking, keeps output deterministic and
      // within max_tokens (Sonnet 5 runs adaptive thinking by default otherwise).
      thinking: { type: 'disabled' },
      system: effectivePrompt,
      messages: [
        { role: 'user', content: `Extract ALL transactions from this financial data:\n\n${content}` },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[process-import] AI API error: ${response.status}`, errorText);

    // 429 (rate limited) and 400/401/403 (bad request / auth / billing) are not worth
    // retrying blindly — surface them so the UI can show the right message.
    if (response.status === 429 || (response.status >= 400 && response.status < 500)) {
      return { transactions: null, error: `API error: ${response.status}` };
    }

    // 5xx / 529 (overloaded) — retry with backoff.
    if (retryCount < maxRetries) {
      console.log(`[process-import] Retrying AI call...`);
      await new Promise(r => setTimeout(r, 1000 * (retryCount + 1)));
      return callAIWithRetry(content, prompt, isLargeFile, retryCount + 1);
    }

    return { transactions: null, error: `AI API error after retries: ${response.status}` };
  }

  const aiData = await response.json();

  if (aiData.stop_reason === 'refusal') {
    return { transactions: null, error: 'AI declined to process the file' };
  }

  const rawContent = Array.isArray(aiData.content)
    ? aiData.content.find((b: any) => b.type === 'text')?.text
    : undefined;

  if (!rawContent) {
    return { transactions: null, error: 'No content in AI response' };
  }
  
  console.log(`[process-import] AI response length: ${rawContent.length}`);
  
  const result = parseJsonFromAIResponse(rawContent);
  
  if (result.error && retryCount < maxRetries) {
    console.log(`[process-import] Parse failed (${result.error}), retrying with pro model...`);
    console.log(`[process-import] Raw content preview: START>>>>${rawContent.substring(0, 300)}<<<<END`);
    console.log(`[process-import] Raw content end: START>>>>${rawContent.substring(Math.max(0, rawContent.length - 300))}<<<<END`);
    
    await new Promise(r => setTimeout(r, 1000));
    return callAIWithRetry(content, prompt, true, retryCount + 1);
  }
  
  return result;
}

// ========== MAIN HANDLER ==========

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
    const {
      fileContent,
      fileHash,
      fileName,
      fileSize,
      fileMime,
      fileStorageUrl,
      accountId = null,
      domain,
      targetMonth,
      sourceType = 'OTHER',
      confirmOutOfMonth = false
    } = await req.json();
    const userId = authData.user.id;

    if (!fileContent || !domain) {
      console.error('Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: fileContent, domain' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const hintedTargetMonth = targetMonth ? normalizeTargetMonth(targetMonth) : null;
    const autoDistribute = !hintedTargetMonth;

    console.log(`[process-import] Starting: domain=${domain}, targetMonth=${hintedTargetMonth ?? 'AUTO'}, contentLength=${fileContent.length}`);

    const calculatedFileHash = fileHash || await sha256(fileContent);
    
    // ========== DUPLICATE FILE DETECTION (BEFORE creating import) ==========
    const { data: existingImport, error: dupCheckError } = await supabase
      .from('imports')
      .select('id, status, file_name, uploaded_at, transactions_count')
      .eq('user_id', userId)
      .eq('file_hash_sha256', calculatedFileHash)
      .eq('status', 'NORMALIZED')
      .maybeSingle();
    
    if (existingImport) {
      console.log(`[process-import] Duplicate file detected! Hash: ${calculatedFileHash.substring(0, 16)}... Original import: ${existingImport.id}`);
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
    
    // Resolve the INITIAL period for the import row.
    // - If targetMonth hint was provided, use that month (fail fast if closed).
    // - In auto mode, leave it null for now; we'll pick the earliest detected
    //   month after AI extraction and patch the import row later.
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

    // Get user's accounts for internal transfer detection
    const { data: userAccounts } = await supabase
      .from('accounts')
      .select('id, name, institution, account_role')
      .eq('user_id', userId);
    
    const accountsForDetection = userAccounts || [];

    // ========== BUILD USER CONTEXT FOR ADVANCED CATEGORIZER ==========
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('first_name, last_name, joint_account_names, investment_platforms, custom_category_rules')
      .eq('user_id', userId)
      .maybeSingle();
    
    const { data: userPrefs } = await supabase
      .from('user_preferences')
      .select('country, base_currency')
      .eq('user_id', userId)
      .maybeSingle();

    // Parse custom_category_rules from profile
    const customRules = (userProfile?.custom_category_rules as any[]) || [];
    const customCategories = customRules
      .filter((r: any) => r.type === 'custom_category')
      .map((r: any) => ({
        slug: r.slug,
        name: r.name,
        movement: r.movement as 'INCOME' | 'EXPENSE',
        keywords: r.keywords as string[],
      }));
    const categoryRuleOverrides = customRules
      .filter((r: any) => r.type === 'rule_override')
      .map((r: any) => ({
        targetCategory: r.targetCategorySlug,
        keywords: r.keywords as string[],
      }));

    const userContext: UserContext | undefined = (userProfile?.first_name && userProfile?.last_name)
      ? {
          firstName: userProfile.first_name,
          lastName: userProfile.last_name,
          country: (userPrefs?.country as UserContext['country']) || undefined,
          currency: (userPrefs?.base_currency as UserContext['currency']) || undefined,
          jointAccountNames: userProfile.joint_account_names || undefined,
          customCategories: customCategories.length > 0 ? customCategories : undefined,
          categoryRuleOverrides: categoryRuleOverrides.length > 0 ? categoryRuleOverrides : undefined,
        }
      : undefined;

    if (userContext) {
      console.log(`[process-import] UserContext built: ${userContext.firstName} ${userContext.lastName}, country=${userContext.country || 'none'}`);
    } else {
      console.log(`[process-import] No UserContext (missing profile name)`);
    }

    // Pre-fetch category IDs for all slugs
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

    // Load user_rules — corrections learned from My Data. Highest priority,
    // applied before Settings rules and the generic categorizer.
    const { data: userRulesRaw } = await supabase
      .from('user_rules')
      .select('id, match_type, pattern, tokens, movement, category, source')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('source', { ascending: false })       // 'user_correction' > 'manual'
      .order('created_at', { ascending: false });  // newest first
    const userRules: UserRuleRow[] = (userRulesRaw || []) as UserRuleRow[];
    console.log(`[process-import] Loaded ${userRules.length} active user_rules`);

    // Create import record
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

    // ========== DETERMINE PROCESSING STRATEGY ==========
    const isLargeFile = fileContent.length > CHUNK_SIZE_THRESHOLD;
    const prompt = domain === 'INVESTING' ? INVESTING_ANALYSIS_PROMPT : CASHFLOW_ANALYSIS_PROMPT;
    
    let allTransactions: any[] = [];
    
    if (isLargeFile) {
      console.log(`[process-import] Large file detected (${fileContent.length} chars), using chunked processing`);
      
      const chunks = splitIntoChunks(fileContent);
      
      for (let i = 0; i < chunks.length; i++) {
        console.log(`[process-import] Processing chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)`);
        
        const result = await callAIWithRetry(chunks[i], prompt, true);
        
        if (result.error) {
          console.error(`[process-import] Chunk ${i + 1} failed: ${result.error}`);
          continue;
        }
        
        if (result.transactions && result.transactions.length > 0) {
          allTransactions = allTransactions.concat(result.transactions);
          console.log(`[process-import] Chunk ${i + 1} extracted ${result.transactions.length} transactions (total: ${allTransactions.length})`);
        }
      }
      
      if (allTransactions.length === 0) {
        console.log(`[process-import] No transactions extracted, deleting import ${importId}`);
        await supabase.from('imports').delete().eq('id', importId);
        
        return new Response(
          JSON.stringify({ 
            error: 'parse_failed',
            message: 'Could not extract transactions. The file may be too complex. Try exporting as CSV from your bank.'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      console.log(`[process-import] Small file (${fileContent.length} chars), using single AI call`);
      
      const result = await callAIWithRetry(fileContent, prompt, false);
      
      if (result.error) {
        console.error(`[process-import] AI processing failed: ${result.error}`);
        
        const is402 = result.error.includes('402');
        const is429 = result.error.includes('429');
        
        console.log(`[process-import] AI error, deleting import ${importId}`);
        await supabase.from('imports').delete().eq('id', importId);
        
        if (is402) {
          return new Response(
            JSON.stringify({ 
              error: 'payment_required',
              message: 'The AI service is unavailable (billing). Please check the account and try again.'
            }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        if (is429) {
          return new Response(
            JSON.stringify({ 
              error: 'rate_limited',
              message: 'Too many requests. Please wait a few minutes and try again.'
            }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        return new Response(
          JSON.stringify({ 
            error: 'ai_processing_failed',
            message: `Error de procesamiento: ${result.error}`
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      allTransactions = result.transactions || [];
    }

    console.log(`[process-import] Total transactions parsed: ${allTransactions.length}`);

    // ========== MULTI-MONTH DISTRIBUTION ==========
    // Group transactions by their actual posted month, resolve a period for
    // each detected month, and skip any month whose period is CLOSED.
    const monthCounts: Record<string, number> = {};
    for (const t of allTransactions) {
      const txDate = t.posted_date || t.date;
      if (txDate) {
        const k = extractMonthKey(txDate);
        monthCounts[k] = (monthCounts[k] || 0) + 1;
      }
    }

    const detectedMonths = Object.keys(monthCounts).sort();
    const earliestMonth = detectedMonths[0] || hintedTargetMonth || null;

    // Resolve period for each detected month (auto-create OPEN periods).
    const periodIdByMonth: Record<string, string> = {};
    const skippedMonths: Array<{ month: string; reason: string; count: number }> = [];

    for (const m of detectedMonths) {
      // Reuse the hinted period if it matches.
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

    // Patch the import row's period_id to point at the earliest VALID month
    // (so the file appears in that month tab in the UI). Falls back to the
    // hinted period if all detected months were skipped.
    const earliestValidMonth = detectedMonths.find((m) => periodIdByMonth[m]) || null;
    const importPeriodId =
      (earliestValidMonth && periodIdByMonth[earliestValidMonth]) ||
      initialPeriodId ||
      null;
    if (importPeriodId && importPeriodId !== initialPeriodId) {
      await supabase.from('imports').update({ period_id: importPeriodId }).eq('id', importId);
    }

    // Pre-fetch existing transactions for ALL detected months in one query so
    // duplicate detection is scoped per-month but cheap.
    const existingFingerprintsByMonth: Record<string, Set<string>> = {};
    const existingNaturalKeysByMonth: Record<string, Set<string>> = {};
    if (detectedMonths.length > 0) {
      const minMonth = detectedMonths[0];
      const maxMonth = detectedMonths[detectedMonths.length - 1];
      const [minY, minM] = minMonth.split('-').map(Number);
      const [maxY, maxM] = maxMonth.split('-').map(Number);
      const queryStart = `${minMonth}-01`;
      const nextM = maxM === 12 ? 1 : maxM + 1;
      const nextY = maxM === 12 ? maxY + 1 : maxY;
      const queryEnd = `${nextY}-${String(nextM).padStart(2, '0')}-01`;

      const { data: existingTxs } = await supabase
        .from('transactions')
        .select('fingerprint, date, amount, description_norm')
        .eq('user_id', userId)
        .eq('domain', domain)
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

    // Process and create transactions
    const stats = {
      totalParsed: allTransactions.length,
      newTransactions: 0,
      duplicatesIgnored: 0,
      skippedClosedMonth: 0,
      transfers: 0,
      income: 0,
      expenses: 0,
      categorizedByRule: 0,
      categorizedByCategorizer: 0,
      categorizedByAI: 0,
      failed: 0
    };
    const monthsDistribution: Record<string, { new: number; duplicates: number }> = {};
    for (const m of Object.keys(periodIdByMonth)) {
      monthsDistribution[m] = { new: 0, duplicates: 0 };
    }

    const newTransactions: any[] = [];
    // Per-month dedupe trackers (so identical txs in different months stay distinct).
    const seenFingerprintsByMonth: Record<string, Set<string>> = {};
    const seenNaturalKeysByMonth: Record<string, Set<string>> = {};

    for (let i = 0; i < allTransactions.length; i++) {
      const t = allTransactions[i];
      
      const postedDate = t.posted_date || t.date;
      const valueDate = t.value_date || null;
      const descriptionRaw = t.description_raw || t.description || '';
      const descriptionClean = t.description_clean || normalizeDescription(descriptionRaw);
      const amountSigned = t.amount_signed ?? t.amount;
      const runningBalance = t.running_balance ?? null;
      const sourceTransactionId = t.source_transaction_id || null;
      const paymentChannel = t.payment_channel || null;
      const counterpartyRaw = t.counterparty_raw || null;
      const currency = t.currency || 'EUR';
      
      if (!postedDate || amountSigned === undefined) {
        console.log(`[process-import] Skipping invalid transaction at index ${i}`);
        continue;
      }

      const txMonthKey = extractMonthKey(postedDate);
      const txPeriodId = periodIdByMonth[txMonthKey];
      if (!txPeriodId) {
        // Month is closed or failed to provision a period — skip but track.
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

      const fingerprint = await calculateFingerprint(
        userId,
        accountId,
        sourceTransactionId,
        postedDate,
        amountSigned,
        currency,
        descriptionRaw,
        runningBalance
      );

      const rowHash = await sha256(JSON.stringify(t));

      try {
        await supabase.from('import_rows').upsert({
          import_id: importId,
          row_index: i,
          raw_json: t,
          row_hash_sha256: rowHash,
          parsed_date: postedDate,
          parsed_amount: amountSigned,
          parsed_currency: currency,
          parsed_description: descriptionClean
        }, { 
          onConflict: 'import_id,row_hash_sha256',
          ignoreDuplicates: true 
        });
      } catch (rowError) {
        console.log(`[process-import] Row already exists, skipping: ${rowHash.substring(0, 8)}`);
      }

      if (existingFingerprints.has(fingerprint) || seenFingerprints.has(fingerprint)) {
        stats.duplicatesIgnored++;
        if (!monthsDistribution[txMonthKey]) monthsDistribution[txMonthKey] = { new: 0, duplicates: 0 };
        monthsDistribution[txMonthKey].duplicates++;
        console.log(`[process-import] Duplicate by fingerprint: ${descriptionClean.substring(0, 50)}`);
        continue;
      }

      const normalizedDesc = normalizeDescription(descriptionRaw);
      const naturalKey = `${postedDate}|${amountSigned.toFixed(2)}|${normalizedDesc.toLowerCase()}`;
      
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
      // Priority: User Rules > Advanced Categorizer (2500+ patterns) > AI
      
      // Start with AI/derived categorization as baseline
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
      
      // Detect internal transfers (may override classification)
      const transferDetection = detectInternalTransfer(
        movement,
        descriptionRaw,
        descriptionClean,
        counterpartyRaw,
        accountsForDetection,
        userContext ? { firstName: userContext.firstName, lastName: userContext.lastName } : undefined
      );
      
      if (transferDetection.isTransfer && movement !== 'TRANSFER') {
        movement = 'TRANSFER';
        categorySlug = transferDetection.categorySlug;
        stats.transfers++;
      }

      let categoryId: string | null = null;
      let categorizationRuleId: string | null = null;
      let categorySource = 'AI';
      
      // ── Priority 2: Advanced Categorizer (2500+ regex patterns) ──
      // Uses the description_raw for best matching against bank descriptions.
      // Also tries description_clean as fallback.
      const rawMatch = categorize(descriptionRaw, amountSigned, userContext)
                    || categorize(descriptionClean, amountSigned, userContext);

      // Sign-first guardrail: reject categorizer matches whose movement
      // contradicts the amount sign (TRANSFER is exempt — it can be ±).
      let categorizerMatch = rawMatch;
      if (rawMatch && rawMatch.movement !== 'TRANSFER') {
        if (rawMatch.movement === 'EXPENSE' && amountSigned > 0) {
          console.log(`[process-import] Rejected categorizer match (positive amount but EXPENSE rule): "${descriptionRaw.substring(0, 40)}" rule=${rawMatch.matchedRule}`);
          categorizerMatch = null;
        } else if (rawMatch.movement === 'INCOME' && amountSigned < 0) {
          console.log(`[process-import] Rejected categorizer match (negative amount but INCOME rule): "${descriptionRaw.substring(0, 40)}" rule=${rawMatch.matchedRule}`);
          categorizerMatch = null;
        }
      }

      if (categorizerMatch) {
        const mappedCategory = mapCategorySlug(categorizerMatch.category);
        movement = categorizerMatch.movement as MovementType;
        categorySlug = mappedCategory;
        categorySlug = validateCategorySlug(categorySlug, movement);
        categoryId = categorySlugToId[categorySlug] || null;
        categorySource = 'CATEGORIZER';
        categorizedBy = 'categorizer';
        stats.categorizedByCategorizer++;

        console.log(`[process-import] Categorizer match: "${descriptionRaw.substring(0, 40)}" → ${categorizerMatch.category}→${categorySlug} (confidence: ${categorizerMatch.confidence}, rule: ${categorizerMatch.matchedRule.substring(0, 40)})`);
      } else {
        // No (valid) categorizer match — fall back to sign-derived movement.
        if (amountSigned > 0 && movement !== 'TRANSFER') {
          movement = 'INCOME';
          categorySlug = 'other_income';
        } else if (amountSigned < 0 && movement !== 'TRANSFER') {
          movement = 'EXPENSE';
          categorySlug = 'other_expense';
        }
        stats.categorizedByAI++;
        categoryId = categorySlugToId[categorySlug] || null;
      }
      
      // ── Priority 1a: user_rules (learned corrections from My Data) ──
      const userRuleHit = applyUserRulesMatch(descriptionRaw, userRules)
                       || applyUserRulesMatch(descriptionClean, userRules);

      // ── Priority 1b: categorization_rules (Settings rules) — only if no user_rule matched ──
      const ruleMatch = userRuleHit
        ? null
        : await applyCategoryRules(supabase, userId, domain, descriptionClean, counterpartyRaw);

      if (userRuleHit) {
        const mappedCat = mapCategorySlug(userRuleHit.category);
        const validatedCat = validateCategorySlug(mappedCat, userRuleHit.movement as MovementType);
        movement = userRuleHit.movement as MovementType;
        categorySlug = validatedCat;
        categoryId = categorySlugToId[categorySlug] || null;
        categorizationRuleId = userRuleHit.ruleId;
        categorySource = 'USER_RULE';
        categorizedBy = 'user_rule';
        if (categorizerMatch) stats.categorizedByCategorizer--;
        else stats.categorizedByAI--;
        stats.categorizedByRule++;
        console.log(`[process-import] user_rule match: "${descriptionRaw.substring(0, 40)}" → ${userRuleHit.movement}/${categorySlug} (rule=${userRuleHit.ruleId})`);
      }
      
      if (ruleMatch) {
        categoryId = ruleMatch.categoryId;
        if (ruleMatch.categorySlug) {
          if (INCOME_SLUGS.includes(ruleMatch.categorySlug)) {
            movement = 'INCOME';
          } else if (EXPENSE_SLUGS.includes(ruleMatch.categorySlug)) {
            movement = 'EXPENSE';
          } else if (TRANSFER_SLUGS.includes(ruleMatch.categorySlug)) {
            movement = 'TRANSFER';
          }
          categorySlug = ruleMatch.categorySlug;
        }
        categorizationRuleId = ruleMatch.ruleId;
        categorySource = 'RULE';
        categorizedBy = 'user_rule';
        
        // Adjust stats
        if (categorizerMatch) {
          stats.categorizedByCategorizer--;
        } else {
          stats.categorizedByAI--;
        }
        stats.categorizedByRule++;
      }

      // ── Sign sanity check: amount sign must agree with movement (except TRANSFER) ──
      // A positive amount cannot be an EXPENSE; a negative amount cannot be INCOME.
      if (movement === 'EXPENSE' && amountSigned > 0) {
        movement = 'INCOME';
        categorySlug = 'other_income';
        categoryId = categorySlugToId[categorySlug] || null;
        console.log(`[process-import] Sign correction: positive amount ${amountSigned} re-classified EXPENSE→INCOME for "${descriptionRaw.substring(0, 40)}"`);
      } else if (movement === 'INCOME' && amountSigned < 0) {
        movement = 'EXPENSE';
        categorySlug = 'other_expense';
        categoryId = categorySlugToId[categorySlug] || null;
        console.log(`[process-import] Sign correction: negative amount ${amountSigned} re-classified INCOME→EXPENSE for "${descriptionRaw.substring(0, 40)}"`);
      }

      const legacyType = getLegacyType(movement);
      const legacyTxType = getLegacyTxType(movement, categorySlug);

      if (movement === 'INCOME') stats.income++;
      else if (movement === 'EXPENSE') stats.expenses++;
      else if (movement === 'TRANSFER') stats.transfers++;

      const txRecord: any = {
        user_id: userId,
        domain: domain,
        period_id: txPeriodId,
        _month_key: txMonthKey,
        import_id: importId,
        account_id: accountId,
        date: postedDate,
        posted_date: postedDate,
        value_date: valueDate,
        amount: amountSigned,
        currency: currency,
        running_balance: runningBalance,
        description: descriptionClean || 'Sin descripción',
        description_raw: descriptionRaw,
        description_norm: normalizeDescription(descriptionRaw),
        description_clean: descriptionClean,
        movement: movement,
        category_id: categoryId,
        categorization_rule_id: categorizationRuleId,
        category_source: categorySource,
        categorized_by: categorizedBy,
        tx_type: legacyTxType,
        payment_channel: validatePaymentChannel(paymentChannel),
        source_transaction_id: sourceTransactionId,
        counterparty_raw: counterpartyRaw,
        type: legacyType,
        category: categorySlug,
        bank: domain === 'INVESTING' ? t.platform : t.bank,
        fingerprint: fingerprint,
        source_row_hash: rowHash,
      };

      newTransactions.push(txRecord);
    }

    // Batch insert transactions
    let insertFailedCount = 0;
    const insertErrorSamples: string[] = [];
    if (newTransactions.length > 0) {
      let successCount = 0;
      let duplicateCount = 0;

      for (const tx of newTransactions) {
        const txMonthKey: string = tx._month_key;
        // Strip our internal helper field before inserting.
        const { _month_key, ...txClean } = tx;
        const { error: insertError } = await supabase
          .from('transactions')
          .insert(txClean);

        if (insertError) {
          if (insertError.code === '23505') {
            duplicateCount++;
            if (!monthsDistribution[txMonthKey]) monthsDistribution[txMonthKey] = { new: 0, duplicates: 0 };
            monthsDistribution[txMonthKey].duplicates++;
          } else {
            // A real insert failure (not a duplicate). Previously this was only logged and
            // the import was still reported as NORMALIZED, silently dropping the row.
            insertFailedCount++;
            if (insertErrorSamples.length < 5) insertErrorSamples.push(insertError.message);
            console.error('[process-import] Error inserting transaction:', insertError);
          }
        } else {
          successCount++;
          if (!monthsDistribution[txMonthKey]) monthsDistribution[txMonthKey] = { new: 0, duplicates: 0 };
          monthsDistribution[txMonthKey].new++;
        }
      }

      stats.newTransactions = successCount;
      stats.duplicatesIgnored += duplicateCount;
      stats.failed = insertFailedCount;

      console.log(`[process-import] Inserted ${successCount} transactions, ${duplicateCount} duplicates skipped, ${insertFailedCount} failed`);
    }

    // Finalize import status — surface partial/total failures instead of always
    // reporting NORMALIZED (which used to mask silently-dropped rows).
    const insertedCount = stats.newTransactions;
    let importStatus: 'NORMALIZED' | 'FAILED' = 'NORMALIZED';
    let importErrorMessage: string | null = null;

    if (insertFailedCount > 0 && insertedCount === 0) {
      // Nothing landed and at least one row errored (not just duplicates) → hard failure.
      importStatus = 'FAILED';
      importErrorMessage = `All ${insertFailedCount} transaction insert(s) failed. First errors: ${insertErrorSamples.join(' | ')}`;
    } else if (insertFailedCount > 0) {
      // Some rows landed, some errored → partial import; keep the data but flag it.
      importErrorMessage = `${insertFailedCount} of ${insertFailedCount + insertedCount} transaction(s) failed to insert. First errors: ${insertErrorSamples.join(' | ')}`;
    } else if (insertedCount === 0 && stats.duplicatesIgnored > 0) {
      importErrorMessage = 'All transactions already existed';
    }

    await supabase.from('imports').update({
      status: importStatus,
      transactions_count: insertedCount,
      error_message: importErrorMessage
    }).eq('id', importId);

    // Log to audit
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
    if (insertFailedCount > 0) {
      message += `, ${insertFailedCount} failed to save`;
    }

    // Log categorization savings
    const totalCategorized = stats.categorizedByRule + stats.categorizedByCategorizer;
    const aiSavingsPercent = stats.newTransactions > 0 
      ? Math.round((totalCategorized / stats.newTransactions) * 100) 
      : 0;
    console.log(`[process-import] Categorization stats: rules=${stats.categorizedByRule}, categorizer=${stats.categorizedByCategorizer}, AI=${stats.categorizedByAI}, local_coverage=${aiSavingsPercent}%`);

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
