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
  'OTHER': 'EXPENSE', // Default to expense for unknown
};

// ========== VALID VALUES ==========
const VALID_TX_TYPES = ['INCOME', 'EXPENSE', 'TRANSFER_INTERNAL', 'SAVINGS_MOVE', 'INTEREST', 'FEE', 'REFUND', 'OTHER'];
const VALID_PAYMENT_CHANNELS = ['CARD', 'TRANSFER', 'BIZUM', 'QR', 'CASH', 'DIRECT_DEBIT', 'OTHER'];

// ========== PROMPTS ==========
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
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/\s+/g, ' ')
    .replace(/ref\.?\s*\d+/gi, '') // Remove reference numbers
    .replace(/\*{4}\d{4}/g, '') // Remove card masks ****1234
    .replace(/\d{10,}/g, '') // Remove long numbers (transaction IDs)
    .trim()
    .substring(0, 200);
}

// Enhanced fingerprint calculation with priority
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
  // Priority 1: If source_transaction_id exists, use it (most unique)
  if (sourceTransactionId) {
    const input = `${userId}|${accountId || 'no-account'}|${sourceTransactionId}`;
    return await sha256(input);
  }
  
  // Priority 2: Composite fingerprint
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

function validatePaymentChannel(channel: string | null): string | null {
  if (!channel) return null;
  const upper = channel.toUpperCase();
  return VALID_PAYMENT_CHANNELS.includes(upper) ? upper : 'OTHER';
}

// Validate and normalize movement
function validateMovement(movement: string | null): MovementType {
  if (!movement) return 'EXPENSE';
  const upper = movement.toUpperCase();
  if (upper === 'INCOME' || upper === 'EXPENSE' || upper === 'TRANSFER') {
    return upper as MovementType;
  }
  return 'EXPENSE';
}

// Validate category slug belongs to movement type
function validateCategorySlug(slug: string | null, movement: MovementType): string {
  if (!slug) {
    // Return default for movement
    switch (movement) {
      case 'INCOME': return 'other_income';
      case 'EXPENSE': return 'other_expense';
      case 'TRANSFER': return 'own_transfer';
    }
  }
  
  const normalizedSlug = slug.toLowerCase().replace(/\s+/g, '_');
  
  // Check if slug is valid for the movement
  switch (movement) {
    case 'INCOME':
      return INCOME_SLUGS.includes(normalizedSlug) ? normalizedSlug : 'other_income';
    case 'EXPENSE':
      return EXPENSE_SLUGS.includes(normalizedSlug) ? normalizedSlug : 'other_expense';
    case 'TRANSFER':
      return TRANSFER_SLUGS.includes(normalizedSlug) ? normalizedSlug : 'own_transfer';
  }
}

// Derive legacy type from movement
function getLegacyType(movement: MovementType): string {
  switch (movement) {
    case 'INCOME': return 'income';
    case 'EXPENSE': return 'expense';
    case 'TRANSFER': return 'transfer';
  }
}

// Get legacy tx_type from movement and category
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

// Detect if transaction is internal transfer based on patterns
function detectInternalTransfer(
  movement: MovementType,
  descriptionRaw: string,
  descriptionClean: string,
  counterpartyRaw: string | null,
  userAccounts: Array<{ name: string; institution: string | null; account_role: string }>
): { isTransfer: boolean; categorySlug: string } {
  // Already marked as transfer
  if (movement === 'TRANSFER') {
    return { isTransfer: true, categorySlug: 'own_transfer' };
  }
  
  const textToCheck = `${descriptionRaw} ${descriptionClean} ${counterpartyRaw || ''}`.toLowerCase();
  
  // Patterns for internal transfers
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
  
  // Patterns for investment transfers
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
  
  // Check if counterparty matches user's own accounts
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

// Apply categorization rules
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

// Get category ID from slug
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

    // Validate required fields
    if (!fileContent || !userId || !domain || !targetMonth) {
      console.error('Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: fileContent, userId, domain, targetMonth' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[process-import] Starting: domain=${domain}, targetMonth=${targetMonth}, fileSize=${fileContent.length}`);

    // 1. Calculate file hash for deduplication
    const calculatedFileHash = fileHash || await sha256(fileContent);
    
    // 2. Check if file already imported
    // Note: We allow duplicate file uploads - deduplication happens at transaction level via fingerprint
    // Each upload creates a new import record, but duplicate transactions are skipped

    // 3. Get or create period
    const { data: period, error: periodError } = await supabase
      .from('periods')
      .select('id, status')
      .eq('user_id', userId)
      .eq('month_key', targetMonth)
      .eq('domain', domain)
      .maybeSingle();

    let periodId: string;
    
    if (period) {
      if (period.status === 'CLOSED') {
        return new Response(
          JSON.stringify({ 
            error: 'period_closed',
            message: `El período ${targetMonth} está cerrado. Debe reabrirlo para agregar datos.`
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
          month_key: targetMonth,
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

    // 4. Get user's accounts for internal transfer detection
    const { data: userAccounts } = await supabase
      .from('accounts')
      .select('id, name, institution, account_role')
      .eq('user_id', userId);
    
    const accountsForDetection = userAccounts || [];

    // 5. Pre-fetch category IDs for all slugs
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

    // 6. Create import record
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

    // 7. Update status to PARSED
    await supabase.from('imports').update({ status: 'PARSED' }).eq('id', importId);

    // 8. Call AI to analyze the file
    const prompt = domain === 'INVESTING' ? INVESTING_ANALYSIS_PROMPT : CASHFLOW_ANALYSIS_PROMPT;
    
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: `Analyze this financial data and extract ALL transactions:\n\n${fileContent}` }
        ],
        temperature: 0.1,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[process-import] AI API error:', aiResponse.status, errorText);
      
      await supabase.from('imports').update({ 
        status: 'FAILED', 
        error_message: `AI error: ${aiResponse.status}` 
      }).eq('id', importId);

      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content;
    
    if (!rawContent) {
      throw new Error('No content in AI response');
    }

    // 9. Parse AI response
    let transactions;
    try {
      let jsonString = rawContent.trim();
      if (jsonString.startsWith('```')) {
        jsonString = jsonString.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      }
      transactions = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('[process-import] Failed to parse AI response:', rawContent.substring(0, 500));
      await supabase.from('imports').update({ 
        status: 'FAILED', 
        error_message: 'Failed to parse AI response' 
      }).eq('id', importId);
      throw new Error('Failed to parse AI response as JSON');
    }

    if (!Array.isArray(transactions)) {
      throw new Error('AI response is not an array');
    }

    console.log(`[process-import] Parsed ${transactions.length} transactions from AI`);

    // 10. Check for date mismatches
    const dateWarnings: Array<{ date: string; description: string; expected: string; found: string }> = [];
    
    for (const t of transactions) {
      const txDate = t.posted_date || t.date;
      if (txDate) {
        const txMonthKey = extractMonthKey(txDate);
        if (txMonthKey !== targetMonth) {
          dateWarnings.push({
            date: txDate,
            description: t.description_clean || t.description || '',
            expected: targetMonth,
            found: txMonthKey
          });
        }
      }
    }

    // 11. Get existing fingerprints to detect duplicates
    const { data: existingTxs } = await supabase
      .from('transactions')
      .select('fingerprint')
      .eq('user_id', userId)
      .eq('domain', domain)
      .not('fingerprint', 'is', null);

    const existingFingerprints = new Set(existingTxs?.map(t => t.fingerprint) || []);

    // 12. Process and create transactions
    const stats = {
      totalParsed: transactions.length,
      newTransactions: 0,
      duplicatesIgnored: 0,
      transfers: 0,
      income: 0,
      expenses: 0,
      categorizedByRule: 0,
      dateWarnings: dateWarnings.length
    };

    const newTransactions: any[] = [];
    const seenFingerprints = new Set<string>();

    for (let i = 0; i < transactions.length; i++) {
      const t = transactions[i];
      
      // Normalize field names
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

      // Calculate fingerprint
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

      // Calculate row hash for import_rows
      const rowHash = await sha256(JSON.stringify(t));

      // Save to import_rows (staging)
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

      // Check for duplicates via fingerprint
      if (existingFingerprints.has(fingerprint) || seenFingerprints.has(fingerprint)) {
        stats.duplicatesIgnored++;
        console.log(`[process-import] Duplicate transaction: ${descriptionClean.substring(0, 50)}`);
        continue;
      }

      seenFingerprints.add(fingerprint);

      // === CATEGORIZATION LOGIC ===
      
      // 1. Get initial movement and category from AI
      let movement = validateMovement(t.movement);
      let categorySlug = validateCategorySlug(t.category_slug, movement);
      
      // 2. Detect internal transfers (may override AI classification)
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

      // 3. Apply user categorization rules (highest priority after manual)
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
          // Determine movement from the rule's category
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
        // Get category ID from slug
        categoryId = categorySlugToId[categorySlug] || null;
      }

      // 4. Get legacy type and tx_type
      const legacyType = getLegacyType(movement);
      const legacyTxType = getLegacyTxType(movement, categorySlug);

      // Update stats
      if (movement === 'INCOME') stats.income++;
      else if (movement === 'EXPENSE') stats.expenses++;
      else if (movement === 'TRANSFER') stats.transfers++;

      // Prepare transaction record
      const txRecord: any = {
        user_id: userId,
        domain: domain,
        period_id: periodId,
        import_id: importId,
        account_id: accountId,
        // Dates
        date: postedDate,
        posted_date: postedDate,
        value_date: valueDate,
        // Amounts
        amount: amountSigned,
        currency: currency,
        running_balance: runningBalance,
        // Descriptions
        description: descriptionClean || 'Sin descripción',
        description_raw: descriptionRaw,
        description_norm: normalizeDescription(descriptionRaw),
        description_clean: descriptionClean,
        // Movement and category (new system)
        movement: movement,
        category_id: categoryId,
        categorization_rule_id: categorizationRuleId,
        category_source: categorySource,
        // Transaction details
        tx_type: legacyTxType,
        payment_channel: validatePaymentChannel(paymentChannel),
        source_transaction_id: sourceTransactionId,
        counterparty_raw: counterpartyRaw,
        // Legacy fields for backward compatibility
        type: legacyType,
        category: categorySlug, // Store slug in legacy category field
        bank: domain === 'INVESTING' ? t.platform : t.bank,
        // Deduplication
        fingerprint: fingerprint,
        source_row_hash: rowHash,
      };

      newTransactions.push(txRecord);
    }

    // 13. Batch insert transactions with duplicate handling
    if (newTransactions.length > 0) {
      const { error: insertError, data: insertedData } = await supabase
        .from('transactions')
        .upsert(newTransactions, {
          onConflict: 'user_id,domain,fingerprint',
          ignoreDuplicates: true
        })
        .select('id');

      if (insertError) {
        if (insertError.code === '23505') {
          console.log('[process-import] Some transactions already existed, continuing...');
          let actualNew = 0;
          for (const tx of newTransactions) {
            const { error: singleError } = await supabase
              .from('transactions')
              .insert(tx);
            if (!singleError) {
              actualNew++;
            }
          }
          stats.newTransactions = actualNew;
          stats.duplicatesIgnored += (newTransactions.length - actualNew);
        } else {
          console.error('[process-import] Error inserting transactions:', insertError);
          await supabase.from('imports').update({ 
            status: 'FAILED', 
            error_message: insertError.message 
          }).eq('id', importId);
          throw new Error(`Failed to insert transactions: ${insertError.message}`);
        }
      } else {
        stats.newTransactions = insertedData?.length || newTransactions.length;
      }
    }

    // 14. Update import status to NORMALIZED
    await supabase.from('imports').update({ 
      status: 'NORMALIZED',
      transactions_count: stats.newTransactions
    }).eq('id', importId);

    // 15. Log to audit
    await supabase.from('audit_log').insert({
      user_id: userId,
      entity_type: 'import',
      entity_id: importId,
      action: 'create',
      diff_json: {
        file_name: fileName,
        domain,
        target_month: targetMonth,
        stats
      }
    });

    // 16. Build response message
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
