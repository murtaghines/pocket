import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const FINANCIAL_ANALYSIS_PROMPT = `You are a financial data extraction expert specialized in Spanish and European bank statements. Your task is to analyze messy, unstructured financial data and extract clean transaction data.

CRITICAL: Respond ONLY with a valid JSON array. No markdown, no explanation, just the JSON.

For each transaction, extract:
- date: ISO format (YYYY-MM-DD). If day missing, use 01. If month missing, infer from context.
- description: Clean, readable description
- amount: Numeric value (positive for income, negative for expenses/transfers out)
- type: "income", "expense", or "transfer" (for internal movements between accounts)
- category: See rules below
- bank: Bank name if identifiable (Santander, BBVA, CaixaBank, Sabadell, ING, Revolut, N26, Wise, etc.)
- hash_source: String combining date|absoluteAmount|normalizedDescription for duplicate detection

TRANSFER DETECTION - Mark as type "transfer" if:
- Description contains: "Transferencia a", "Transferencia de", "Traspaso", "Bizum enviado", "Bizum recibido"
- Between known banks/neobanks: "a Revolut", "desde Santander", "N26", "Wise"
- Self-transfers: "a cuenta propia", "entre cuentas"
- Round amounts that match incoming amounts in other accounts

INVESTMENT DETECTION - Mark as category "investment" (with type "expense" for outgoing, "income" for dividends/returns):
- Investment platforms: Savings, Cocos, MyInvestor, Trade Republic, DEGIRO, eToro, Interactive Brokers
- Revolut Savings, Instant Access Savings, Flexible Account
- Crypto: Binance, Coinbase, Kraken, Crypto.com
- Crowdfunding: Crowdcube, Urbanitae, Housers, Mintos, Bondora
- Robo-advisors: Indexa Capital, Finizens, InbestMe
- Keywords: "To Instant Access", "To Savings", "inversión", "fondos", "acciones"
- Description patterns: "To [Platform Name]", "From Savings" (returns)
CRITICAL: Investments are NOT regular expenses. They are money movements to/from investment platforms.

CATEGORY RULES:
- food: supermarkets, restaurants, delivery (Mercadona, Carrefour, Lidl, Glovo, JustEat)
- transport: gas, Uber, taxi, metro, bus, parking, Cabify
- housing: rent, utilities, electricity, water, gas, internet, Endesa, Naturgy, Vodafone
- subscriptions: Netflix, Spotify, Amazon Prime, HBO, Disney+, gym memberships
- leisure: entertainment, cinema, bars, hobbies, gaming
- health: pharmacy, doctors, medical, gym
- education: courses, books, training, Udemy, Coursera
- travel: flights, hotels, Booking, Airbnb, Renfe, vacation
- income: salary (Nómina), freelance, dividends, interest
- investment: money to/from investment platforms (see INVESTMENT DETECTION above)
- transfer: internal movements between own bank accounts (NOT investment platforms)
- other: anything else

HANDLE MESSY DATA:
- Dates: DD/MM/YYYY, DD-MM-YY, "15 Dic", "Diciembre 2024", any format
- Amounts: €50, 50.00€, -50, (50), 50-, 50,00, 1.234,56
- Headers/footers/bank logos: Ignore non-transaction text
- Multiple accounts in one file: Detect bank from context
- Partial data: Extract what's available

HASH_SOURCE FORMAT:
Create a normalized string: "YYYYMMDD|amount|NORMALIZED_DESC"
- Date in YYYYMMDD
- Amount as absolute value with 2 decimals
- Description: uppercase, no accents, only alphanumeric, first 30 chars
Example: "20241215|87.43|SUPERMERCADO MERCADONA"

Example output:
[
  {"date":"2024-12-15","description":"Supermercado Mercadona","amount":-87.43,"type":"expense","category":"food","bank":"Santander","hash_source":"20241215|87.43|SUPERMERCADO MERCADONA"},
  {"date":"2024-12-14","description":"Nómina Diciembre","amount":2850.00,"type":"income","category":"income","bank":"Santander","hash_source":"20241214|2850.00|NOMINA DICIEMBRE"},
  {"date":"2024-12-13","description":"Transferencia a Revolut","amount":-500.00,"type":"transfer","category":"transfer","bank":"Santander","hash_source":"20241213|500.00|TRANSFERENCIA A REVOLUT"}
]`;

// Simple hash function for duplicate detection
function generateHash(hashSource: string): string {
  let hash = 0;
  for (let i = 0; i < hashSource.length; i++) {
    const char = hashSource.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileContent, uploadId, userId, previewOnly, confirmTransactions, transactions } = await req.json();

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // CONFIRM MODE: Save pre-validated transactions
    if (confirmTransactions && transactions && uploadId && userId) {
      console.log(`Confirming ${transactions.length} transactions for upload ${uploadId}`);
      
      const transactionsToInsert = transactions.map((t: any) => ({
        user_id: userId,
        upload_id: uploadId,
        date: t.date,
        description: t.description || 'Sin descripción',
        amount: t.amount,
        type: t.type,
        category: t.category || 'other',
        bank: t.bank || null,
        transaction_hash: t.transaction_hash,
      }));

      const { error: insertError } = await supabase
        .from('transactions')
        .insert(transactionsToInsert);

      if (insertError) {
        console.error('Error inserting transactions:', insertError);
        throw new Error(`Failed to insert transactions: ${insertError.message}`);
      }

      // Update upload status
      await supabase
        .from('uploads')
        .update({ 
          status: 'completed', 
          transactions_count: transactions.length,
          processed_at: new Date().toISOString()
        })
        .eq('id', uploadId);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `${transactions.length} transacciones guardadas`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PROCESS MODE: Analyze file content
    if (!fileContent || !uploadId || !userId) {
      console.error('Missing required fields:', { hasContent: !!fileContent, uploadId, userId });
      return new Response(
        JSON.stringify({ error: 'Missing required fields: fileContent, uploadId, userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing file for upload ${uploadId}, content length: ${fileContent.length}, previewOnly: ${!!previewOnly}`);

    // Update upload status to processing
    await supabase
      .from('uploads')
      .update({ status: 'processing' })
      .eq('id', uploadId);

    // Call Lovable AI to analyze the financial data
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: FINANCIAL_ANALYSIS_PROMPT },
          { role: 'user', content: `Analyze this financial data and extract ALL transactions. Pay attention to internal transfers between accounts:\n\n${fileContent}` }
        ],
        temperature: 0.1,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        await supabase
          .from('uploads')
          .update({ status: 'failed', error_message: 'Rate limit exceeded. Please try again later.' })
          .eq('id', uploadId);
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (aiResponse.status === 402) {
        await supabase
          .from('uploads')
          .update({ status: 'failed', error_message: 'AI credits exhausted. Please add credits.' })
          .eq('id', uploadId);
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content;
    
    console.log('AI response received, length:', rawContent?.length);

    if (!rawContent) {
      throw new Error('No content in AI response');
    }

    // Parse the AI response - handle markdown code blocks
    let parsedTransactions;
    try {
      let jsonString = rawContent.trim();
      // Remove markdown code blocks if present
      if (jsonString.startsWith('```')) {
        jsonString = jsonString.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      }
      parsedTransactions = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Failed to parse AI response:', rawContent.substring(0, 500));
      throw new Error('Failed to parse AI response as JSON');
    }

    if (!Array.isArray(parsedTransactions)) {
      throw new Error('AI response is not an array');
    }

    console.log(`Parsed ${parsedTransactions.length} transactions from AI`);

    // Get existing transaction hashes for this user to detect duplicates
    const { data: existingTransactions } = await supabase
      .from('transactions')
      .select('transaction_hash')
      .eq('user_id', userId)
      .not('transaction_hash', 'is', null);

    const existingHashes = new Set(
      existingTransactions?.map(t => t.transaction_hash) || []
    );

    console.log(`Found ${existingHashes.size} existing transaction hashes`);

    // Process transactions and detect duplicates
    const newTransactions: any[] = [];
    const duplicateCount = { count: 0 };
    const transferCount = { count: 0 };
    const investmentCount = { count: 0 };
    const seenHashesInBatch = new Set<string>();

    for (const t of parsedTransactions) {
      // Generate hash from AI-provided hash_source or create one
      let hashSource = t.hash_source;
      if (!hashSource) {
        const normalizedDesc = (t.description || '')
          .toUpperCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^A-Z0-9]/g, '')
          .substring(0, 30);
        const dateStr = (t.date || '').replace(/-/g, '');
        const amountStr = Math.abs(t.amount || 0).toFixed(2);
        hashSource = `${dateStr}|${amountStr}|${normalizedDesc}`;
      }
      
      const hash = generateHash(hashSource);

      // Check for duplicates (existing in DB or in current batch)
      if (existingHashes.has(hash) || seenHashesInBatch.has(hash)) {
        duplicateCount.count++;
        console.log(`Duplicate detected: ${t.description} - ${t.date}`);
        continue;
      }

      seenHashesInBatch.add(hash);

      // Track investment movements
      if (t.category === 'investment') {
        investmentCount.count++;
      }

      // Normalize type
      let type = 'expense';
      if (t.type === 'transfer') {
        type = 'transfer';
        transferCount.count++;
      } else if (t.type === 'income' || t.amount > 0) {
        type = 'income';
      }

      newTransactions.push({
        user_id: userId,
        upload_id: uploadId,
        date: t.date,
        description: t.description || 'Sin descripción',
        amount: t.amount,
        type,
        category: t.category || 'other',
        bank: t.bank || null,
        original_text: null,
        transaction_hash: hash,
        hash_source: hashSource,
      });
    }

    console.log(`New transactions: ${newTransactions.length}, Duplicates: ${duplicateCount.count}, Transfers: ${transferCount.count}`);

    // PREVIEW MODE: Return transactions without saving
    if (previewOnly) {
      // Update upload status to indicate preview ready
      await supabase
        .from('uploads')
        .update({ status: 'preview' })
        .eq('id', uploadId);

      return new Response(
        JSON.stringify({ 
          success: true, 
          previewMode: true,
          transactions: newTransactions,
          stats: {
            newTransactions: newTransactions.length,
            duplicatesIgnored: duplicateCount.count,
            transfersDetected: transferCount.count,
            investmentsDetected: investmentCount.count,
            totalParsed: parsedTransactions.length
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DIRECT SAVE MODE (legacy): Insert transactions directly
    if (newTransactions.length > 0) {
      const { error: insertError } = await supabase
        .from('transactions')
        .insert(newTransactions);

      if (insertError) {
        console.error('Error inserting transactions:', insertError);
        throw new Error(`Failed to insert transactions: ${insertError.message}`);
      }
    }

    // Update upload status to completed
    await supabase
      .from('uploads')
      .update({ 
        status: 'completed', 
        transactions_count: newTransactions.length,
        processed_at: new Date().toISOString()
      })
      .eq('id', uploadId);

    const message = `Procesadas ${newTransactions.length} transacciones nuevas` +
      (duplicateCount.count > 0 ? `, ${duplicateCount.count} duplicados ignorados` : '') +
      (transferCount.count > 0 ? `, ${transferCount.count} transferencias internas detectadas` : '') +
      (investmentCount.count > 0 ? `, ${investmentCount.count} movimientos de inversión detectados` : '');

    console.log(`Successfully processed upload ${uploadId}: ${message}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message,
        stats: {
          newTransactions: newTransactions.length,
          duplicatesIgnored: duplicateCount.count,
          transfersDetected: transferCount.count,
          investmentsDetected: investmentCount.count,
          totalParsed: parsedTransactions.length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error processing financial file:', errorMessage);

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
