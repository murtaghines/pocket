import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { calculateInvestmentFingerprint, sha256 } from "../_shared/fingerprint.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Keywords that indicate investment/savings platforms
const INVESTMENT_KEYWORDS = [
  'savings', 'instant access savings', 'flexible savings',
  'cocos', 'cocos capital',
  'myinvestor', 'my investor',
  'trade republic', 'traderepublic',
  'degiro', 'interactive brokers', 'ibkr',
  'etoro', 'plus500', 'xtb',
  'indexa', 'indexa capital',
  'finizens', 'inbestme',
  'renta 4', 'renta4',
  'selfbank', 'self bank',
  'openbank invest',
  'fondo', 'fondos de inversión',
  'etf', 'acciones', 'bonos', 'commodities', 'stock',
  'crypto', 'bitcoin', 'btc', 'eth', 'binance', 'coinbase', 'kraken',
  'crowdlending', 'mintos', 'bondora',
];

const INVESTMENT_ANALYSIS_PROMPT = `You are a financial data extraction expert specialized in detecting investment and savings movements from bank statements. Your task is to extract ONLY transactions that represent money going INTO or OUT of investment/savings accounts.

CRITICAL: Respond ONLY with a valid JSON array. No markdown, no explanation, just the JSON.

INVESTMENT PLATFORMS TO DETECT (by keywords in description):
- Savings accounts: "Savings", "Instant Access Savings", "Flexible Savings", "Ahorro"
- Investment platforms: "Cocos", "MyInvestor", "Trade Republic", "Degiro", "Interactive Brokers", "eToro", "Indexa", "Finizens", "Renta 4", "Selfbank"
- Crypto: "Binance", "Coinbase", "Kraken", "Bitcoin", "Crypto"
- Other: "ETF", "Fondo", "Acciones", "Inversión"

For each INVESTMENT transaction, extract:
- date: ISO format (YYYY-MM-DD)
- description: Clean, readable description
- amount: Absolute numeric value (always positive)
- type: "deposit" (money going to investment) or "withdrawal" (money coming back from investment)
- platform: The investment platform name (e.g., "Revolut Savings", "Cocos", "MyInvestor", "Trade Republic")
- asset_type: Type of asset if identifiable (e.g., "Savings", "ETF", "Stocks", "Bonds", "Crypto", "Mixed", null if unknown)

TYPE DETECTION RULES:
- DEPOSIT: Money leaving bank account TO investment platform (negative in bank statement)
  - Keywords: "a Savings", "to MyInvestor", "Transferencia a Cocos", "Aportación"
- WITHDRAWAL: Money coming back FROM investment platform (positive in bank statement)
  - Keywords: "from Savings", "Rescate", "Reembolso", "from Cocos"

IMPORTANT:
- Only extract transactions that involve investment/savings platforms
- Ignore regular expenses, income, or transfers between bank accounts
- The amount should always be positive (use type to indicate direction)
- Normalize platform names (e.g., "instant access savings" → "Revolut Savings")

Example output:
[
  {"date":"2024-12-15","description":"Transferencia a Cocos Capital","amount":500.00,"type":"deposit","platform":"Cocos","asset_type":"Mixed"},
  {"date":"2024-12-10","description":"To Instant Access Savings","amount":200.00,"type":"deposit","platform":"Revolut Savings","asset_type":"Savings"},
  {"date":"2024-12-05","description":"Aportación MyInvestor ETF","amount":300.00,"type":"deposit","platform":"MyInvestor","asset_type":"ETF"},
  {"date":"2024-12-01","description":"Rescate parcial Indexa","amount":1000.00,"type":"withdrawal","platform":"Indexa","asset_type":"Mixed"}
]

If no investment transactions are found, return: []`;

// Normalize platform names
function normalizePlatform(platform: string): string {
  const lower = platform.toLowerCase();
  
  if (lower.includes('savings') || lower.includes('ahorro')) {
    if (lower.includes('revolut')) return 'Revolut Savings';
    if (lower.includes('n26')) return 'N26 Savings';
    return 'Savings Account';
  }
  if (lower.includes('cocos')) return 'Cocos Capital';
  if (lower.includes('myinvestor') || lower.includes('my investor')) return 'MyInvestor';
  if (lower.includes('trade republic') || lower.includes('traderepublic')) return 'Trade Republic';
  if (lower.includes('degiro')) return 'Degiro';
  if (lower.includes('interactive') || lower.includes('ibkr')) return 'Interactive Brokers';
  if (lower.includes('etoro')) return 'eToro';
  if (lower.includes('indexa')) return 'Indexa Capital';
  if (lower.includes('finizens')) return 'Finizens';
  if (lower.includes('renta 4') || lower.includes('renta4')) return 'Renta 4';
  if (lower.includes('binance')) return 'Binance';
  if (lower.includes('coinbase')) return 'Coinbase';
  if (lower.includes('kraken')) return 'Kraken';
  
  return platform;
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
    const { fileContent, importId, uploadId, previewOnly, investments: reviewedInvestments } = await req.json();
    const userId = authData.user.id;

    // Support both importId (new) and uploadId (legacy) for backwards compatibility
    const recordId = importId || uploadId;

    // Two ways to reach this function: (1) a first pass with `fileContent` — parses via AI,
    // used for both the preview call and one-shot processing; or (2) a confirm pass with
    // `investments` — the exact array the client already previewed (returned by pass 1),
    // sent back as-is. This skips a second AI call entirely and guarantees what gets saved
    // is exactly what the user reviewed. See docs/epics/uploads.md investments section.
    if (!recordId || !userId || (!fileContent && !reviewedInvestments)) {
      console.error('Missing required fields:', { hasContent: !!fileContent, hasReviewed: !!reviewedInvestments, recordId, userId });
      return new Response(
        JSON.stringify({ error: 'Missing required fields: fileContent or investments, plus importId/uploadId, userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let investments: any[];

    if (reviewedInvestments) {
      // Confirm pass — reuse the previewed set, no AI call.
      if (!Array.isArray(reviewedInvestments)) {
        throw new Error('investments must be an array');
      }
      investments = reviewedInvestments;
      console.log(`Confirm pass for import ${recordId}: reusing ${investments.length} previewed investments`);
    } else {
      console.log(`Processing investment file for import ${recordId}, content length: ${fileContent.length}`);

      // Update import status to PARSED
      await supabase
        .from('imports')
        .update({ status: 'PARSED' })
        .eq('id', recordId);

      // Call the Anthropic Messages API to analyze the investment data (migrated off Lovable).
      const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': ANTHROPIC_API_KEY ?? '',
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Canonical API id — the bare `claude-haiku-4-5` alias 400s as model_not_found.
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 16000,
          thinking: { type: 'disabled' },
          system: INVESTMENT_ANALYSIS_PROMPT,
          messages: [
            { role: 'user', content: `Analyze this financial data and extract ONLY investment/savings related transactions. Look for keywords like: ${INVESTMENT_KEYWORDS.slice(0, 15).join(', ')}.\n\nData:\n${fileContent}` }
          ],
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error('AI API error:', aiResponse.status, errorText);

        if (aiResponse.status === 429) {
          await supabase
            .from('imports')
            .update({ status: 'FAILED', error_message: 'Rate limit exceeded. Please try again later.' })
            .eq('id', recordId);
          return new Response(
            JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Persist the real error so the import doesn't sit at PARSED silently.
        await supabase
          .from('imports')
          .update({ status: 'FAILED', error_message: `AI API error: ${aiResponse.status} ${errorText.slice(0, 300)}` })
          .eq('id', recordId);
        throw new Error(`AI API error: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();

      if (aiData.stop_reason === 'refusal') {
        await supabase
          .from('imports')
          .update({ status: 'FAILED', error_message: 'AI declined to process the file.' })
          .eq('id', recordId);
        return new Response(
          JSON.stringify({ error: 'AI declined to process the file.' }),
          { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const rawContent = Array.isArray(aiData.content)
        ? aiData.content.find((b: any) => b.type === 'text')?.text
        : undefined;

      console.log('AI response received, length:', rawContent?.length);

      if (!rawContent) {
        throw new Error('No content in AI response');
      }

      // Parse the AI response - handle markdown code blocks
      try {
        let jsonString = rawContent.trim();
        if (jsonString.startsWith('```')) {
          jsonString = jsonString.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
        }
        investments = JSON.parse(jsonString);
      } catch (parseError) {
        console.error('Failed to parse AI response:', rawContent.substring(0, 500));
        throw new Error('Failed to parse AI response as JSON');
      }

      if (!Array.isArray(investments)) {
        throw new Error('AI response is not an array');
      }

      console.log(`Parsed ${investments.length} investment transactions from AI`);

      // Durable raw staging (audit/reprocessing trail), mirroring process-import's
      // import_rows. Only written on the AI-parse pass — that's the only place we have the
      // model's true raw per-row output. Batch-upserted; ignoreDuplicates since a retried
      // preview call for the same import would otherwise collide on (import_id, row_hash).
      if (investments.length > 0) {
        const importRowRecords = await Promise.all(investments.map(async (inv: any, idx: number) => ({
          import_id: recordId,
          row_index: idx,
          raw_json: inv,
          row_hash_sha256: await sha256(JSON.stringify(inv)),
          parsed_date: inv.date || null,
          parsed_amount: typeof inv.amount === 'number' ? inv.amount : null,
          parsed_currency: 'EUR',
          parsed_description: inv.description || null,
        })));
        const { error: rowsError } = await supabase.from('import_rows').upsert(importRowRecords, {
          onConflict: 'import_id,row_hash_sha256',
          ignoreDuplicates: true,
        });
        if (rowsError) console.log(`[process-investment-file] import_rows upsert error: ${rowsError.message}`);
      }
    }

    // Get existing investment hashes for this user to detect duplicates
    const { data: existingInvestments } = await supabase
      .from('investments')
      .select('transaction_hash')
      .eq('user_id', userId)
      .not('transaction_hash', 'is', null);

    const existingHashes = new Set(
      existingInvestments?.map(t => t.transaction_hash) || []
    );

    console.log(`Found ${existingHashes.size} existing investment hashes`);

    // Process investments and detect duplicates
    const newInvestments: any[] = [];
    const duplicateCount = { count: 0 };
    const depositCount = { count: 0 };
    const withdrawalCount = { count: 0 };
    const seenHashesInBatch = new Set<string>();

    for (const inv of investments) {
      // Dedup key computed entirely server-side from validated fields \u2014 never trust the
      // AI's own text for hashing (it isn't guaranteed byte-identical across two runs on
      // the same statement, which would silently break dedup on reimport). Hash the
      // ALREADY-normalized platform so AI wording variance ("Savings" vs "Revolut Savings")
      // doesn't fragment the same real platform into different dedup buckets.
      const platform = normalizePlatform(inv.platform || 'Unknown');
      const hash = await calculateInvestmentFingerprint(
        platform,
        inv.date,
        inv.amount,
        inv.description || '',
      );

      // Check for duplicates
      if (existingHashes.has(hash) || seenHashesInBatch.has(hash)) {
        duplicateCount.count++;
        console.log(`Duplicate investment detected: ${inv.description} - ${inv.date}`);
        continue;
      }

      seenHashesInBatch.add(hash);

      // Normalize type
      const type = inv.type === 'withdrawal' ? 'withdrawal' : 'deposit';
      if (type === 'deposit') depositCount.count++;
      else withdrawalCount.count++;

      newInvestments.push({
        user_id: userId,
        upload_id: recordId, // Keep upload_id for investments table (legacy field name)
        date: inv.date,
        description: inv.description || 'No description',
        amount: Math.abs(inv.amount),
        type,
        platform,
        asset_type: inv.asset_type || null,
        original_text: null,
        transaction_hash: hash,
      });
    }

    console.log(`New investments to insert: ${newInvestments.length}, Duplicates: ${duplicateCount.count}`);

    // If previewOnly, skip persistence and return preview data
    if (!previewOnly) {
      // Insert only new investments. Upsert with ignoreDuplicates (=> ON CONFLICT DO
      // NOTHING) instead of a plain insert: the app-level pre-check above already filters
      // out known duplicates, but this is the DB-level backstop — if it's ever raced (e.g.
      // two concurrent uploads) a hash collision is silently skipped instead of throwing a
      // raw unique-violation that fails the entire batch. Mirrors process-import's transactions upsert.
      if (newInvestments.length > 0) {
        const { error: insertError } = await supabase
          .from('investments')
          .upsert(newInvestments, { onConflict: 'user_id,transaction_hash', ignoreDuplicates: true });

        if (insertError) {
          console.error('Error inserting investments:', insertError);
          throw new Error(`Failed to insert investments: ${insertError.message}`);
        }
      }

      // Update import status to NORMALIZED
      await supabase
        .from('imports')
        .update({
          status: 'NORMALIZED',
          transactions_count: newInvestments.length,
        })
        .eq('id', recordId);
    }

    const message = `Processed ${newInvestments.length} investments` +
      (depositCount.count > 0 ? ` (${depositCount.count} deposits` : '') +
      (withdrawalCount.count > 0 ? `, ${withdrawalCount.count} withdrawals)` : depositCount.count > 0 ? ')' : '') +
      (duplicateCount.count > 0 ? `, ${duplicateCount.count} duplicates ignored` : '');

    console.log(`Successfully processed investment import ${recordId}: ${message}`);

    return new Response(
      JSON.stringify({
        success: true,
        message,
        previewMode: previewOnly,
        data: previewOnly ? newInvestments : undefined,
        stats: {
          newInvestments: newInvestments.length,
          deposits: depositCount.count,
          withdrawals: withdrawalCount.count,
          duplicatesIgnored: duplicateCount.count,
          totalParsed: investments.length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error processing investment file:', errorMessage);

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
