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

// ========== TX_TYPE ENUM ==========
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
- tx_type: One of: INCOME, EXPENSE, TRANSFER_INTERNAL, SAVINGS_MOVE, INTEREST, FEE, REFUND, OTHER
- category: See rules below
- bank: Bank name if identifiable
- currency: Currency code (EUR, USD, GBP, ARS, MXN, etc.) - detect from symbols or context

TX_TYPE DETECTION:
- INCOME: Salary (Nómina, Sueldo), freelance payments, dividends, interest received, refunds received
- EXPENSE: Regular purchases, payments to external parties
- TRANSFER_INTERNAL: Movements between OWN bank accounts. Keywords:
  * "Transferencia a mi cuenta", "A cuenta propia", "Traspaso", "Between accounts"
  * Same person as account holder sending to/from their own accounts
  * Bizum to self, transfers where sender = receiver name
  * Movement from checking to savings in same bank
- SAVINGS_MOVE: Transfers to/from savings accounts, investment platforms (Cocos, Trade Republic, etc.)
- INTEREST: Interest earned on accounts
- FEE: Bank fees, commissions, charges
- REFUND: Money returned from previous purchases
- OTHER: When uncertain

PAYMENT CHANNEL DETECTION:
- CARD: "Compra en", "POS", "Tarjeta", card numbers (****1234)
- TRANSFER: "Transferencia", "Wire", "TRF"
- BIZUM: "Bizum"
- QR: "QR", "Pago QR"
- DIRECT_DEBIT: "Domiciliación", "Recibo", "Direct Debit"
- CASH: "Cajero", "ATM", "Efectivo"

TRANSFER_INTERNAL DETECTION (CRITICAL):
Look for these patterns to mark as TRANSFER_INTERNAL:
- "Traspaso entre cuentas"
- "Transferencia a cuenta propia"
- "A favor de [same holder name]"
- "De [same holder name]"
- References to same-named accounts
- Revolut: transfers to pockets or between currencies that are internal
- MercadoPago: "Enviaste dinero" / "Recibiste dinero" to/from own accounts

CATEGORY RULES:
- food, transport, housing, subscriptions, entertainment, health, education, travel, income, savings, fees, other
- For TRANSFER_INTERNAL and SAVINGS_MOVE: use "transfers" category

HANDLE MESSY DATA:
- Dates: DD/MM/YYYY, DD-MM-YY, "15 Dic", "Diciembre 2024", any format
- Amounts: €50, 50.00€, -50, (50), 50-, 50,00, 1.234,56, $1,234.56
- Multiple currencies: Detect from symbols (€, $, £, AR$, MX$) or codes

Example output:
[
  {"posted_date":"2024-12-15","value_date":null,"description_raw":"COMPRA TARJETA *1234 MERCADONA","description_clean":"Supermercado Mercadona","amount_signed":-87.43,"running_balance":1234.56,"source_transaction_id":null,"payment_channel":"CARD","counterparty_raw":"MERCADONA","tx_type":"EXPENSE","category":"food","bank":"Santander","currency":"EUR"},
  {"posted_date":"2024-12-14","value_date":"2024-12-14","description_raw":"NOMINA DICIEMBRE EMPRESA SA","description_clean":"Nómina Diciembre","amount_signed":2850.00,"running_balance":3084.56,"source_transaction_id":null,"payment_channel":"TRANSFER","counterparty_raw":"EMPRESA SA","tx_type":"INCOME","category":"income","bank":"Santander","currency":"EUR"},
  {"posted_date":"2024-12-13","value_date":null,"description_raw":"TRF A CTA PROPIA REVOLUT","description_clean":"Traspaso a Revolut","amount_signed":-500.00,"running_balance":2584.56,"source_transaction_id":null,"payment_channel":"TRANSFER","counterparty_raw":null,"tx_type":"TRANSFER_INTERNAL","category":"transfers","bank":"Santander","currency":"EUR"}
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
- tx_type: One of: INCOME, EXPENSE, TRANSFER_INTERNAL, SAVINGS_MOVE, INTEREST, FEE, REFUND, OTHER
- platform: Platform name (Cocos, Trade Republic, DEGIRO, Revolut, etc.)
- asset_type: Type of asset (stocks, etf, bonds, crypto, fund, savings, other)
- currency: Currency code (EUR, USD, etc.)

TX_TYPE MAPPING for investments:
- Contributions/deposits: SAVINGS_MOVE
- Withdrawals: SAVINGS_MOVE  
- Dividends: INCOME
- Interest: INTEREST
- Management/transaction fees: FEE
- Buy/Sell trades: OTHER (trading activity)

Example output:
[
  {"posted_date":"2024-12-15","value_date":null,"description_raw":"Aporte mensual","description_clean":"Aporte mensual","amount_signed":500.00,"source_transaction_id":"TX123456","tx_type":"SAVINGS_MOVE","platform":"Cocos","asset_type":"fund","currency":"EUR"},
  {"posted_date":"2024-12-10","value_date":"2024-12-11","description_raw":"Dividendo Apple Inc AAPL","description_clean":"Dividendo Apple Inc","amount_signed":12.50,"source_transaction_id":null,"tx_type":"INCOME","platform":"DEGIRO","asset_type":"stocks","currency":"USD"},
  {"posted_date":"2024-12-05","value_date":null,"description_raw":"Comisión custodia","description_clean":"Comisión custodia mensual","amount_signed":-1.50,"source_transaction_id":null,"tx_type":"FEE","platform":"Trade Republic","asset_type":"other","currency":"EUR"}
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

function validateTxType(txType: string | null): string {
  if (!txType) return 'OTHER';
  const upper = txType.toUpperCase();
  return VALID_TX_TYPES.includes(upper) ? upper : 'OTHER';
}

function validatePaymentChannel(channel: string | null): string | null {
  if (!channel) return null;
  const upper = channel.toUpperCase();
  return VALID_PAYMENT_CHANNELS.includes(upper) ? upper : 'OTHER';
}

// Detect if transaction is internal transfer based on patterns
function detectInternalTransfer(
  txType: string,
  descriptionRaw: string,
  descriptionClean: string,
  counterpartyRaw: string | null,
  userAccounts: Array<{ name: string; institution: string | null }>
): boolean {
  // Already marked as internal
  if (txType === 'TRANSFER_INTERNAL' || txType === 'SAVINGS_MOVE') {
    return true;
  }
  
  const textToCheck = `${descriptionRaw} ${descriptionClean} ${counterpartyRaw || ''}`.toLowerCase();
  
  // Spanish patterns for internal transfers
  const internalPatterns = [
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
  
  for (const pattern of internalPatterns) {
    if (pattern.test(textToCheck)) {
      return true;
    }
  }
  
  // Check if counterparty matches user's own accounts
  if (counterpartyRaw) {
    const normalizedCounterparty = counterpartyRaw.toLowerCase();
    for (const account of userAccounts) {
      if (account.name && normalizedCounterparty.includes(account.name.toLowerCase())) {
        return true;
      }
      if (account.institution && normalizedCounterparty.includes(account.institution.toLowerCase())) {
        // Could be transfer to own account at same institution
        // This is a heuristic - may need refinement
      }
    }
  }
  
  return false;
}

// Apply categorization rules
async function applyCategoryRules(
  supabase: any,
  userId: string,
  domain: string,
  descriptionClean: string,
  counterpartyRaw: string | null
): Promise<{ categoryId: string | null; ruleId: string | null } | null> {
  
  const { data: rules, error } = await supabase
    .from('categorization_rules')
    .select('id, category_id, pattern, match_field, match_type')
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
      return { categoryId: rule.category_id, ruleId: rule.id };
    }
  }
  
  return null;
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
      accountId = null, // Optional: specific account for this import
      domain, // 'CASHFLOW' or 'INVESTING'
      targetMonth, // 'YYYY-MM'
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
    
    // 2. Check if file already imported (using unique constraint)
    const { data: existingImport } = await supabase
      .from('imports')
      .select('id, file_name, uploaded_at')
      .eq('user_id', userId)
      .eq('file_hash_sha256', calculatedFileHash)
      .maybeSingle();

    if (existingImport) {
      console.log(`[process-import] Duplicate file detected: ${existingImport.file_name}`);
      return new Response(
        JSON.stringify({ 
          error: 'duplicate_file',
          message: `Este archivo ya fue importado el ${new Date(existingImport.uploaded_at).toLocaleDateString()}`,
          existingImportId: existingImport.id
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
      .select('id, name, institution')
      .eq('user_id', userId);
    
    const accountsForDetection = userAccounts || [];

    // 5. Create import record
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
      // Check if it's a duplicate constraint violation
      if (importError.code === '23505') {
        return new Response(
          JSON.stringify({ 
            error: 'duplicate_file',
            message: 'Este archivo ya fue procesado anteriormente'
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.error('[process-import] Error creating import:', importError);
      throw new Error(`Failed to create import: ${importError.message}`);
    }

    const importId = importRecord.id;
    console.log(`[process-import] Created import record: ${importId}`);

    // 6. Update status to PARSED
    await supabase.from('imports').update({ status: 'PARSED' }).eq('id', importId);

    // 7. Call AI to analyze the file
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

    // 8. Parse AI response
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

    // 9. Check for date mismatches
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

    // 10. Get existing fingerprints to detect duplicates
    const { data: existingTxs } = await supabase
      .from('transactions')
      .select('fingerprint')
      .eq('user_id', userId)
      .eq('domain', domain)
      .not('fingerprint', 'is', null);

    const existingFingerprints = new Set(existingTxs?.map(t => t.fingerprint) || []);

    // 11. Process and create transactions
    const stats = {
      totalParsed: transactions.length,
      newTransactions: 0,
      duplicatesIgnored: 0,
      internalTransfers: 0,
      categorizedByRule: 0,
      dateWarnings: dateWarnings.length
    };

    const newTransactions: any[] = [];
    const seenFingerprints = new Set<string>();

    for (let i = 0; i < transactions.length; i++) {
      const t = transactions[i];
      
      // Normalize field names (support both old and new format from AI)
      const postedDate = t.posted_date || t.date;
      const valueDate = t.value_date || null;
      const descriptionRaw = t.description_raw || t.description || '';
      const descriptionClean = t.description_clean || normalizeDescription(descriptionRaw);
      const amountSigned = t.amount_signed ?? t.amount;
      const runningBalance = t.running_balance ?? null;
      const sourceTransactionId = t.source_transaction_id || null;
      const paymentChannel = t.payment_channel || null;
      const counterpartyRaw = t.counterparty_raw || null;
      let txType = t.tx_type || t.type || 'OTHER';
      const currency = t.currency || 'EUR';
      
      if (!postedDate || amountSigned === undefined) {
        console.log(`[process-import] Skipping invalid transaction at index ${i}`);
        continue;
      }

      // Calculate fingerprint with new priority logic
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

      // Save to import_rows (staging) - use upsert to handle duplicates
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
        // Ignore duplicate row errors
        console.log(`[process-import] Row already exists, skipping: ${rowHash.substring(0, 8)}`);
      }

      // Check for duplicates via fingerprint
      if (existingFingerprints.has(fingerprint) || seenFingerprints.has(fingerprint)) {
        stats.duplicatesIgnored++;
        console.log(`[process-import] Duplicate transaction: ${descriptionClean.substring(0, 50)}`);
        continue;
      }

      seenFingerprints.add(fingerprint);

      // Detect internal transfers
      const isInternalTransfer = detectInternalTransfer(
        txType,
        descriptionRaw,
        descriptionClean,
        counterpartyRaw,
        accountsForDetection
      );
      
      if (isInternalTransfer && txType !== 'TRANSFER_INTERNAL' && txType !== 'SAVINGS_MOVE') {
        txType = 'TRANSFER_INTERNAL';
        stats.internalTransfers++;
      }

      // Validate tx_type
      txType = validateTxType(txType);

      // Apply categorization rules
      let categoryId: string | null = null;
      let categorizationRuleId: string | null = null;
      let categorySource = 'AI'; // Default: AI categorized it
      
      const ruleMatch = await applyCategoryRules(
        supabase,
        userId,
        domain,
        descriptionClean,
        counterpartyRaw
      );
      
      if (ruleMatch) {
        categoryId = ruleMatch.categoryId;
        categorizationRuleId = ruleMatch.ruleId;
        categorySource = 'RULE';
        stats.categorizedByRule++;
      }

      // Determine legacy type/category for backward compatibility
      let legacyType = 'expense';
      let legacyCategory = t.category || 'other';
      
      if (txType === 'INCOME' || txType === 'INTEREST') {
        legacyType = 'income';
        legacyCategory = legacyCategory === 'other' ? 'income' : legacyCategory;
      } else if (txType === 'TRANSFER_INTERNAL' || txType === 'SAVINGS_MOVE') {
        legacyType = 'transfer';
        legacyCategory = 'transfers';
      } else if (txType === 'REFUND') {
        legacyType = 'income';
      } else if (txType === 'FEE') {
        legacyCategory = 'fees';
      }

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
        // Transaction details
        tx_type: txType,
        payment_channel: validatePaymentChannel(paymentChannel),
        source_transaction_id: sourceTransactionId,
        counterparty_raw: counterpartyRaw,
        // Categorization
        category: legacyCategory,
        category_id: categoryId,
        categorization_rule_id: categorizationRuleId,
        category_source: categorySource,
        // Deduplication
        fingerprint: fingerprint,
        source_row_hash: rowHash,
        // Legacy fields for backward compatibility
        type: legacyType,
        bank: domain === 'INVESTING' ? t.platform : t.bank
      };

      newTransactions.push(txRecord);
    }

    // 12. Batch insert transactions with duplicate handling
    if (newTransactions.length > 0) {
      const { error: insertError, data: insertedData } = await supabase
        .from('transactions')
        .upsert(newTransactions, {
          onConflict: 'user_id,domain,fingerprint',
          ignoreDuplicates: true
        })
        .select('id');

      if (insertError) {
        // If it's a unique constraint violation, some transactions already exist
        if (insertError.code === '23505') {
          console.log('[process-import] Some transactions already existed, continuing...');
          // Try inserting one by one to count actual new ones
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

    // 13. Update import status to NORMALIZED
    await supabase.from('imports').update({ 
      status: 'NORMALIZED',
      transactions_count: stats.newTransactions
    }).eq('id', importId);

    // 14. Log to audit
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

    // 15. Build response message
    let message = `Procesadas ${stats.newTransactions} transacciones nuevas`;
    if (stats.duplicatesIgnored > 0) {
      message += `, ${stats.duplicatesIgnored} duplicados ignorados`;
    }
    if (stats.internalTransfers > 0) {
      message += `, ${stats.internalTransfers} transferencias internas detectadas`;
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
