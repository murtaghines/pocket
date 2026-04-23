import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";
import { categorize, type UserContext, type CategorizationResult, type Category } from "../_shared/categorizer.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// ========== MOVEMENT TYPES ==========
type MovementType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

// ========== CATEGORY SLUGS BY MOVEMENT (app-level) ==========
const INCOME_SLUGS = ['salary', 'refunds', 'transfers', 'other_income', 'investment', 'freelance', 'rents'];
const EXPENSE_SLUGS = ['housing', 'groceries', 'restaurants', 'transport', 'health', 'entertainment', 'shopping', 'education', 'subscriptions', 'travel', 'sports', 'other_expense', 'pets'];
const TRANSFER_SLUGS = ['own_transfer', 'to_investment'];

// ========== EXTENDED → APP CATEGORY MAPPING ==========
// The advanced categorizer uses more categories than the app.
// This maps extended categories to app-level categories.
const CATEGORY_SLUG_MAP: Record<string, string> = {
  // Income extended → app
  'investments_income': 'investment',
  'rental_income': 'rents',
  'transfers_in': 'transfers',
  'gifts_received': 'other_income',
  'sales': 'other_income',
  // Expense extended → app
  'gifts_given': 'other_expense',
  'insurance': 'other_expense',
  'family': 'other_expense',
  'donations': 'other_expense',
  'personal_services': 'other_expense',
  'taxes': 'other_expense',
};

/** Map an extended category slug to an app-level slug */
function mapCategorySlug(slug: string): string {
  // Handle custom_ prefixed categories from the categorizer
  if (slug.startsWith('custom_')) return slug;
  return CATEGORY_SLUG_MAP[slug] || slug;
}

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

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function normalizeDescription(desc: string): string {
  return (desc || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/ref\.?\s*\d+/gi, '')
    .replace(/\*{4}\d{4}/g, '')
    .replace(/\d{10,}/g, '')
    .trim()
    .substring(0, 200);
}

async function calculateFingerprint(
  userId: string,
  accountId: string | null,
  sourceTransactionId: string | null,
  postedDate: string,
  amountSigned: number,
  currency: string,
  descriptionRaw: string,
  runningBalance: number | null
): Promise<string> {
  if (sourceTransactionId) {
    const input = `${userId}|${accountId || 'no-account'}|${sourceTransactionId}`;
    return await sha256(input);
  }
  
  const normalizedDesc = normalizeDescription(descriptionRaw);
  const balancePart = runningBalance !== null ? `|${runningBalance.toFixed(2)}` : '';
  const input = `${userId}|${accountId || 'no-account'}|${postedDate}|${amountSigned.toFixed(2)}|${currency}|${normalizedDesc}${balancePart}`;
  return await sha256(input);
}

function extractMonthKey(dateStr: string): string {
  // Parse YYYY-MM-DD directly to avoid timezone issues with new Date()
  const match = dateStr.match(/^(\d{4})-(\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}`;
  }
  // Fallback for other formats
  const date = new Date(dateStr + 'T12:00:00Z');
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

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

function validateCategorySlug(slug: string | null, movement: MovementType): string {
  if (!slug) {
    switch (movement) {
      case 'INCOME': return 'other_income';
      case 'EXPENSE': return 'other_expense';
      case 'TRANSFER': return 'own_transfer';
    }
  }
  
  const normalizedSlug = slug!.toLowerCase().replace(/\s+/g, '_');
  // Map extended categories to app categories
  const mappedSlug = mapCategorySlug(normalizedSlug);
  
  switch (movement) {
    case 'INCOME':
      return INCOME_SLUGS.includes(mappedSlug) ? mappedSlug : 'other_income';
    case 'EXPENSE':
      return EXPENSE_SLUGS.includes(mappedSlug) ? mappedSlug : 'other_expense';
    case 'TRANSFER':
      return TRANSFER_SLUGS.includes(mappedSlug) ? mappedSlug : 'own_transfer';
  }
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
  const model = (isLargeFile || retryCount > 0) ? 'google/gemini-2.5-pro' : 'google/gemini-2.5-flash';
  
  console.log(`[process-import] AI call attempt ${retryCount + 1}: model=${model}, contentLength=${content.length}, isLargeFile=${isLargeFile}`);
  
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: effectivePrompt },
        { role: 'user', content: `Extract ALL transactions from this financial data:\n\n${content}` }
      ],
      temperature: 0.1,
      max_tokens: 32000,
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[process-import] AI API error: ${response.status}`, errorText);
    
    if (response.status === 429 || response.status === 402) {
      return { transactions: null, error: `API error: ${response.status}` };
    }
    
    if (retryCount < maxRetries) {
      console.log(`[process-import] Retrying AI call...`);
      await new Promise(r => setTimeout(r, 1000 * (retryCount + 1)));
      return callAIWithRetry(content, prompt, isLargeFile, retryCount + 1);
    }
    
    return { transactions: null, error: `AI API error after retries: ${response.status}` };
  }
  
  const aiData = await response.json();
  const rawContent = aiData.choices?.[0]?.message?.content;
  
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
    const { 
      fileContent, 
      fileHash,
      fileName,
      fileSize,
      fileMime,
      fileStorageUrl,
      userId, 
      accountId = null,
      domain,
      targetMonth,
      sourceType = 'OTHER',
      confirmOutOfMonth = false
    } = await req.json();

    // targetMonth is OPTIONAL: when provided we use it as a hint and as the
    // initial period for the import row; when omitted, the file is fully
    // distributed across whatever months the transactions actually belong to.
    if (!fileContent || !userId || !domain) {
      console.error('Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: fileContent, userId, domain' }),
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
    
    // Get or create period
    const { data: period, error: periodError } = await supabase
      .from('periods')
      .select('id, status')
      .eq('user_id', userId)
      .eq('month_key', normalizedTargetMonth)
      .eq('domain', domain)
      .maybeSingle();

    let periodId: string;
    
    if (period) {
      if (period.status === 'CLOSED') {
        return new Response(
          JSON.stringify({ 
            error: 'period_closed',
            message: `The period ${normalizedTargetMonth} is closed. You must reopen it to add data.`
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      periodId = period.id;
    } else {
      const { data: newPeriod, error: createError } = await supabase
        .from('periods')
        .insert({
          user_id: userId,
          month_key: normalizedTargetMonth,
          domain: domain,
          status: 'OPEN'
        })
        .select('id')
        .single();

      if (createError) {
        console.error('[process-import] Error creating period:', createError);
        throw new Error(`Failed to create period: ${createError.message}`);
      }
      periodId = newPeriod.id;
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

    // Create import record
    const { data: importRecord, error: importError } = await supabase
      .from('imports')
      .insert({
        user_id: userId,
        period_id: periodId,
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
              message: 'No AI credits. Please add credits in Lovable to continue.'
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

    // Check for date mismatches
    const dateWarnings: Array<{ date: string; description: string; expected: string; found: string }> = [];
    const monthCounts: Record<string, number> = {};
    
    for (const t of allTransactions) {
      const txDate = t.posted_date || t.date;
      if (txDate) {
        const txMonthKey = extractMonthKey(txDate);
        monthCounts[txMonthKey] = (monthCounts[txMonthKey] || 0) + 1;
        if (txMonthKey !== normalizedTargetMonth) {
          dateWarnings.push({
            date: txDate,
            description: t.description_clean || t.description || '',
            expected: normalizedTargetMonth,
            found: txMonthKey
          });
        }
      }
    }

    // If ALL transactions belong to a different month, auto-redirect to the correct month
    const targetMonthCount = monthCounts[normalizedTargetMonth] || 0;
    let redirectedFromMonth: string | null = null;
    if (allTransactions.length > 0 && targetMonthCount === 0) {
      const dominantMonth = Object.entries(monthCounts).sort((a, b) => b[1] - a[1])[0];
      const correctMonth = dominantMonth[0];
      console.log(`[process-import] Wrong month detected! All ${allTransactions.length} transactions belong to ${correctMonth}, not ${normalizedTargetMonth}. Auto-redirecting.`);
      
      redirectedFromMonth = normalizedTargetMonth;
      normalizedTargetMonth = correctMonth;

      const { data: correctPeriod } = await supabase
        .from('periods')
        .select('id, status')
        .eq('user_id', userId)
        .eq('month_key', correctMonth)
        .eq('domain', domain)
        .maybeSingle();

      if (correctPeriod?.status === 'CLOSED') {
        await supabase.from('import_rows').delete().eq('import_id', importId);
        await supabase.from('imports').delete().eq('id', importId);
        if (fileStorageUrl) {
          await supabase.storage.from('financial-files').remove([fileStorageUrl]);
        }
        return new Response(
          JSON.stringify({ 
            error: 'period_closed',
            message: `This file contains transactions from ${correctMonth}, but that period is closed.`
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (correctPeriod) {
        periodId = correctPeriod.id;
      } else {
        const { data: newCorrectPeriod, error: createErr } = await supabase
          .from('periods')
          .insert({ user_id: userId, month_key: correctMonth, domain, status: 'OPEN' })
          .select('id')
          .single();
        if (createErr) throw new Error(`Failed to create period for ${correctMonth}: ${createErr.message}`);
        periodId = newCorrectPeriod.id;
      }

      await supabase.from('imports').update({ period_id: periodId }).eq('id', importId);
    }

    // Get existing transactions for TARGET MONTH ONLY to detect duplicates
    const [targetYear, targetMonthNum] = normalizedTargetMonth.split('-').map(Number);
    const monthStart = `${normalizedTargetMonth}-01`;
    const nextMonth = targetMonthNum === 12 ? 1 : targetMonthNum + 1;
    const nextYear = targetMonthNum === 12 ? targetYear + 1 : targetYear;
    const monthEnd = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
    
    const { data: existingTxs } = await supabase
      .from('transactions')
      .select('fingerprint, date, amount, description_norm')
      .eq('user_id', userId)
      .eq('domain', domain)
      .gte('date', monthStart)
      .lt('date', monthEnd);
    
    console.log(`[process-import] Querying duplicates for month ${normalizedTargetMonth} (${monthStart} to ${monthEnd})`);

    const existingFingerprints = new Set(
      existingTxs?.filter(t => t.fingerprint).map(t => t.fingerprint) || []
    );
    
    const existingNaturalKeys = new Set(
      existingTxs?.map(t => 
        `${t.date}|${parseFloat(t.amount).toFixed(2)}|${(t.description_norm || '').toLowerCase()}`
      ) || []
    );
    
    console.log(`[process-import] Found ${existingFingerprints.size} existing fingerprints, ${existingNaturalKeys.size} natural keys`);

    // Process and create transactions
    const stats = {
      totalParsed: allTransactions.length,
      newTransactions: 0,
      duplicatesIgnored: 0,
      outsideMonthSkipped: 0,
      transfers: 0,
      income: 0,
      expenses: 0,
      categorizedByRule: 0,
      categorizedByCategorizer: 0,
      categorizedByAI: 0
    };

    const newTransactions: any[] = [];
    const seenFingerprints = new Set<string>();
    const seenNaturalKeys = new Set<string>();

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
      if (txMonthKey !== normalizedTargetMonth) {
        console.log(`[process-import] Filtering out transaction from ${txMonthKey} (target: ${normalizedTargetMonth}): ${descriptionClean.substring(0, 40)}`);
        stats.outsideMonthSkipped++;
        continue;
      }

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
        console.log(`[process-import] Duplicate by fingerprint: ${descriptionClean.substring(0, 50)}`);
        continue;
      }

      const normalizedDesc = normalizeDescription(descriptionRaw);
      const naturalKey = `${postedDate}|${amountSigned.toFixed(2)}|${normalizedDesc.toLowerCase()}`;
      
      if (existingNaturalKeys.has(naturalKey) || seenNaturalKeys.has(naturalKey)) {
        stats.duplicatesIgnored++;
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
      const categorizerMatch = categorize(descriptionRaw, amountSigned, userContext)
                            || categorize(descriptionClean, amountSigned, userContext);
      
      if (categorizerMatch) {
        // Map extended categories to app categories
        const mappedCategory = mapCategorySlug(categorizerMatch.category);
        
        // Determine movement from categorizer result
        movement = categorizerMatch.movement as MovementType;
        categorySlug = mappedCategory;
        
        // Validate the mapped slug is valid for this movement
        categorySlug = validateCategorySlug(categorySlug, movement);
        
        categoryId = categorySlugToId[categorySlug] || null;
        categorySource = 'CATEGORIZER';
        categorizedBy = 'categorizer';
        stats.categorizedByCategorizer++;
        
        console.log(`[process-import] Categorizer match: "${descriptionRaw.substring(0, 40)}" → ${categorizerMatch.category}→${categorySlug} (confidence: ${categorizerMatch.confidence}, rule: ${categorizerMatch.matchedRule.substring(0, 40)})`);
      } else {
        stats.categorizedByAI++;
        categoryId = categorySlugToId[categorySlug] || null;
      }
      
      // ── Priority 1: User categorization rules (HIGHEST priority) ──
      const ruleMatch = await applyCategoryRules(
        supabase,
        userId,
        domain,
        descriptionClean,
        counterpartyRaw
      );
      
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

      const legacyType = getLegacyType(movement);
      const legacyTxType = getLegacyTxType(movement, categorySlug);

      if (movement === 'INCOME') stats.income++;
      else if (movement === 'EXPENSE') stats.expenses++;
      else if (movement === 'TRANSFER') stats.transfers++;

      const txRecord: any = {
        user_id: userId,
        domain: domain,
        period_id: periodId,
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
    if (newTransactions.length > 0) {
      let successCount = 0;
      let duplicateCount = 0;
      
      for (const tx of newTransactions) {
        const { error: insertError } = await supabase
          .from('transactions')
          .insert(tx);
        
        if (insertError) {
          if (insertError.code === '23505') {
            duplicateCount++;
          } else {
            console.error('[process-import] Error inserting transaction:', insertError);
          }
        } else {
          successCount++;
        }
      }
      
      stats.newTransactions = successCount;
      stats.duplicatesIgnored += duplicateCount;
      
      console.log(`[process-import] Inserted ${successCount} transactions, ${duplicateCount} duplicates skipped`);
      
      if (successCount === 0 && duplicateCount === newTransactions.length) {
        await supabase.from('imports').update({ 
          status: 'NORMALIZED',
          transactions_count: 0,
          error_message: 'All transactions already existed'
        }).eq('id', importId);
      }
    }

    // Update import status
    await supabase.from('imports').update({ 
      status: 'NORMALIZED',
      transactions_count: stats.newTransactions
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
        target_month: normalizedTargetMonth,
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
        stats,
        redirectedFromMonth: redirectedFromMonth || undefined,
        actualMonth: redirectedFromMonth ? normalizedTargetMonth : undefined,
        dateWarnings: dateWarnings.length > 0 ? dateWarnings.slice(0, 10) : undefined
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
