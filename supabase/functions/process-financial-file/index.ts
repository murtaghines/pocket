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

const FINANCIAL_ANALYSIS_PROMPT = `You are a financial data extraction expert. Your task is to analyze messy, unstructured financial data from bank statements, spreadsheets, or documents and extract clean transaction data.

IMPORTANT: Respond ONLY with a valid JSON array, no markdown, no explanation.

For each transaction you identify, extract:
- date: ISO format (YYYY-MM-DD). If day is missing, use 01. If month is missing, infer from context.
- description: Clean, readable description of the transaction
- amount: Numeric value (positive for income, negative for expenses)
- type: "income" or "expense"
- category: One of: food, transport, housing, subscriptions, leisure, health, education, travel, other, income
- bank: Bank name if identifiable, otherwise null

Category assignment rules:
- food: supermarkets, restaurants, food delivery (Mercadona, Carrefour, Lidl, restaurants)
- transport: gas, uber, taxi, public transport, parking
- housing: rent, utilities, electricity, water, gas, internet
- subscriptions: Netflix, Spotify, Amazon Prime, recurring services
- leisure: entertainment, cinema, bars, hobbies
- health: pharmacy, doctors, gym, medical
- education: courses, books, training
- travel: flights, hotels, vacation expenses
- income: salary, freelance, dividends, transfers received
- other: anything that doesn't fit above

Handle these messy patterns:
- Dates in any format (DD/MM/YYYY, MM-DD-YYYY, "15 Dic", etc.)
- Amounts with different notations (€50, 50.00, -50, (50), 50-)
- Mixed languages
- Inconsistent column orders
- Missing headers
- Extra whitespace or formatting

Example output format:
[
  {"date":"2024-12-15","description":"Supermercado Mercadona","amount":-87.43,"type":"expense","category":"food","bank":"Santander"},
  {"date":"2024-12-14","description":"Nómina Diciembre","amount":2850.00,"type":"income","category":"income","bank":"Santander"}
]`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileContent, uploadId, userId } = await req.json();

    if (!fileContent || !uploadId || !userId) {
      console.error('Missing required fields:', { hasContent: !!fileContent, uploadId, userId });
      return new Response(
        JSON.stringify({ error: 'Missing required fields: fileContent, uploadId, userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing file for upload ${uploadId}, content length: ${fileContent.length}`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
          { role: 'user', content: `Analyze this financial data and extract transactions:\n\n${fileContent}` }
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
    let transactions;
    try {
      let jsonString = rawContent.trim();
      // Remove markdown code blocks if present
      if (jsonString.startsWith('```')) {
        jsonString = jsonString.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      }
      transactions = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Failed to parse AI response:', rawContent.substring(0, 500));
      throw new Error('Failed to parse AI response as JSON');
    }

    if (!Array.isArray(transactions)) {
      throw new Error('AI response is not an array');
    }

    console.log(`Parsed ${transactions.length} transactions`);

    // Insert transactions into the database
    const transactionsToInsert = transactions.map((t: any) => {
      // Normalize type to ensure it matches the check constraint
      let type = 'expense';
      if (t.type === 'income' || t.amount > 0) {
        type = 'income';
      }
      
      return {
        user_id: userId,
        upload_id: uploadId,
        date: t.date,
        description: t.description || 'Sin descripción',
        amount: t.amount,
        type,
        category: t.category || 'other',
        bank: t.bank || null,
        original_text: null,
      };
    });

    const { error: insertError } = await supabase
      .from('transactions')
      .insert(transactionsToInsert);

    if (insertError) {
      console.error('Error inserting transactions:', insertError);
      throw new Error(`Failed to insert transactions: ${insertError.message}`);
    }

    // Update upload status to completed
    await supabase
      .from('uploads')
      .update({ 
        status: 'completed', 
        transactions_count: transactions.length,
        processed_at: new Date().toISOString()
      })
      .eq('id', uploadId);

    console.log(`Successfully processed ${transactions.length} transactions for upload ${uploadId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        transactionsCount: transactions.length,
        transactions 
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
