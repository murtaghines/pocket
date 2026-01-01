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

// ========== PROMPTS ==========
const CASHFLOW_ANALYSIS_PROMPT = `You are a financial data extraction expert specialized in Spanish and European bank statements. Your task is to analyze messy, unstructured financial data and extract clean transaction data.

CRITICAL: Respond ONLY with a valid JSON array. No markdown, no explanation, just the JSON.

For each transaction, extract:
- date: ISO format (YYYY-MM-DD). If day missing, use 01. If month missing, infer from context.
- description: Clean, readable description
- amount: Numeric value (positive for income, negative for expenses/transfers out)
- type: One of: INCOME, EXPENSE, TRANSFER_INTERNAL, TRANSFER_TO_INVEST, REFUND
- category: See rules below
- bank: Bank name if identifiable
- currency: Currency code (EUR, USD, GBP, ARS, etc.) - default EUR if not specified

TYPE DETECTION:
- INCOME: Salary (Nómina), freelance payments, dividends, interest, refunds received
- EXPENSE: All regular purchases and payments
- TRANSFER_INTERNAL: Movements between own bank accounts (Bizum to self, transfers "a cuenta propia")
- TRANSFER_TO_INVEST: Money sent to investment platforms (Savings, Cocos, MyInvestor, Trade Republic, DEGIRO, Revolut Savings, crypto exchanges, etc.)
- REFUND: Money returned from previous purchases

INVESTMENT PLATFORM KEYWORDS (mark as TRANSFER_TO_INVEST):
- Platforms: Savings, Cocos, MyInvestor, Trade Republic, DEGIRO, eToro, Interactive Brokers
- Revolut: "To Instant Access", "To Savings", "Flexible Account"
- Crypto: Binance, Coinbase, Kraken, Crypto.com
- Crowdfunding: Crowdcube, Urbanitae, Housers, Mintos, Bondora
- Robo-advisors: Indexa Capital, Finizens, InbestMe

CATEGORY RULES:
- food, transport, housing, subscriptions, leisure, health, education, travel, income, other

HANDLE MESSY DATA:
- Dates: DD/MM/YYYY, DD-MM-YY, "15 Dic", "Diciembre 2024", any format
- Amounts: €50, 50.00€, -50, (50), 50-, 50,00, 1.234,56
- Multiple currencies: Detect from symbols (€, $, £, AR$) or codes

Example output:
[
  {"date":"2024-12-15","description":"Supermercado Mercadona","amount":-87.43,"type":"EXPENSE","category":"food","bank":"Santander","currency":"EUR"},
  {"date":"2024-12-14","description":"Nómina Diciembre","amount":2850.00,"type":"INCOME","category":"income","bank":"Santander","currency":"EUR"},
  {"date":"2024-12-13","description":"To Revolut Savings","amount":-500.00,"type":"TRANSFER_TO_INVEST","category":"investment","bank":"Revolut","currency":"EUR"}
]`;

const INVESTING_ANALYSIS_PROMPT = `You are an investment data extraction expert. Analyze investment platform statements and extract transaction data.

CRITICAL: Respond ONLY with a valid JSON array. No markdown, no explanation, just the JSON.

For each transaction, extract:
- date: ISO format (YYYY-MM-DD)
- description: Clean description of the investment activity
- amount: Numeric value (positive for contributions/dividends, negative for withdrawals/fees)
- type: One of: CONTRIBUTION, WITHDRAWAL, DIVIDEND, INTEREST, FEE, TAX, TRADE_BUY, TRADE_SELL, OTHER
- platform: Platform name (Cocos, Trade Republic, DEGIRO, Revolut, etc.)
- asset_type: Type of asset (stocks, etf, bonds, crypto, fund, savings, other)
- currency: Currency code (EUR, USD, etc.)

TYPE RULES:
- CONTRIBUTION: Money added to investment account
- WITHDRAWAL: Money removed from investment account
- DIVIDEND: Dividend payments received
- INTEREST: Interest earned on savings/bonds
- FEE: Management fees, transaction fees, custody fees
- TAX: Tax withholdings on dividends or gains
- TRADE_BUY: Purchase of assets (stocks, ETFs, crypto)
- TRADE_SELL: Sale of assets
- OTHER: Anything else

Example output:
[
  {"date":"2024-12-15","description":"Aporte mensual","amount":500.00,"type":"CONTRIBUTION","platform":"Cocos","asset_type":"fund","currency":"EUR"},
  {"date":"2024-12-10","description":"Dividendo Apple Inc","amount":12.50,"type":"DIVIDEND","platform":"DEGIRO","asset_type":"stocks","currency":"USD"},
  {"date":"2024-12-05","description":"Compra ETF MSCI World","amount":-200.00,"type":"TRADE_BUY","platform":"Trade Republic","asset_type":"etf","currency":"EUR"}
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
    .trim()
    .substring(0, 100);
}

async function calculateFingerprint(
  userId: string,
  domain: string,
  date: string,
  amount: number,
  description: string
): Promise<string> {
  const normalizedDesc = normalizeDescription(description);
  const input = `${userId}|${domain}|${date}|${amount.toFixed(2)}|${normalizedDesc}`;
  return await sha256(input);
}

function extractMonthKey(dateStr: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
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
      domain, // 'CASHFLOW' or 'INVESTING'
      targetMonth, // 'YYYY-MM'
      sourceType = 'OTHER',
      confirmOutOfMonth = false // If true, process even with date mismatches
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
      // Create new period
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

    // 4. Create import record
    const { data: importRecord, error: importError } = await supabase
      .from('imports')
      .insert({
        user_id: userId,
        period_id: periodId,
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

    // 5. Update status to PARSED
    await supabase.from('imports').update({ status: 'PARSED' }).eq('id', importId);

    // 6. Call AI to analyze the file
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

    // 7. Parse AI response
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

    // 8. Check for date mismatches (validation)
    const dateWarnings: Array<{ date: string; description: string; expected: string; found: string }> = [];
    
    for (const t of transactions) {
      if (t.date) {
        const txMonthKey = extractMonthKey(t.date);
        if (txMonthKey !== targetMonth) {
          dateWarnings.push({
            date: t.date,
            description: t.description || '',
            expected: targetMonth,
            found: txMonthKey
          });
        }
      }
    }

    // If there are date mismatches and user hasn't confirmed, return warning
    if (dateWarnings.length > 0 && !confirmOutOfMonth) {
      console.log(`[process-import] Date mismatch warning: ${dateWarnings.length} transactions`);
      
      // Don't fail the import, just warn
      // We'll still process but return the warning
    }

    // 9. Get existing fingerprints to detect duplicates
    const { data: existingTxs } = await supabase
      .from('transactions')
      .select('fingerprint')
      .eq('user_id', userId)
      .eq('domain', domain)
      .not('fingerprint', 'is', null);

    const existingFingerprints = new Set(existingTxs?.map(t => t.fingerprint) || []);

    // 10. Save to import_rows and create transactions
    const stats = {
      totalParsed: transactions.length,
      newTransactions: 0,
      duplicatesIgnored: 0,
      dateWarnings: dateWarnings.length
    };

    const newTransactions: any[] = [];
    const seenFingerprints = new Set<string>();

    for (let i = 0; i < transactions.length; i++) {
      const t = transactions[i];
      
      // Calculate fingerprint
      const fingerprint = await calculateFingerprint(
        userId,
        domain,
        t.date,
        t.amount,
        t.description
      );

      // Calculate row hash for import_rows
      const rowHash = await sha256(JSON.stringify(t));

      // Save to import_rows (staging)
      await supabase.from('import_rows').upsert({
        import_id: importId,
        row_index: i,
        raw_json: t,
        row_hash_sha256: rowHash,
        parsed_date: t.date,
        parsed_amount: t.amount,
        parsed_currency: t.currency || 'EUR',
        parsed_description: t.description
      }, { onConflict: 'import_id,row_hash_sha256' });

      // Check for duplicates
      if (existingFingerprints.has(fingerprint) || seenFingerprints.has(fingerprint)) {
        stats.duplicatesIgnored++;
        console.log(`[process-import] Duplicate: ${t.description}`);
        continue;
      }

      seenFingerprints.add(fingerprint);

      // Prepare transaction for canonical table
      const txRecord: any = {
        user_id: userId,
        domain: domain,
        period_id: periodId,
        import_id: importId,
        date: t.date,
        posted_date: t.date,
        amount: t.amount,
        currency: t.currency || 'EUR',
        description: t.description || 'Sin descripción',
        description_raw: t.description,
        description_norm: normalizeDescription(t.description),
        tx_type: t.type || (domain === 'INVESTING' ? 'OTHER' : 'EXPENSE'),
        fingerprint: fingerprint,
        source_row_hash: rowHash,
        // Legacy fields for compatibility
        type: t.type === 'INCOME' ? 'income' : (t.type === 'TRANSFER_INTERNAL' || t.type === 'TRANSFER_TO_INVEST' ? 'transfer' : 'expense'),
        category: t.category || 'other',
        bank: domain === 'INVESTING' ? t.platform : t.bank
      };

      newTransactions.push(txRecord);
    }

    // 11. Batch insert transactions
    if (newTransactions.length > 0) {
      const { error: insertError } = await supabase
        .from('transactions')
        .insert(newTransactions);

      if (insertError) {
        console.error('[process-import] Error inserting transactions:', insertError);
        await supabase.from('imports').update({ 
          status: 'FAILED', 
          error_message: insertError.message 
        }).eq('id', importId);
        throw new Error(`Failed to insert transactions: ${insertError.message}`);
      }

      stats.newTransactions = newTransactions.length;
    }

    // 12. Update import status to NORMALIZED
    await supabase.from('imports').update({ 
      status: 'NORMALIZED',
      transactions_count: stats.newTransactions
    }).eq('id', importId);

    // 13. Log to audit
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

    // 14. Build response message
    let message = `Procesadas ${stats.newTransactions} transacciones nuevas`;
    if (stats.duplicatesIgnored > 0) {
      message += `, ${stats.duplicatesIgnored} duplicados ignorados`;
    }

    console.log(`[process-import] Success: ${message}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message,
        importId,
        stats,
        dateWarnings: dateWarnings.length > 0 ? dateWarnings.slice(0, 10) : undefined // Limit warnings shown
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[process-import] Error:', errorMessage);

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
