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

// ─── Format detection ────────────────────────────────────────────────────────

interface FormatHint {
  broker: string;
  format: string;
  hint: string;
}

function detectFileFormat(content: string): FormatHint | null {
  const firstLines = content.split('\n').slice(0, 5).join('\n');

  // Balanz Period Results CSV (comma-separated, has Tipo,Ticker,Descripcion)
  if (/Tipo[,;]Ticker[,;]Descripcion/i.test(firstLines) ||
      /DolarMEP|DolarCCL|DolarOficial/i.test(firstLines)) {
    return {
      broker: 'Balanz',
      format: 'period_results_csv',
      hint: `This is a Balanz (Argentine broker) Period Results CSV.
Comma-separated. Argentine number format: "." = thousands separator, "," = decimal separator (e.g., "96.525,00" = 96525.00, "1.428,36" = 1428.36).
Key columns: Tipo (asset category), Ticker, Descripcion, Fecha (YYYY-MM-DD), Cantidad (quantity), PrecioCompra (price per unit), Gastos (fees/commission), Moneda (Pesos or Dólares), Operacion (operation description), DolarMEP, DolarCCL, DolarOficial (exchange rates).
All rows are BUY transactions (Compra). "Pesos" currency means ARS. "Dólares" means USD.
Asset type mapping: "Cedears" → stocks, "Bonos - Dólar" → bonds, "Corporativos - Dólar" → bonds, "Fondos" → fci.
IMPORTANT: Quantities and prices may use Argentine format — always output as standard decimal numbers.`,
    };
  }

  // Cocos Capital Movements CSV (semicolon-separated)
  if (/nroTicket[;]nroComprobante/i.test(firstLines) ||
      /tipoOperacion[;]instrumento/i.test(firstLines)) {
    return {
      broker: 'Cocos Capital',
      format: 'movements_csv',
      hint: `This is a Cocos Capital (Argentine broker) account movements CSV.
Semicolon-separated (;). Argentine number format: "." = thousands, "," = decimal (e.g., "1.346,7252" = 1346.7252, "300.000" = 300000).
Key columns: fechaEjecucion (DD-MM-YYYY), tipoOperacion, instrumento, moneda (ARS/USD), cantidad, precio, montoBruto, comision, ddmm (derechos de mercado tax), iva, otros, total.
Operation type mapping:
- "Compra" → buy
- "Liq Suscripcion Fci" → buy (mutual fund subscription, instrumento has the fund name)
- "DIVIDENDOS EN ESPECIE" → dividend (in ARS, includes tax withholdings in ddmm+iva columns)
- "Renta y Amortizacion USD" → dividend (bond coupon/amortization payment)
- "Nota De Credito Conversion" → skip (internal USD credit from ARS dividend conversion)
- "Recibo De Cobro" → deposit (cash deposited into broker account)
- "Retiro Titulos Transf" → skip (internal transfer between accounts)
IMPORTANT: The "total" column is the net amount after commissions and taxes. For buys, montoBruto is the gross and total is negative (money out). For dividends, total is the net after withholdings.
Convert DD-MM-YYYY dates to YYYY-MM-DD format.`,
    };
  }

  // Balanz Consolidated Position (PDF text)
  if (/balanz/i.test(content) && /posici[oó]n\s+consolidada/i.test(content)) {
    return {
      broker: 'Balanz',
      format: 'consolidated_position_pdf',
      hint: `This is a Balanz consolidated position PDF. It shows current holdings, NOT transactions.
Extract the POSITIONS array (not transactions): each holding with ticker, name, asset class, quantity, price, and current value.
Sections: "Bonos" (bonds), "Cedears" (stocks — Argentine-traded foreign stocks), "Corporativos" (corporate bonds), "Fondos" (fci — mutual funds).
Look for the rate info: "Dólar MEP" and "Dólar Cable" rates are usually shown.
Output positions in the "positions" array, not "transactions".`,
    };
  }

  // Balanz Checking Account (PDF text)
  if (/balanz/i.test(content) && /cuenta\s+corriente/i.test(content)) {
    return {
      broker: 'Balanz',
      format: 'checking_account_pdf',
      hint: `This is a Balanz checking account statement PDF. It shows per-instrument movements.
Extract dividends (marked as cash payments, often labeled with instrument names like "Dividendo MSFT", "Dividendo META").
Also extract any buy/sell movements per instrument.
The "Monedas" section shows currency balances (Dólar MEP, Pesos).`,
    };
  }

  // Cocos Capital Statement (PDF text)
  if (/cocos/i.test(content) && /resumen\s+de\s+cuenta/i.test(content)) {
    return {
      broker: 'Cocos Capital',
      format: 'statement_pdf',
      hint: `This is a Cocos Capital account statement PDF.
It has two parts:
1. Positions at close (tenencias al cierre) — extract as "positions" (ticker, quantity, price, value)
2. Movements section — extract as "transactions" (buy/sell/dividend)
Columns may be split into ARS / USD MEP / USD Cable sections.`,
    };
  }

  // ─── Revolut ────────────────────────────────────────────────────────────────

  // Revolut Trading CSV
  if (/Date[,;]Ticker[,;]Type[,;]Quantity[,;]Price per share[,;]Total Amount[,;]Currency[,;]FX Rate/i.test(firstLines)) {
    return {
      broker: 'Revolut',
      format: 'trading_csv',
      hint: `This is a Revolut Trading account CSV export.
Columns: Date (ISO timestamp), Ticker, Type, Quantity, Price per share, Total Amount, Currency, FX Rate.
Types: "CASH TOP-UP" → deposit, "CASH WITHDRAWAL" → withdrawal, "BUY - MARKET"/"BUY - LIMIT" → buy, "SELL - MARKET"/"SELL - LIMIT" → sell, "DIVIDEND" → dividend, "Spinoff" → buy with price 0 (stock split/spinoff).
Total Amount and Price per share include currency prefix like "USD 200" or "EUR 184.42" — strip the prefix and output as plain number.
Multi-currency: USD and EUR entries coexist in the same file. Keep each row's original currency.
Fractional shares are common (e.g., quantity 0.30252152).
FX Rate column is the EUR/base conversion rate — extract as exchange_rates when present.
This file has ONLY transactions, no positions. Output positions as [].`,
    };
  }

  // Revolut Crypto CSV
  if (/Symbol[,;]Type[,;]Quantity[,;]Price[,;]Value[,;]Fees[,;]Date/i.test(firstLines)) {
    return {
      broker: 'Revolut Crypto',
      format: 'crypto_csv',
      hint: `This is a Revolut Crypto account CSV export.
Columns: Symbol (e.g. BTC), Type (Buy/Sell), Quantity, Price (per unit with currency symbol like "€71,655.05"), Value (total with currency symbol), Fees (with currency symbol), Date (human-readable like "Jan 30, 2026, 8:11:48 PM").
All amounts use European format with € prefix — strip currency symbols and convert to standard decimals: "€71,655.05" → 71655.05, "€100.00" → 100.0, "€1.48" → 1.48.
asset_class is always "crypto". Convert dates to YYYY-MM-DD.`,
    };
  }

  // Revolut Crypto Account Statement (PDF)
  if (/revolut/i.test(content) && /crypto\s+account\s+statement/i.test(content)) {
    return {
      broker: 'Revolut Crypto',
      format: 'crypto_statement_pdf',
      hint: `This is a Revolut Crypto Account Statement PDF.
Sections: "Account summary" (opening/closing values), "Portfolio breakdown" (current positions), "Transactions" (buy/sell history), "Staking rewards".
Extract positions from "Portfolio breakdown" into the positions array.
Extract buy/sell from "Transactions" into transactions array. asset_class is always "crypto".
Fees are listed per transaction. Dates may be in "Jan 30, 2026, 8:11:48PM" format — convert to YYYY-MM-DD.
Currency is typically EUR. Strip any currency symbols from amounts.`,
    };
  }

  // Revolut Custom Statement / tax summary (PDF)
  if (/revolut/i.test(content) && /custom\s+statement/i.test(content)) {
    return {
      broker: 'Revolut Crypto',
      format: 'custom_statement_pdf',
      hint: `This is a Revolut Custom Statement PDF (crypto tax summary).
It contains "Crypto Summaries" (capital gains, staking income) and "End of Year holding statement" (positions).
Extract positions from the "End of Year holding statement" table into the positions array: Symbol, Units held, Unit price, Value held.
This is NOT a transaction file — output transactions as []. Focus on extracting the position snapshot.
Amounts appear in both EUR and USD — use EUR as the primary currency.`,
    };
  }

  // Revolut Trading Account Statement (PDF) — must come AFTER crypto checks
  if (/revolut/i.test(content) && /account\s+statement/i.test(content) && !/crypto/i.test(content)) {
    return {
      broker: 'Revolut',
      format: 'trading_statement_pdf',
      hint: `This is a Revolut Trading Account Statement PDF.
It has multiple sections per currency (e.g., "USD Account summary", "EUR Account summary"):
1. "Portfolio breakdown" — extract into positions array: Symbol, Company, ISIN, Quantity, Price, Value, % of Portfolio
2. "Transactions" — extract into transactions array: Date, Symbol, Type (Trade-Market/Trade-Limit/Cash top-up/Dividend/Spinoff), Quantity, Price, Side (Buy/Sell), Value, Fees, Commission
Extract BOTH positions AND transactions.
Types: "Trade - Market"/"Trade - Limit" with Side "Buy" → buy, Side "Sell" → sell. "Cash top-up" → deposit. "Cash withdrawal" → withdrawal. "Dividend" → dividend. "Spinoff" → buy with price 0.
Multi-currency: USD and EUR sections on different pages. Keep each section's currency.
Amounts have currency prefix like "US$200" or "€184.42" — strip and output as plain numbers.
ISINs are shown in the portfolio breakdown — include them in the position's asset_name.`,
    };
  }

  // ─── IOL (InvertirOnline) ───────────────────────────────────────────────────

  // IOL exports HTML tables as .xls — detect by column headers
  if (/Nro\.\s*de\s*Mov/i.test(firstLines) || /Tipo\s*Cuenta/i.test(firstLines) ||
      (/Operaci[oó]n/i.test(firstLines) && /S[ií]mbolo/i.test(firstLines) && /Monto/i.test(firstLines))) {
    return {
      broker: 'IOL',
      format: 'movements_html',
      hint: `This is an IOL (InvertirOnline, Argentine broker) movements export. It's an HTML table served as .xls.
Key columns: Fecha (DD/MM/YY), Nro. de Mov., Tipo Cuenta, Operación, Símbolo, Cantidad, Precio, Monto, Comis., IVA Com., Otros Imp.
"Tipo Cuenta" ending in "Pesos" → currency ARS. Ending in "Dolares" → currency USD.
"Monto" is the NET total (already includes commission). The sum of Comis. + IVA Com. + Otros Imp. = fee breakdown (for reference, don't double-count).
Operations:
- "Compra(TICKER)" → buy. "Venta(TICKER)" → sell
- "Pago de Dividendos(TICKER)" → dividend
- "Pago de Renta(TICKER)" → dividend (bond coupon)
- "Pago de Amortización(TICKER)" → sell (bond capital repayment, note "amortization" in description)
- "Crédito" (no ticker, small amounts, day 1) → deposit
- "Transferencia de Titulos OUT/IN" → skip (internal transfer)
Ticker suffix D/C (e.g., SUPVD, AL30D, AL30C) indicates dollar-settlement — strip the D/C suffix from the ticker, but ONLY when the Tipo Cuenta is "Dolares". "YPFD" is a real ticker, not a D-suffix.
Argentine number format: "." = thousands, "," = decimal.
USD operations often have a PAIRED ARS row with the same Nro. de Mov. — that ARS row contains the fees in pesos. Merge them: the USD row is the main transaction, the ARS row's amount is the fee (in ARS).
Asset classes: CEDEARs (foreign tickers traded on BYMA) → stocks. Local Argentine stocks (GGAL, YPFD, PAMP) → stocks. Letras (tickers matching S/T + 2 digits + letter + 1 digit, like S31O5, T15E7) → bonds. Bonos soberanos (AL30, GD30, etc.) → bonds.
Skip rows with Operación "Cancelada".`,
    };
  }

  return null;
}

// ─── AI prompt ───────────────────────────────────────────────────────────────

const SMART_EXTRACTION_PROMPT = `You are a financial data extraction expert for international investment broker statements. You handle brokers from any country — Revolut (Europe), IOL / Cocos / Balanz (Argentina), Interactive Brokers, Trade Republic, Degiro, and more. Extract ALL investment transactions and positions from the data.

CRITICAL: Respond ONLY with a valid JSON object (no markdown, no explanation). The object has these arrays:

{
  "transactions": [...],
  "exchange_rates": [...],
  "positions": [...]
}

## transactions array
Each element represents a buy, sell, dividend, fee, deposit, or withdrawal:
{
  "type": "buy"|"sell"|"dividend"|"fee"|"deposit"|"withdrawal",
  "ticker": "MELI"|"AL30"|"BTC"|null,
  "asset_name": "MercadoLibre Inc.",
  "asset_class": "stocks"|"etf"|"bonds"|"crypto"|"fci"|"cash"|"commodities"|"real_estate"|"other",
  "quantity": 10,
  "price_per_unit": 19970.00,
  "fee": 1570.64,
  "currency": "ARS"|"USD"|"EUR"|"GBP",
  "date": "2026-03-30",
  "description": "Buy MELI x10 @ $19,970",
  "isin": "US58733R1023",
  "exchange_rates": {"usd_mep": 1434.00, "usd_ccl": 1482.49}
}

## Type mapping rules
- "buy", "compra", "BUY - MARKET", "BUY - LIMIT", "Buy", "Liq Suscripcion Fci" → type "buy"
- "sell", "venta", "SELL - MARKET", "SELL - LIMIT", "Sell" → type "sell"
- "dividend", "dividendo", "DIVIDEND", "Pago de Renta", "renta", "coupon", "interest", "staking reward" → type "dividend"
- "CASH TOP-UP", "deposit", "depósito", "Recibo De Cobro" → type "deposit"
- "CASH WITHDRAWAL", "withdrawal", "retiro" → type "withdrawal"
- "fee", "comisión", "commission" → type "fee"
- "Spinoff", "stock split" → type "buy" with price_per_unit 0 (corporate action creating new shares)
- "Amortización", "amortization" → type "sell" with description noting it was a bond amortization
- "stock dividend", "dividendo en especie" → type "buy" with price_per_unit 0 (shares received as dividend)
- "Transferencia entre brokers", "broker transfer" → SKIP (not an economic event)
- "Nota De Credito Conversion", internal credit notes → SKIP

## General rules
- ticker: the instrument ticker/symbol. Null for cash movements or when not identifiable
- asset_class: "stocks" for individual stocks and CEDEARs, "etf" for ETFs (including UCITS like QDVW), "bonds" for government and corporate bonds and letras, "fci" for mutual funds, "crypto" for cryptocurrency, "cash" for cash/currency, "real_estate" for REITs, "other" for anything else
- quantity: number of units. Fractional shares are common (e.g. 0.30252152). Use 0 for dividends/fees with no units
- price_per_unit: price per unit. For lump-sum dividends/fees, put the total amount in price_per_unit with quantity 1
- fee: commission/expenses. 0 if none or already included in the price
- currency: the actual currency of the transaction. Multi-currency files are common — keep each row's original currency
- date: always YYYY-MM-DD format. Convert from any source format (ISO timestamps, "Jan 30, 2026", DD-MM-YYYY, etc.)
- isin: the ISIN code if present in the source data, null otherwise
- exchange_rates: only when the source data includes per-row FX rate information
- ALL numbers must be standard decimal format (no thousands separators). Convert locale-specific formats:
  - Argentine: "96.525,00" → 96525.00 ("." = thousands, "," = decimal)
  - European: "€71.655,05" → 71655.05 (strip currency symbol, same conversion)
  - US/UK: "$1,234.56" → 1234.56 (strip currency symbol, "," = thousands, "." = decimal)
  - Currency-prefixed: "USD 200" or "EUR 184.42" → strip the currency prefix, output plain number
- Amounts are always positive. The "type" field indicates direction (buy = money out, sell = money in, etc.)

## Broker-specific knowledge

### Revolut Trading
- Types: "CASH TOP-UP" → deposit, "CASH WITHDRAWAL" → withdrawal, "BUY - MARKET"/"BUY - LIMIT" → buy, "SELL - MARKET"/"SELL - LIMIT" → sell, "DIVIDEND" → dividend, "Spinoff" → buy (price 0)
- FX Rate column = EUR-to-base conversion rate. Extract as exchange_rates
- Multi-currency (USD + EUR) in single file — keep original currency per row

### Revolut Crypto
- Always asset_class "crypto". Fees are explicit per transaction
- European number format with € prefix

### Argentine brokers (IOL, Cocos Capital, Balanz)
- CEDEARs: foreign stocks traded on BYMA — asset_class "stocks", keep the original ticker (MELI, AAPL, etc.)
- Letras: short-term bonds, tickers like S31O5, T15E7 — asset_class "bonds"
- Bonos soberanos: AL30, GD30, AE38, etc. — asset_class "bonds"
- Exchange rates: Dólar MEP, Dólar CCL, Dólar Oficial — extract all as exchange_rates
- IOL: USD operations may have paired ARS fee rows with same Nro. de Mov. — merge: USD row is the transaction, ARS row amount is the fee
- "Pesos" = ARS, "Dólares" = USD

## exchange_rates array
Unique exchange rates found in the file:
{
  "from": "USD",
  "to": "ARS",
  "rate": 1434.00,
  "rate_type": "mep"|"ccl"|"official"|"spot"|"custom",
  "date": "2026-03-30"
}
- Deduplicate: one entry per unique (from, to, rate_type, date) combination
- Only include if the file explicitly contains exchange rate data
- For Revolut FX Rate column: from = row currency, to = "EUR", rate = the FX Rate value, rate_type = "spot"

## positions array
Current holdings (only for position/portfolio snapshots, NOT transaction files):
{
  "ticker": "MELI",
  "asset_name": "MercadoLibre Inc.",
  "asset_class": "stocks",
  "quantity": 25,
  "current_price": 22150.00,
  "current_value": 553750.00,
  "currency": "ARS",
  "isin": "US58733R1023"
}
- Only populate for consolidated position / portfolio snapshot files
- Leave empty [] for transaction-only files
- When a file has both positions and transactions (e.g., Revolut account statement), put each in its own array

IMPORTANT:
- Extract EVERY row. Do not skip or summarize
- Skip internal transfers, credit notes, cancelled operations, and purely informational rows that don't represent real economic events
- When a file has both positions and transactions, put each in its own array
- If no data for an array, return it as []
`;

// Legacy prompt for backward compatibility (bank statement deposit/withdrawal detection)
const LEGACY_ANALYSIS_PROMPT = `You are a financial data extraction expert specialized in detecting investment and savings movements from bank statements. Your task is to extract ONLY transactions that represent money going INTO or OUT of investment/savings accounts.

CRITICAL: Respond ONLY with a valid JSON array. No markdown, no explanation, just the JSON.

For each INVESTMENT transaction, extract:
- date: ISO format (YYYY-MM-DD)
- description: Clean, readable description
- amount: Absolute numeric value (always positive)
- type: "deposit" (money going to investment) or "withdrawal" (money coming back from investment)
- platform: The investment platform name
- asset_type: Type of asset if identifiable (e.g., "Savings", "ETF", "Stocks", "Bonds", "Crypto", "Mixed", null if unknown)

If no investment transactions are found, return: []`;

// ─── Platform normalization ──────────────────────────────────────────────────

function normalizePlatform(platform: string): string {
  const lower = platform.toLowerCase();
  if (lower.includes('savings') || lower.includes('ahorro')) {
    if (lower.includes('revolut')) return 'Revolut Savings';
    if (lower.includes('n26')) return 'N26 Savings';
    return 'Savings Account';
  }
  if (lower.includes('revolut')) {
    if (lower.includes('crypto')) return 'Revolut Crypto';
    return 'Revolut';
  }
  if (lower.includes('cocos')) return 'Cocos Capital';
  if (lower.includes('balanz')) return 'Balanz';
  if (lower.includes('myinvestor') || lower.includes('my investor')) return 'MyInvestor';
  if (lower.includes('trade republic') || lower.includes('traderepublic')) return 'Trade Republic';
  if (lower.includes('degiro')) return 'Degiro';
  if (lower.includes('interactive') || lower.includes('ibkr')) return 'Interactive Brokers';
  if (lower.includes('etoro')) return 'eToro';
  if (lower.includes('indexa')) return 'Indexa Capital';
  if (lower.includes('finizens')) return 'Finizens';
  if (lower.includes('renta 4') || lower.includes('renta4')) return 'Renta 4';
  if (lower.includes('iol') || lower.includes('invertir online') || lower.includes('invertironline')) return 'IOL';
  if (lower.includes('binance')) return 'Binance';
  if (lower.includes('coinbase')) return 'Coinbase';
  if (lower.includes('kraken')) return 'Kraken';
  return platform;
}

// Map asset_class strings from AI to our DB enum
function normalizeAssetClass(ac: string | null): string {
  if (!ac) return 'other';
  const lower = ac.toLowerCase();
  const map: Record<string, string> = {
    stocks: 'stocks', stock: 'stocks', equity: 'stocks', cedear: 'stocks', cedears: 'stocks',
    etf: 'etf', etfs: 'etf',
    bonds: 'bonds', bond: 'bonds', 'government bonds': 'bonds', 'corporate bonds': 'bonds',
    crypto: 'crypto', cryptocurrency: 'crypto',
    fci: 'fci', 'mutual fund': 'fci', 'mutual funds': 'fci', fund: 'fci', funds: 'fci', fondos: 'fci',
    cash: 'cash', currency: 'cash',
    'real estate': 'real_estate', real_estate: 'real_estate',
    commodities: 'commodities', commodity: 'commodities',
  };
  return map[lower] || 'other';
}

// Map type strings from AI to our canonical 6 types
function normalizeTransactionType(raw: string | null | undefined): string {
  if (!raw) return 'buy';
  const lower = raw.toLowerCase().trim();
  const map: Record<string, string> = {
    buy: 'buy', compra: 'buy', 'buy - market': 'buy', 'buy - limit': 'buy',
    'trade-market': 'buy', 'trade-limit': 'buy',
    'liq suscripcion fci': 'buy', spinoff: 'buy', 'stock dividend': 'buy',
    'dividendo en especie': 'buy',
    sell: 'sell', venta: 'sell', 'sell - market': 'sell', 'sell - limit': 'sell',
    amortization: 'sell', amortización: 'sell',
    dividend: 'dividend', dividendo: 'dividend', renta: 'dividend',
    'pago de renta': 'dividend', coupon: 'dividend', interest: 'dividend',
    'staking reward': 'dividend', 'staking rewards': 'dividend',
    fee: 'fee', comisión: 'fee', commission: 'fee',
    deposit: 'deposit', depósito: 'deposit', 'cash top-up': 'deposit',
    'cash deposit': 'deposit', 'recibo de cobro': 'deposit',
    withdrawal: 'withdrawal', retiro: 'withdrawal', 'cash withdrawal': 'withdrawal',
  };
  return map[lower] || 'buy';
}

// ─── Dedup fingerprint for investment_transactions ───────────────────────────

async function calculateTxFingerprint(
  ticker: string | null,
  date: string,
  type: string,
  quantity: number,
  pricePerUnit: number,
  currency: string,
): Promise<string> {
  const input = `tx|${(ticker || '').toLowerCase()}|${date}|${type}|${quantity.toFixed(4)}|${pricePerUnit.toFixed(4)}|${currency.toLowerCase()}`;
  return await sha256(input);
}

// ─── Main handler ────────────────────────────────────────────────────────────

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

    const body = await req.json();
    const {
      fileContent,
      importId,
      uploadId,
      previewOnly,
      // Legacy confirm path
      investments: reviewedInvestments,
      // Smart Import confirm path
      smartImportData,
    } = body;
    const userId = authData.user.id;
    const recordId = importId || uploadId;

    if (!recordId || !userId || (!fileContent && !reviewedInvestments && !smartImportData)) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ── Legacy confirm path (backward compat) ──────────────────────────────
    if (reviewedInvestments && !smartImportData) {
      return await handleLegacyConfirm(supabase, userId, recordId, reviewedInvestments, previewOnly);
    }

    // ── Smart Import confirm path ──────────────────────────────────────────
    if (smartImportData) {
      return await handleSmartConfirm(supabase, userId, recordId, smartImportData);
    }

    // ── AI parse path (preview) ────────────────────────────────────────────
    console.log(`Processing investment file for import ${recordId}, content length: ${fileContent.length}`);

    await supabase.from('imports').update({ status: 'PARSED' }).eq('id', recordId);

    // Detect file format for prompt hints
    const formatHint = detectFileFormat(fileContent);
    const isSmartFormat = formatHint !== null;
    const broker = formatHint?.broker || null;

    console.log(`Format detected: ${formatHint?.format || 'generic'} (broker: ${broker || 'unknown'})`);

    // Build prompt
    let systemPrompt: string;
    let userMessage: string;

    if (isSmartFormat) {
      systemPrompt = SMART_EXTRACTION_PROMPT;
      userMessage = `${formatHint!.hint}\n\nExtract all transactions, exchange rates, and positions from this file:\n\n${fileContent}`;
    } else {
      // Fallback: try smart extraction for unknown formats too
      systemPrompt = SMART_EXTRACTION_PROMPT;
      userMessage = `Extract all investment transactions, exchange rates, and positions from this financial data. If the file appears to be a regular bank statement (not a broker statement), extract only deposit/withdrawal movements to investment platforms.\n\nData:\n${fileContent}`;
    }

    // AI call
    const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY ?? '',
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 32000,
        thinking: { type: 'disabled' },
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      if (aiResponse.status === 429) {
        await supabase.from('imports').update({ status: 'FAILED', error_message: 'Rate limit exceeded. Please try again later.' }).eq('id', recordId);
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      await supabase.from('imports').update({ status: 'FAILED', error_message: `AI API error: ${aiResponse.status} ${errorText.slice(0, 300)}` }).eq('id', recordId);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    if (aiData.stop_reason === 'refusal') {
      await supabase.from('imports').update({ status: 'FAILED', error_message: 'AI declined to process the file.' }).eq('id', recordId);
      return new Response(JSON.stringify({ error: 'AI declined to process the file.' }), { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const rawContent = Array.isArray(aiData.content)
      ? aiData.content.find((b: any) => b.type === 'text')?.text
      : undefined;

    if (!rawContent) throw new Error('No content in AI response');

    console.log('AI response received, length:', rawContent.length);

    // Parse AI response
    let parsed: any;
    try {
      let jsonString = rawContent.trim();
      if (jsonString.startsWith('```')) {
        jsonString = jsonString.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      }
      parsed = JSON.parse(jsonString);
    } catch {
      console.error('Failed to parse AI response:', rawContent.substring(0, 500));
      throw new Error('Failed to parse AI response as JSON');
    }

    // Handle both smart format (object with arrays) and legacy format (plain array)
    let transactions: any[] = [];
    let exchangeRates: any[] = [];
    let positions: any[] = [];

    if (Array.isArray(parsed)) {
      // Legacy format: AI returned a plain array (deposit/withdrawal)
      // Convert to smart format for unified preview
      transactions = parsed.map((inv: any) => ({
        type: inv.type === 'withdrawal' ? 'withdrawal' : 'deposit',
        ticker: null,
        asset_name: inv.description || 'Investment',
        asset_class: 'other',
        quantity: 0,
        price_per_unit: Math.abs(inv.amount || 0),
        fee: 0,
        currency: 'ARS',
        date: inv.date,
        description: inv.description || '',
        platform: normalizePlatform(inv.platform || 'Unknown'),
        _legacy: true,
        _legacy_asset_type: inv.asset_type,
      }));
    } else {
      transactions = Array.isArray(parsed.transactions) ? parsed.transactions : [];
      exchangeRates = Array.isArray(parsed.exchange_rates) ? parsed.exchange_rates : [];
      positions = Array.isArray(parsed.positions) ? parsed.positions : [];
    }

    // Normalize all transactions
    const normalizedTx = transactions.map((tx: any) => ({
      type: normalizeTransactionType(tx.type),
      ticker: tx.ticker || null,
      asset_name: tx.asset_name || tx.description || 'Unknown',
      asset_class: normalizeAssetClass(tx.asset_class),
      quantity: Math.abs(Number(tx.quantity) || 0),
      price_per_unit: Math.abs(Number(tx.price_per_unit) || 0),
      fee: Math.abs(Number(tx.fee) || 0),
      currency: (tx.currency || 'ARS').toUpperCase(),
      date: tx.date || new Date().toISOString().slice(0, 10),
      description: tx.description || '',
      exchange_rates: tx.exchange_rates || null,
      platform: tx.platform || broker || null,
      _legacy: tx._legacy || false,
      _legacy_asset_type: tx._legacy_asset_type || null,
    }));

    const normalizedRates = exchangeRates.map((r: any) => ({
      from: (r.from || 'USD').toUpperCase(),
      to: (r.to || 'ARS').toUpperCase(),
      rate: Math.abs(Number(r.rate) || 0),
      rate_type: ['mep', 'ccl', 'official', 'custom'].includes(r.rate_type) ? r.rate_type : 'official',
      date: r.date || new Date().toISOString().slice(0, 10),
    })).filter((r: any) => r.rate > 0);

    const normalizedPositions = positions.map((p: any) => ({
      ticker: p.ticker || null,
      asset_name: p.asset_name || p.ticker || 'Unknown',
      asset_class: normalizeAssetClass(p.asset_class),
      quantity: Math.abs(Number(p.quantity) || 0),
      current_price: Math.abs(Number(p.current_price) || 0),
      current_value: Math.abs(Number(p.current_value) || 0),
      currency: (p.currency || 'ARS').toUpperCase(),
    }));

    console.log(`Parsed: ${normalizedTx.length} transactions, ${normalizedRates.length} rates, ${normalizedPositions.length} positions`);

    // Store raw AI output for audit
    if (normalizedTx.length > 0) {
      const importRowRecords = await Promise.all(normalizedTx.map(async (tx: any, idx: number) => ({
        import_id: recordId,
        row_index: idx,
        raw_json: tx,
        row_hash_sha256: await sha256(JSON.stringify(tx)),
        parsed_date: tx.date || null,
        parsed_amount: tx.quantity * tx.price_per_unit || null,
        parsed_currency: tx.currency || 'ARS',
        parsed_description: tx.description || null,
      })));
      const { error: rowsError } = await supabase.from('import_rows').upsert(importRowRecords, {
        onConflict: 'import_id,row_hash_sha256',
        ignoreDuplicates: true,
      });
      if (rowsError) console.log(`import_rows upsert error: ${rowsError.message}`);
    }

    // Count by type for stats
    const stats = {
      totalTransactions: normalizedTx.length,
      buys: normalizedTx.filter((t: any) => t.type === 'buy').length,
      sells: normalizedTx.filter((t: any) => t.type === 'sell').length,
      dividends: normalizedTx.filter((t: any) => t.type === 'dividend').length,
      fees: normalizedTx.filter((t: any) => t.type === 'fee').length,
      deposits: normalizedTx.filter((t: any) => t.type === 'deposit').length,
      withdrawals: normalizedTx.filter((t: any) => t.type === 'withdrawal').length,
      exchangeRates: normalizedRates.length,
      positions: normalizedPositions.length,
      broker: broker,
      format: formatHint?.format || 'generic',
    };

    return new Response(
      JSON.stringify({
        success: true,
        mode: 'smart',
        previewMode: true,
        data: {
          transactions: normalizedTx,
          exchangeRates: normalizedRates,
          positions: normalizedPositions,
        },
        stats,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error processing investment file:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

// ─── Smart Import confirm ────────────────────────────────────────────────────

async function handleSmartConfirm(
  supabase: any,
  userId: string,
  importId: string,
  data: { transactions?: any[]; exchangeRates?: any[]; positions?: any[]; saveExchangeRates?: boolean },
) {
  const transactions = data.transactions || [];
  const exchangeRates = data.exchangeRates || [];
  const positions = data.positions || [];
  const saveRates = data.saveExchangeRates !== false; // default true

  console.log(`Smart confirm: ${transactions.length} tx, ${exchangeRates.length} rates, ${positions.length} positions`);

  let txInserted = 0;
  let holdingsCreated = 0;
  let holdingsUpdated = 0;
  let ratesSaved = 0;
  let positionsUpserted = 0;
  let legacyDeposit = 0;

  // Lookup account_id from the import record
  const { data: importRecord } = await supabase
    .from('imports')
    .select('account_id')
    .eq('id', importId)
    .single();
  const accountId = importRecord?.account_id || null;

  // 1. Insert investment_transactions (trigger auto-creates/updates holdings)
  const txTypes = ['buy', 'sell', 'dividend', 'fee'];
  const richTransactions = transactions.filter((tx: any) => txTypes.includes(tx.type));
  const cashTransactions = transactions.filter((tx: any) => !txTypes.includes(tx.type));

  // Dedup: check existing transactions for this import
  const { data: existingForImport } = await supabase
    .from('investment_transactions')
    .select('id')
    .eq('import_id', importId);

  if (existingForImport && existingForImport.length > 0) {
    console.log(`Import ${importId} already has ${existingForImport.length} transactions — skipping to avoid duplicates`);
  } else if (richTransactions.length > 0) {
    // Build fingerprints for cross-import dedup
    const { data: existingTx } = await supabase
      .from('investment_transactions')
      .select('ticker, date, type, quantity, price_per_unit, currency')
      .eq('user_id', userId);

    const existingFingerprints = new Set<string>();
    if (existingTx) {
      for (const tx of existingTx) {
        const fp = await calculateTxFingerprint(
          tx.ticker, tx.date?.slice(0, 10) || '', tx.type,
          Number(tx.quantity), Number(tx.price_per_unit), tx.currency,
        );
        existingFingerprints.add(fp);
      }
    }

    const seenFp = new Set<string>();

    for (const tx of richTransactions) {
      const fp = await calculateTxFingerprint(
        tx.ticker, tx.date, tx.type,
        tx.quantity, tx.price_per_unit, tx.currency,
      );
      if (existingFingerprints.has(fp) || seenFp.has(fp)) {
        console.log(`Duplicate tx skipped: ${tx.type} ${tx.ticker} ${tx.date}`);
        continue;
      }
      seenFp.add(fp);

      const { error: txError } = await supabase.from('investment_transactions').insert({
        user_id: userId,
        account_id: accountId,
        import_id: importId,
        type: tx.type,
        ticker: tx.ticker,
        asset_name: tx.asset_name,
        quantity: tx.quantity,
        price_per_unit: tx.price_per_unit,
        fee: tx.fee,
        currency: tx.currency,
        exchange_rate: tx.exchange_rates?.usd_mep || tx.exchange_rates?.usd_official || null,
        notes: tx.description,
        date: tx.date,
      });

      if (txError) {
        console.error(`Error inserting tx: ${txError.message}`);
      } else {
        txInserted++;
      }
    }
  }

  // 2. Handle positions (direct holding upsert for portfolio snapshots)
  if (positions.length > 0) {
    for (const pos of positions) {
      if (!pos.ticker && !pos.asset_name) continue;

      // Find existing open holding by ticker
      const { data: existingHolding } = await supabase
        .from('holdings')
        .select('id')
        .eq('user_id', userId)
        .eq('ticker', pos.ticker)
        .eq('is_closed', false)
        .maybeSingle();

      if (existingHolding) {
        // Update existing
        const { error } = await supabase
          .from('holdings')
          .update({
            quantity: pos.quantity,
            current_price: pos.current_price,
            price_updated_at: new Date().toISOString(),
            asset_name: pos.asset_name,
            asset_class: pos.asset_class,
            currency: pos.currency,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingHolding.id);
        if (!error) holdingsUpdated++;
      } else {
        // Create new holding from position
        const { error } = await supabase.from('holdings').insert({
          user_id: userId,
          account_id: accountId,
          ticker: pos.ticker,
          asset_name: pos.asset_name,
          asset_class: pos.asset_class,
          quantity: pos.quantity,
          avg_cost_per_unit: pos.current_price, // best guess without purchase data
          current_price: pos.current_price,
          price_updated_at: new Date().toISOString(),
          currency: pos.currency,
        });
        if (!error) {
          holdingsCreated++;
          positionsUpserted++;
        }
      }
    }
  }

  // 3. Save exchange rates
  if (saveRates && exchangeRates.length > 0) {
    for (const rate of exchangeRates) {
      if (rate.rate <= 0) continue;
      const { error } = await supabase.from('portfolio_rate_overrides').upsert({
        user_id: userId,
        from_currency: rate.from,
        to_currency: rate.to,
        rate: rate.rate,
        rate_type: rate.rate_type,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,from_currency,to_currency,rate_type',
      });
      if (!error) ratesSaved++;
    }
  }

  // 4. Create legacy investments deposit record (for dashboard KPI "Sent to Invest")
  const totalBuyAmount = richTransactions
    .filter((tx: any) => tx.type === 'buy')
    .reduce((sum: number, tx: any) => sum + (tx.quantity * tx.price_per_unit + tx.fee), 0);

  if (totalBuyAmount > 0) {
    const platform = richTransactions[0]?.platform || 'Broker';
    const hash = await calculateInvestmentFingerprint(
      normalizePlatform(platform),
      new Date().toISOString().slice(0, 10),
      totalBuyAmount,
      `Smart import: ${txInserted} transactions`,
    );

    await supabase.from('investments').upsert({
      user_id: userId,
      upload_id: importId,
      date: richTransactions[0]?.date || new Date().toISOString().slice(0, 10),
      description: `Import: ${txInserted} transactions from ${normalizePlatform(platform)}`,
      amount: totalBuyAmount,
      type: 'deposit',
      platform: normalizePlatform(platform),
      asset_type: 'Mixed',
      transaction_hash: hash,
    }, { onConflict: 'user_id,transaction_hash', ignoreDuplicates: true });
    legacyDeposit = 1;
  }

  // Also handle cash deposits/withdrawals in legacy table
  for (const tx of cashTransactions) {
    const platform = normalizePlatform(tx.platform || 'Broker');
    const hash = await calculateInvestmentFingerprint(
      platform, tx.date, tx.price_per_unit, tx.description || '',
    );
    await supabase.from('investments').upsert({
      user_id: userId,
      upload_id: importId,
      date: tx.date,
      description: tx.description || 'Cash movement',
      amount: Math.abs(tx.price_per_unit * (tx.quantity || 1)),
      type: tx.type === 'withdrawal' ? 'withdrawal' : 'deposit',
      platform,
      asset_type: 'Cash',
      transaction_hash: hash,
    }, { onConflict: 'user_id,transaction_hash', ignoreDuplicates: true });
  }

  // 5. Take portfolio snapshot
  await supabase.rpc('take_portfolio_snapshot', { p_user_id: userId }).catch(() => {});

  // Update import status
  await supabase.from('imports').update({
    status: 'NORMALIZED',
    transactions_count: txInserted + positionsUpserted + cashTransactions.length,
  }).eq('id', importId);

  const message = `Smart import: ${txInserted} transactions, ${positionsUpserted} positions, ${ratesSaved} exchange rates`;
  console.log(`Successfully processed import ${importId}: ${message}`);

  return new Response(
    JSON.stringify({
      success: true,
      mode: 'smart',
      message,
      stats: {
        transactionsInserted: txInserted,
        holdingsCreated,
        holdingsUpdated,
        positionsUpserted,
        ratesSaved,
        legacyDeposit,
      },
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

// ─── Legacy confirm path (backward compat) ───────────────────────────────────

async function handleLegacyConfirm(
  supabase: any,
  userId: string,
  recordId: string,
  reviewedInvestments: any[],
  previewOnly: boolean,
) {
  if (!Array.isArray(reviewedInvestments)) {
    throw new Error('investments must be an array');
  }

  const investments = reviewedInvestments;
  console.log(`Legacy confirm for import ${recordId}: ${investments.length} investments`);

  const { data: existingInvestments } = await supabase
    .from('investments')
    .select('transaction_hash')
    .eq('user_id', userId)
    .not('transaction_hash', 'is', null);

  const existingHashes = new Set(existingInvestments?.map((t: any) => t.transaction_hash) || []);
  const seenHashesInBatch = new Set<string>();
  const newInvestments: any[] = [];
  let duplicateCount = 0;
  let depositCount = 0;
  let withdrawalCount = 0;

  for (const inv of investments) {
    const platform = normalizePlatform(inv.platform || 'Unknown');
    const hash = await calculateInvestmentFingerprint(platform, inv.date, inv.amount, inv.description || '');

    if (existingHashes.has(hash) || seenHashesInBatch.has(hash)) {
      duplicateCount++;
      continue;
    }
    seenHashesInBatch.add(hash);

    const type = inv.type === 'withdrawal' ? 'withdrawal' : 'deposit';
    if (type === 'deposit') depositCount++;
    else withdrawalCount++;

    newInvestments.push({
      user_id: userId,
      upload_id: recordId,
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

  if (!previewOnly && newInvestments.length > 0) {
    const { error: insertError } = await supabase
      .from('investments')
      .upsert(newInvestments, { onConflict: 'user_id,transaction_hash', ignoreDuplicates: true });
    if (insertError) throw new Error(`Failed to insert investments: ${insertError.message}`);

    await supabase.from('imports').update({
      status: 'NORMALIZED',
      transactions_count: newInvestments.length,
    }).eq('id', recordId);
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: `Processed ${newInvestments.length} investments`,
      previewMode: previewOnly,
      data: previewOnly ? newInvestments : undefined,
      stats: {
        newInvestments: newInvestments.length,
        deposits: depositCount,
        withdrawals: withdrawalCount,
        duplicatesIgnored: duplicateCount,
        totalParsed: investments.length,
      },
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}
