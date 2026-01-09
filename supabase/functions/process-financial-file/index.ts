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

// Category slugs from database - must match exactly
const INCOME_CATEGORIES = ['salary', 'refunds', 'sales', 'transfers_in', 'other_income', 'investments_income', 'gifts_received', 'freelance', 'rental_income'];
const EXPENSE_CATEGORIES = ['housing', 'groceries', 'restaurants', 'transport', 'health', 'entertainment', 'shopping', 'education', 'subscriptions', 'travel', 'other_expense', 'pets', 'gifts_given', 'personal_services', 'taxes', 'family', 'donations', 'insurance'];
const TRANSFER_CATEGORIES = ['own_transfer', 'to_investment'];

const FINANCIAL_ANALYSIS_PROMPT = `You are a financial data extraction expert specialized in Spanish and European bank statements. Your task is to analyze messy, unstructured financial data and extract clean transaction data.

CRITICAL: Respond ONLY with a valid JSON array. No markdown, no explanation, just the JSON.

For each transaction, extract:
- date: ISO format (YYYY-MM-DD). If day missing, use 01. If month missing, infer from context.
- description: Clean, readable description
- amount: Numeric value (positive for income, negative for expenses/transfers out)
- movement: MUST be one of: "INCOME", "EXPENSE", "TRANSFER"
- category: MUST be one of the slugs listed below (match the movement type)
- bank: Bank name if identifiable
- hash_source: String combining date|absoluteAmount|normalizedDescription for duplicate detection

MOVEMENT TYPES AND VALID CATEGORIES:

INCOME (positive amounts - money coming in):
- salary: Regular job payments (Nómina, salario, sueldo)
- freelance: Independent work, consulting, side gigs
- refunds: Money returned from purchases
- sales: Selling items, marketplace sales
- investments_income: Dividends, interests, capital gains returns
- gifts_received: Birthday money, inheritance, monetary gifts
- rental_income: Rent received from properties
- transfers_in: Incoming transfers from other banks (not investment-related)
- other_income: Any other income not fitting above

EXPENSE (negative amounts - money going out):
- housing: Rent, mortgage, utilities, electricity, water, gas, internet (Endesa, Naturgy, Vodafone)
- groceries: Supermarkets (Mercadona, Carrefour, Lidl, Dia, Aldi)
- restaurants: Eating out, delivery (Glovo, JustEat, UberEats), cafes, bars
- transport: Gas, Uber, taxi, metro, bus, parking, Cabify, car maintenance
- health: Pharmacy, doctors, dentist, medical, hospital
- entertainment: Cinema, concerts, bars, hobbies, gaming, streaming content
- shopping: Clothing, electronics, general retail (Amazon, Zara, H&M)
- education: Courses, books, training, university, Udemy, Coursera
- subscriptions: Netflix, Spotify, Amazon Prime, HBO, Disney+, gym memberships, recurring payments
- travel: Flights, hotels, Booking, Airbnb, Renfe, vacation expenses
- pets: Veterinary, pet food, pet accessories
- gifts_given: Presents for others, celebrations
- personal_services: Hairdresser, laundry, cleaning services
- taxes: Government taxes, IRPF, IVA payments, municipal fees
- family: Childcare, school, kids activities, family support
- donations: Charity, NGOs, contributions
- insurance: Car, life, home, health insurance premiums
- other_expense: Anything else not fitting above

TRANSFER (money moving between own accounts):
- own_transfer: Between own bank accounts (Santander to BBVA, between own accounts)
- to_investment: To investment platforms (Revolut Savings, MyInvestor, Trade Republic, DEGIRO, eToro, Indexa, Finizens, crypto exchanges)

DETECTION RULES:

1. TRANSFER detection - Mark movement as "TRANSFER" if:
   - Description contains: "Transferencia a", "Transferencia de", "Traspaso", "Bizum enviado", "Bizum recibido"
   - Between known banks/neobanks: "a Revolut", "desde Santander", "N26", "Wise"
   - Self-transfers: "a cuenta propia", "entre cuentas"
   - Use "to_investment" for transfers to: Savings, MyInvestor, Trade Republic, DEGIRO, Indexa, crypto platforms
   - Use "own_transfer" for transfers between regular bank accounts

2. INCOME detection - Mark movement as "INCOME" if:
   - Amount is positive
   - Keywords: "Nómina", "Ingreso", "Abono", "Devolución", "Bizum recibido"

3. EXPENSE detection - Mark movement as "EXPENSE" if:
   - Amount is negative
   - Any purchase, payment, withdrawal

HASH_SOURCE FORMAT:
Create: "YYYYMMDD|absoluteAmount|NORMALIZED_DESC"
- NORMALIZED_DESC: uppercase, no accents, only alphanumeric, first 30 chars

Example output:
[
  {"date":"2024-12-15","description":"Supermercado Mercadona","amount":-87.43,"movement":"EXPENSE","category":"groceries","bank":"Santander","hash_source":"20241215|87.43|SUPERMERCADO MERCADONA"},
  {"date":"2024-12-14","description":"Nómina Diciembre","amount":2850.00,"movement":"INCOME","category":"salary","bank":"Santander","hash_source":"20241214|2850.00|NOMINA DICIEMBRE"},
  {"date":"2024-12-13","description":"Transferencia a Revolut Savings","amount":-500.00,"movement":"TRANSFER","category":"to_investment","bank":"Santander","hash_source":"20241213|500.00|TRANSFERENCIA A REVOLUT SAVINGS"},
  {"date":"2024-12-12","description":"Netflix","amount":-15.99,"movement":"EXPENSE","category":"subscriptions","bank":"Santander","hash_source":"20241212|15.99|NETFLIX"}
]`;

// Simple hash function for duplicate detection
function generateHash(hashSource: string): string {
  let hash = 0;
  for (let i = 0; i < hashSource.length; i++) {
    const char = hashSource.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

// Validate and normalize movement type
function normalizeMovement(movement: string, amount: number): 'INCOME' | 'EXPENSE' | 'TRANSFER' {
  const upper = (movement || '').toUpperCase();
  if (upper === 'TRANSFER') return 'TRANSFER';
  if (upper === 'INCOME' || amount > 0) return 'INCOME';
  return 'EXPENSE';
}

// Validate category belongs to movement type
function validateCategory(category: string, movement: 'INCOME' | 'EXPENSE' | 'TRANSFER'): string {
  const slug = (category || '').toLowerCase();
  
  switch (movement) {
    case 'INCOME':
      return INCOME_CATEGORIES.includes(slug) ? slug : 'other_income';
    case 'EXPENSE':
      return EXPENSE_CATEGORIES.includes(slug) ? slug : 'other_expense';
    case 'TRANSFER':
      return TRANSFER_CATEGORIES.includes(slug) ? slug : 'own_transfer';
    default:
      return 'other_expense';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileContent, uploadId, userId, previewOnly, confirmTransactions, transactions } = await req.json();

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch category IDs from database for mapping
    const { data: categories } = await supabase
      .from('categories')
      .select('id, slug, movement_type')
      .eq('domain', 'CASHFLOW');

    const categoryMap = new Map<string, { id: string; movement_type: string }>();
    categories?.forEach(cat => {
      if (cat.slug) {
        categoryMap.set(cat.slug, { id: cat.id, movement_type: cat.movement_type });
      }
    });

    // CONFIRM MODE: Save pre-validated transactions
    if (confirmTransactions && transactions && uploadId && userId) {
      console.log(`Confirming ${transactions.length} transactions for upload ${uploadId}`);
      
      const transactionsToInsert = transactions.map((t: any) => {
        const movement = normalizeMovement(t.movement || t.type, t.amount);
        const categorySlug = validateCategory(t.category, movement);
        const categoryInfo = categoryMap.get(categorySlug);
        
        return {
          user_id: userId,
          upload_id: uploadId,
          date: t.date,
          description: t.description || 'Sin descripción',
          amount: t.amount,
          type: movement.toLowerCase(), // Legacy field
          movement: movement,
          category: categorySlug, // Legacy field
          category_id: categoryInfo?.id || null,
          bank: t.bank || null,
          transaction_hash: t.transaction_hash,
          domain: 'CASHFLOW',
        };
      });

      const { error: insertError } = await supabase
        .from('transactions')
        .insert(transactionsToInsert);

      if (insertError) {
        console.error('Error inserting transactions:', insertError);
        throw new Error(`Failed to insert transactions: ${insertError.message}`);
      }

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
          { role: 'user', content: `Analyze this financial data and extract ALL transactions. Classify each with the correct movement type (INCOME/EXPENSE/TRANSFER) and category slug:\n\n${fileContent}` }
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

    // Parse the AI response
    let parsedTransactions;
    try {
      let jsonString = rawContent.trim();
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

    // Get existing transaction hashes for duplicate detection
    const { data: existingTransactions } = await supabase
      .from('transactions')
      .select('transaction_hash')
      .eq('user_id', userId)
      .not('transaction_hash', 'is', null);

    const existingHashes = new Set(
      existingTransactions?.map(t => t.transaction_hash) || []
    );

    console.log(`Found ${existingHashes.size} existing transaction hashes`);

    // Process transactions
    const newTransactions: any[] = [];
    const stats = { duplicates: 0, transfers: 0, investments: 0 };
    const seenHashesInBatch = new Set<string>();

    for (const t of parsedTransactions) {
      // Generate hash
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

      // Check duplicates
      if (existingHashes.has(hash) || seenHashesInBatch.has(hash)) {
        stats.duplicates++;
        continue;
      }

      seenHashesInBatch.add(hash);

      // Normalize movement and validate category
      const movement = normalizeMovement(t.movement || t.type, t.amount);
      const categorySlug = validateCategory(t.category, movement);
      const categoryInfo = categoryMap.get(categorySlug);

      // Track stats
      if (movement === 'TRANSFER') stats.transfers++;
      if (categorySlug === 'to_investment' || categorySlug === 'investments_income') stats.investments++;

      newTransactions.push({
        user_id: userId,
        upload_id: uploadId,
        date: t.date,
        description: t.description || 'Sin descripción',
        amount: t.amount,
        type: movement.toLowerCase(), // Legacy
        movement: movement,
        category: categorySlug, // Legacy
        category_id: categoryInfo?.id || null,
        bank: t.bank || null,
        transaction_hash: hash,
        domain: 'CASHFLOW',
      });
    }

    console.log(`New: ${newTransactions.length}, Duplicates: ${stats.duplicates}, Transfers: ${stats.transfers}`);

    // PREVIEW MODE
    if (previewOnly) {
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
            duplicatesIgnored: stats.duplicates,
            transfersDetected: stats.transfers,
            investmentsDetected: stats.investments,
            totalParsed: parsedTransactions.length
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DIRECT SAVE MODE (legacy)
    if (newTransactions.length > 0) {
      const { error: insertError } = await supabase
        .from('transactions')
        .insert(newTransactions);

      if (insertError) {
        console.error('Error inserting transactions:', insertError);
        throw new Error(`Failed to insert transactions: ${insertError.message}`);
      }
    }

    await supabase
      .from('uploads')
      .update({ 
        status: 'completed', 
        transactions_count: newTransactions.length,
        processed_at: new Date().toISOString()
      })
      .eq('id', uploadId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Procesadas ${newTransactions.length} transacciones`,
        stats: {
          newTransactions: newTransactions.length,
          duplicatesIgnored: stats.duplicates,
          transfersDetected: stats.transfers,
          investmentsDetected: stats.investments,
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
