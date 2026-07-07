import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { calculateInvestmentFingerprint } from "../_shared/fingerprint.ts";

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
    const { fileContent, importId, uploadId, previewOnly } = await req.json();
    const userId = authData.user.id;

    // Support both importId (new) and uploadId (legacy) for backwards compatibility
    const recordId = importId || uploadId;

    if (!fileContent || !recordId || !userId) {
      console.error('Missing required fields:', { hasContent: !!fileContent, recordId, userId });
      return new Response(
        JSON.stringify({ error: 'Missing required fields: fileContent, importId/uploadId, userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing investment file for import ${recordId}, content length: ${fileContent.length}`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
        model: 'claude-haiku-4-5',
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
    let investments;
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
      // Insert only new investments
      if (newInvestments.length > 0) {
        const { error: insertError } = await supabase
          .from('investments')
          .insert(newInvestments);

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
