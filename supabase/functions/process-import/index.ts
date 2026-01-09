import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// ========== MOVEMENT TYPES ==========
type MovementType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

// ========== CATEGORY SLUGS BY MOVEMENT ==========
const INCOME_SLUGS = ['salary', 'refunds', 'sales', 'transfers_in', 'other_income'];
const EXPENSE_SLUGS = ['housing', 'groceries', 'restaurants', 'transport', 'health', 'entertainment', 'shopping', 'education', 'subscriptions', 'travel', 'other_expense'];
const TRANSFER_SLUGS = ['own_transfer', 'to_investment'];

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
const CHUNK_SIZE_THRESHOLD = 6000; // Characters threshold for chunking
const MAX_CHUNK_SIZE = 4000; // Max characters per chunk

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
- Category slugs: salary, refunds, sales, transfers_in, other_income

EXPENSE: Money leaving to a third party representing real consumption or payment.
- Purchases at stores, restaurants, services
- Rent, utilities, subscriptions
- Payments to external merchants or people
- CRITICAL: If a "transfer" goes to a THIRD PARTY (not own account, not investment), it's EXPENSE, not TRANSFER!
- Category slugs: housing, groceries, restaurants, transport, health, entertainment, shopping, education, subscriptions, travel, other_expense

TRANSFER: Movement between the user's OWN accounts or to their OWN investment accounts. NO consumption.
- Between own bank accounts (Santander ↔ Revolut ↔ MercadoPago)
- To own savings/investment accounts (broker, instant access savings, trading)
- CRITICAL: Only TRANSFER if destination is user's own account or investment platform!
- Category slugs: own_transfer (between own accounts), to_investment (to savings/investment)

=== TRANSFER vs EXPENSE DECISION (CRITICAL RULE) ===

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

If UNCERTAIN whether a transfer goes to own account or third party:
→ Classify as EXPENSE with category "other_expense"

Bizum/transfer to friend, family, or unknown person = EXPENSE (not TRANSFER!)
Payment to merchant via bank transfer = EXPENSE (not TRANSFER!)

=== CATEGORY ASSIGNMENT (Step 2) ===

After determining movement, assign the specific category_slug:

INCOME categories:
- salary: Payroll, wages, regular employment income (Nómina, Sueldo, Payroll)
- refunds: Returns, refunds, chargebacks (Devolución, Refund)
- sales: Income from selling items/goods (not salary)
- transfers_in: Money received from own accounts (opposite leg of own_transfer)
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
- Dividends: INCOME + other_income
- Interest: INCOME + other_income
- Platform fees: EXPENSE + other_expense
- Buy/Sell trades: TRANSFER + to_investment (internal platform movement)

Example output:
[
  {"posted_date":"2024-12-15","value_date":null,"description_raw":"Aporte mensual","description_clean":"Aporte mensual","amount_signed":500.00,"source_transaction_id":"TX123456","movement":"TRANSFER","category_slug":"to_investment","platform":"Cocos","asset_type":"fund","currency":"EUR"},
  {"posted_date":"2024-12-10","value_date":"2024-12-11","description_raw":"Dividendo Apple Inc AAPL","description_clean":"Dividendo Apple Inc","amount_signed":12.50,"source_transaction_id":null,"movement":"INCOME","category_slug":"other_income","platform":"DEGIRO","asset_type":"stocks","currency":"USD"},
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
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
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
  
  const normalizedSlug = slug.toLowerCase().replace(/\s+/g, '_');
  
  switch (movement) {
    case 'INCOME':
      return INCOME_SLUGS.includes(normalizedSlug) ? normalizedSlug : 'other_income';
    case 'EXPENSE':
      return EXPENSE_SLUGS.includes(normalizedSlug) ? normalizedSlug : 'other_expense';
    case 'TRANSFER':
      return TRANSFER_SLUGS.includes(normalizedSlug) ? normalizedSlug : 'own_transfer';
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
  userAccounts: Array<{ name: string; institution: string | null; account_role: string }>
): { isTransfer: boolean; categorySlug: string } {
  if (movement === 'TRANSFER') {
    return { isTransfer: true, categorySlug: 'own_transfer' };
  }
  
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
    
    if (rule.match_type === 'contains') {
      matches = textToMatch.includes(rule.pattern.toLowerCase());
    } else if (rule.match_type === 'starts_with') {
      matches = textToMatch.startsWith(rule.pattern.toLowerCase());
    } else if (rule.match_type === 'regex') {
      try {
        const regex = new RegExp(rule.pattern, 'i');
        matches = regex.test(textToMatch);
      } catch {
        // Invalid regex, skip
      }
    } else if (rule.match_type === 'exact') {
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
  
  // Remove markdown code blocks more robustly
  jsonString = jsonString.replace(/^```(?:json|JSON)?\s*\n?/g, '');
  jsonString = jsonString.replace(/\n?```\s*$/g, '');
  jsonString = jsonString.trim();
  
  // Try to find JSON array if not starting with [
  if (!jsonString.startsWith('[') && !jsonString.startsWith('{')) {
    const arrayMatch = jsonString.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      jsonString = arrayMatch[0];
    } else {
      return { transactions: null, error: 'No JSON array found in response' };
    }
  }
  
  // If it's incomplete (truncated), try to fix it
  if (jsonString.startsWith('[') && !jsonString.endsWith(']')) {
    console.log('[process-import] Detected truncated JSON, attempting to fix...');
    
    // Count opening braces to find where last complete object ends
    let depth = 0;
    let lastValidIndex = -1;
    
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString[i];
      if (char === '[' || char === '{') {
        depth++;
      } else if (char === ']' || char === '}') {
        depth--;
        if (depth === 1 && char === '}') {
          // We just closed an object at depth 1 (inside the array)
          lastValidIndex = i;
        }
      }
    }
    
    if (lastValidIndex > 0) {
      // Check if there's a comma after the last valid object
      let afterLast = jsonString.substring(lastValidIndex + 1).trim();
      if (afterLast.startsWith(',')) {
        // Remove trailing comma and close array
        jsonString = jsonString.substring(0, lastValidIndex + 1) + ']';
      } else {
        // Just close array
        jsonString = jsonString.substring(0, lastValidIndex + 1) + ']';
      }
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
  
  // First try to split by page markers (--- Page N ---)
  const pagePattern = /---\s*Page\s*\d+\s*---/gi;
  const pages = content.split(pagePattern).filter(p => p.trim().length > 0);
  
  if (pages.length > 1) {
    // Combine pages into chunks that don't exceed MAX_CHUNK_SIZE
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
    // Split by character count
    let remaining = content;
    while (remaining.length > MAX_CHUNK_SIZE) {
      // Try to find a good break point (newline)
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
  
  // Use simpler prompt for large files to reduce output size
  const effectivePrompt = isLargeFile ? SIMPLE_EXTRACTION_PROMPT : prompt;
  
  // Model selection: use pro for large files or retries
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
    
    // Retry on other errors
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
    return callAIWithRetry(content, prompt, true, retryCount + 1); // Force large file mode on retry
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

    if (!fileContent || !userId || !domain || !targetMonth) {
      console.error('Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: fileContent, userId, domain, targetMonth' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedTargetMonth = normalizeTargetMonth(targetMonth);

    console.log(`[process-import] Starting: domain=${domain}, targetMonth=${normalizedTargetMonth}, contentLength=${fileContent.length}`);

    const calculatedFileHash = fileHash || await sha256(fileContent);
    
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
            message: `El período ${normalizedTargetMonth} está cerrado. Debe reabrirlo para agregar datos.`
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
      // CHUNKED PROCESSING for large files
      console.log(`[process-import] Large file detected (${fileContent.length} chars), using chunked processing`);
      
      const chunks = splitIntoChunks(fileContent);
      
      for (let i = 0; i < chunks.length; i++) {
        console.log(`[process-import] Processing chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)`);
        
        const result = await callAIWithRetry(chunks[i], prompt, true);
        
        if (result.error) {
          console.error(`[process-import] Chunk ${i + 1} failed: ${result.error}`);
          // Continue with other chunks
          continue;
        }
        
        if (result.transactions && result.transactions.length > 0) {
          allTransactions = allTransactions.concat(result.transactions);
          console.log(`[process-import] Chunk ${i + 1} extracted ${result.transactions.length} transactions (total: ${allTransactions.length})`);
        }
      }
      
      if (allTransactions.length === 0) {
        await supabase.from('imports').update({ 
          status: 'FAILED', 
          error_message: 'No se pudieron extraer transacciones del archivo. Intente subir en formato CSV.' 
        }).eq('id', importId);
        
        return new Response(
          JSON.stringify({ 
            error: 'parse_failed',
            message: 'No se pudieron extraer transacciones. El archivo puede ser muy complejo. Intente exportar como CSV desde su banco.'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // SINGLE CALL for smaller files
      console.log(`[process-import] Small file (${fileContent.length} chars), using single AI call`);
      
      const result = await callAIWithRetry(fileContent, prompt, false);
      
      if (result.error) {
        console.error(`[process-import] AI processing failed: ${result.error}`);
        await supabase.from('imports').update({ 
          status: 'FAILED', 
          error_message: `Error de procesamiento: ${result.error}` 
        }).eq('id', importId);
        
        return new Response(
          JSON.stringify({ error: 'Failed to parse AI response as JSON' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      allTransactions = result.transactions || [];
    }

    console.log(`[process-import] Total transactions parsed: ${allTransactions.length}`);

    // Check for date mismatches
    const dateWarnings: Array<{ date: string; description: string; expected: string; found: string }> = [];
    
    for (const t of allTransactions) {
      const txDate = t.posted_date || t.date;
      if (txDate) {
        const txMonthKey = extractMonthKey(txDate);
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
      categorizedByRule: 0
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
      
      // For simplified extraction (large files), derive movement from amount sign
      let movement: MovementType;
      let categorySlug: string;
      
      if (t.movement) {
        movement = validateMovement(t.movement);
        categorySlug = validateCategorySlug(t.category_slug, movement);
      } else {
        // Derive from amount sign
        movement = amountSigned >= 0 ? 'INCOME' : 'EXPENSE';
        categorySlug = movement === 'INCOME' ? 'other_income' : 'other_expense';
      }
      
      // Detect internal transfers (may override classification)
      const transferDetection = detectInternalTransfer(
        movement,
        descriptionRaw,
        descriptionClean,
        counterpartyRaw,
        accountsForDetection
      );
      
      if (transferDetection.isTransfer && movement !== 'TRANSFER') {
        movement = 'TRANSFER';
        categorySlug = transferDetection.categorySlug;
        stats.transfers++;
      }

      // Apply user categorization rules (highest priority after manual)
      let categoryId: string | null = null;
      let categorizationRuleId: string | null = null;
      let categorySource = 'AI';
      
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
        stats.categorizedByRule++;
      } else {
        categoryId = categorySlugToId[categorySlug] || null;
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
          error_message: 'Todas las transacciones ya existían'
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
    let message = `Procesadas ${stats.newTransactions} transacciones nuevas`;
    if (stats.duplicatesIgnored > 0) {
      message += `, ${stats.duplicatesIgnored} duplicados ignorados`;
    }
    if (stats.transfers > 0) {
      message += `, ${stats.transfers} transferencias`;
    }
    if (stats.categorizedByRule > 0) {
      message += `, ${stats.categorizedByRule} categorizadas por reglas`;
    }

    console.log(`[process-import] Success: ${message}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message,
        importId,
        stats,
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
