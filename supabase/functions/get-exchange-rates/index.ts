import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Extra currencies not in frankfurter.app (manual rates updated periodically)
const EXTRA_CURRENCY_RATES: Record<string, number> = {
  ARS: 1150,  // Argentine Peso - volatile, approximate
  COP: 4500,  // Colombian Peso
  CLP: 1020,  // Chilean Peso
  PEN: 4.1,   // Peruvian Sol
  UYU: 44,    // Uruguayan Peso
  VES: 45,    // Venezuelan Bolivar
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const baseCurrency = url.searchParams.get('base') || 'EUR';
    const targetCurrency = url.searchParams.get('target');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date().toISOString().split('T')[0];

    // Check if we have cached rates for today
    let query = supabase
      .from('exchange_rates')
      .select('*')
      .eq('base_currency', baseCurrency)
      .eq('rate_date', today);

    if (targetCurrency) {
      query = query.eq('target_currency', targetCurrency);
    }

    const { data: cachedRates, error: cacheError } = await query;

    if (cachedRates && cachedRates.length > 0) {
      console.log('Returning cached rates for', baseCurrency, 'on', today);
      return new Response(
        JSON.stringify({ 
          success: true, 
          rates: cachedRates,
          cached: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch fresh rates from frankfurter.app (free, no API key needed)
    console.log('Fetching fresh rates for', baseCurrency);
    const apiUrl = `https://api.frankfurter.app/latest?from=${baseCurrency}`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`Exchange rate API error: ${response.statusText}`);
    }

    const apiData = await response.json();
    const rates = apiData.rates;

    // Add extra currencies with calculated rates
    // These are approximate rates from EUR, we need to convert if base is different
    const eurRateForBase = baseCurrency === 'EUR' ? 1 : (rates['EUR'] ? 1 / rates['EUR'] : null);
    
    if (eurRateForBase !== null || baseCurrency === 'EUR') {
      Object.entries(EXTRA_CURRENCY_RATES).forEach(([currency, eurRate]) => {
        if (!rates[currency]) {
          if (baseCurrency === 'EUR') {
            rates[currency] = eurRate;
          } else if (eurRateForBase) {
            // Convert from EUR rate to base currency rate
            rates[currency] = eurRate * eurRateForBase;
          }
        }
      });
    }

    // Store all rates in the database
    const rateRecords = Object.entries(rates).map(([currency, rate]) => ({
      base_currency: baseCurrency,
      target_currency: currency,
      rate: rate as number,
      rate_date: today,
    }));

    // Delete old rates for this base currency
    await supabase
      .from('exchange_rates')
      .delete()
      .eq('base_currency', baseCurrency)
      .neq('rate_date', today);

    // Insert new rates
    const { error: insertError } = await supabase
      .from('exchange_rates')
      .upsert(rateRecords, { 
        onConflict: 'base_currency,target_currency,rate_date',
        ignoreDuplicates: true 
      });

    if (insertError) {
      console.error('Error caching rates:', insertError);
    }

    // Filter if specific target requested
    let resultRates = rateRecords;
    if (targetCurrency) {
      resultRates = rateRecords.filter(r => r.target_currency === targetCurrency);
    }

    console.log('Returning fresh rates, total currencies:', rateRecords.length);

    return new Response(
      JSON.stringify({ 
        success: true, 
        rates: resultRates,
        cached: false 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-exchange-rates:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
