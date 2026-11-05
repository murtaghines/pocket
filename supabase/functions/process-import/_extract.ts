/**
 * Extraction module — turns raw file content (text, CSV, images) into a flat
 * transaction array. Handles AI calls, chunking, JSON recovery and row validation.
 * Internal module imported by the main orchestrator (index.ts).
 */

// ========== CHUNKING CONFIG ==========
const CHUNK_SIZE_THRESHOLD = 6000;
const MAX_CHUNK_SIZE = 4000;

// ========== EDGE FUNCTION DEADLINE ==========
const EDGE_FUNCTION_DEADLINE_MS = 140_000;
let requestStartTime = 0;

export function setRequestStartTime(t: number) { requestStartTime = t; }

function remainingMs(): number {
  return Math.max(0, EDGE_FUNCTION_DEADLINE_MS - (Date.now() - requestStartTime));
}

// ========== PROMPTS ==========

const SIMPLE_EXTRACTION_PROMPT = `You are a financial data extraction expert. Extract transactions from this bank statement data.

CRITICAL: Respond ONLY with a valid JSON array. No markdown, no explanation, just the JSON.

For each transaction, extract ONLY these essential fields:
- posted_date: ISO format (YYYY-MM-DD)
- description_raw: Original description as-is
- amount_signed: Numeric value (positive for deposits/income, negative for withdrawals/expenses)
- running_balance: Balance after transaction if shown, otherwise null
- currency: Currency code if visible (EUR, USD, etc.)
- movement: INCOME, EXPENSE or TRANSFER. TRANSFER only when clearly between the user's OWN
  accounts/investments ("to/from savings", "own account", same person's wallets). A payment to
  another person (Bizum, "payment to: NAME", "transfer to OTHER PERSON") is EXPENSE, not TRANSFER.
- category_slug: one of these per movement:
  EXPENSE: housing|groceries|restaurants|transport|health|entertainment|shopping|education|subscriptions|travel|sports|pets|other_expense
  INCOME: salary|refunds|freelance|rents|investment|other_income
  TRANSFER: own_transfer|to_investment
  Infer from merchant/description. Use other_* only when no clue.

STATE — SKIP any transaction whose state/status is REVERTED, DECLINED, CANCELLED or FAILED: it did
not complete and does not affect the balance. Emit only completed transactions.
FEE — if the data has a separate fee/commission column with a NON-ZERO value, set amount_signed to
(amount − fee): the fee is charged on top of the amount and moves the balance further. When the fee
is 0 or absent, amount_signed = amount.
FORMAT — rows may arrive pre-parsed as "<date> | <description> | <±amount> | bal <balance>": the
leading +/− is the sign of amount_signed, and the value after "bal" is running_balance.

Example output:
[
  {"posted_date":"2024-12-15","description_raw":"COMPRA TARJETA MERCADONA","amount_signed":-87.43,"running_balance":1234.56,"currency":"EUR","movement":"EXPENSE","category_slug":"groceries"},
  {"posted_date":"2024-12-14","description_raw":"NOMINA DICIEMBRE","amount_signed":2850.00,"running_balance":3084.56,"currency":"EUR","movement":"INCOME","category_slug":"salary"}
]

Extract ALL completed transactions visible in the data (skip reverted/declined/cancelled ones).`;

const CASHFLOW_ANALYSIS_PROMPT = `You are a financial data extraction expert specialized in bank statements from any country. Your task is to analyze messy, unstructured financial data and extract clean transaction data.

CRITICAL: Respond ONLY with a valid JSON array. No markdown, no explanation, just the JSON.

STATE — SKIP any transaction whose state/status is REVERTED, DECLINED, CANCELLED or FAILED: it did
not complete and does not affect the balance. Emit only completed transactions.
FORMAT — rows may arrive pre-parsed as "<date> | <description> | <±amount> | bal <balance>": the
leading +/− is the sign of amount_signed, and the value after "bal" is running_balance.

For each transaction, extract:
- posted_date: ISO format (YYYY-MM-DD). This is the main transaction date shown on the statement.
- description_raw: Original raw description from the statement.
- description_clean: Clean, readable description removing reference numbers and noise.
- amount_signed: Numeric value (positive for income, negative for expenses/transfers out). If the
  data has a separate fee/commission column with a NON-ZERO value, use (amount − fee): the fee is
  charged on top and moves the balance further. Fee 0 or absent → amount_signed = amount.
- running_balance: Balance after transaction if shown, otherwise null.
- movement: One of: INCOME, EXPENSE, TRANSFER (the fundamental type of money movement)
- category_slug: Best-fit category for the transaction — see CATEGORY_SLUG rule below.
- currency: Currency code (EUR, USD, GBP, ARS, MXN, etc.) - detect from symbols or context

=== MOVEMENT CLASSIFICATION (Step 1 - CRITICAL) ===

You MUST first determine the movement type, then assign a category within that movement.

INCOME: Money entering the user from external sources, increasing available cash.
- Salary, payroll, wages ("Nómina", "Sueldo", "Salary", "Payroll")
- Refunds and chargebacks ("Devolución", "Refund", "Chargeback")
- Sales income from selling items
- Interest received, dividends
- Category slugs: salary, refunds, freelance, rents, investment, transfers, other_income

EXPENSE: Money leaving to a third party representing real consumption or payment.
- Purchases at stores, restaurants, services
- Rent, utilities, subscriptions
- Payments to external merchants or people
- CRITICAL: If a "transfer" goes to a THIRD PARTY (not own account, not investment), it's EXPENSE, not TRANSFER!
- Category slugs: housing, groceries, restaurants, transport, health, entertainment, shopping, education, subscriptions, travel, sports, pets, other_expense

TRANSFER: Movement between the user's OWN accounts or to their OWN investment accounts. NO consumption.
- Between own bank accounts (Santander ↔ Revolut ↔ MercadoPago)
- To own savings/investment accounts (broker, instant access savings, trading)
- CRITICAL: Only TRANSFER if destination is CONFIRMED to be user's own account or investment platform!
- CRITICAL: "Transferencia recibida/emitida", "Bizum recibido/enviado" are NOT automatically TRANSFER!
- Category slugs: own_transfer (between own accounts), to_investment (to savings/investment)

=== TRANSFER vs EXPENSE/INCOME DECISION (CRITICAL RULE) ===

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

CRITICAL - These are NOT TRANSFER:
- "Transferencia recibida" or "Transferencia emitida" without explicit self-transfer context
- "Bizum recibido" or "Bizum enviado" (these are payments to/from other people)
- Any transfer to/from a person whose name is NOT the user
- When uncertain: positive amount → INCOME, negative amount → EXPENSE

If UNCERTAIN whether a transfer goes to own account or third party:
→ Use the amount sign: positive = INCOME, negative = EXPENSE

=== CATEGORY_SLUG (Step 2) ===

Assign one category_slug per movement:
- INCOME: salary, refunds, freelance, rents, investment, other_income
- EXPENSE: housing, groceries, restaurants, transport, health, entertainment, shopping, education, subscriptions, travel, sports, pets, other_expense
- TRANSFER: own_transfer, to_investment
Infer from the merchant/description. Use other_expense/other_income only when no clue.

Example output:
[
  {"posted_date":"2024-12-15","description_raw":"COMPRA TARJETA *1234 MERCADONA","description_clean":"Supermercado Mercadona","amount_signed":-87.43,"running_balance":1234.56,"movement":"EXPENSE","category_slug":"groceries","currency":"EUR"},
  {"posted_date":"2024-12-14","description_raw":"NOMINA DICIEMBRE EMPRESA SA","description_clean":"Nómina Diciembre","amount_signed":2850.00,"running_balance":3084.56,"movement":"INCOME","category_slug":"salary","currency":"EUR"},
  {"posted_date":"2024-12-13","description_raw":"TRF A CTA PROPIA REVOLUT","description_clean":"Traspaso a Revolut","amount_signed":-500.00,"running_balance":2584.56,"movement":"TRANSFER","category_slug":"own_transfer","currency":"EUR"},
  {"posted_date":"2024-12-12","description_raw":"BIZUM A JUAN GARCIA","description_clean":"Bizum a Juan García","amount_signed":-30.00,"running_balance":2554.56,"movement":"EXPENSE","category_slug":"other_expense","currency":"EUR"}
]`;

const INVESTING_ANALYSIS_PROMPT = `You are an investment data extraction expert. Analyze investment platform statements and extract transaction data.

CRITICAL: Respond ONLY with a valid JSON array. No markdown, no explanation, just the JSON.

For each transaction, extract:
- posted_date: ISO format (YYYY-MM-DD)
- description_raw: Original description
- description_clean: Clean description of the investment activity
- amount_signed: Numeric value (positive for contributions/dividends, negative for withdrawals/fees)
- source_transaction_id: Platform transaction ID if visible
- movement: One of: INCOME, EXPENSE, TRANSFER
- category_slug: For TRANSFER only — 'to_investment' (contribution/buy) or 'own_transfer'
  (withdrawal to own account). Null for INCOME/EXPENSE — the app assigns detailed categories
  automatically.
- currency: Currency code (EUR, USD, etc.)

Movement guide:
- Contributions/deposits, buy/sell trades: TRANSFER (category_slug: to_investment)
- Withdrawals to own account: TRANSFER (category_slug: own_transfer)
- Dividends, interest received: INCOME (category_slug: null)
- Platform fees: EXPENSE (category_slug: null)

Example output:
[
  {"posted_date":"2024-12-15","description_raw":"Aporte mensual","description_clean":"Aporte mensual","amount_signed":500.00,"source_transaction_id":"TX123456","movement":"TRANSFER","category_slug":"to_investment","currency":"EUR"},
  {"posted_date":"2024-12-10","description_raw":"Dividendo Apple Inc AAPL","description_clean":"Dividendo Apple Inc","amount_signed":12.50,"source_transaction_id":null,"movement":"INCOME","category_slug":null,"currency":"USD"},
  {"posted_date":"2024-12-05","description_raw":"Comisión custodia","description_clean":"Comisión custodia mensual","amount_signed":-1.50,"source_transaction_id":null,"movement":"EXPENSE","category_slug":null,"currency":"EUR"}
]`;

// ========== POST-AI ROW VALIDATION ==========
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function validateAIRow(t: Record<string, unknown>): { valid: boolean; date?: string; amount?: number; reason?: string } {
  const dateRaw = (t.posted_date || t.date) as string | undefined;
  if (!dateRaw || typeof dateRaw !== 'string') return { valid: false, reason: 'missing_date' };

  let date = dateRaw.trim();
  if (!ISO_DATE_RE.test(date)) {
    const slashParts = date.split(/[/.-]/);
    if (slashParts.length === 3) {
      const [a, b, c] = slashParts.map(Number);
      if (a > 100) {
        date = `${a}-${String(b).padStart(2, '0')}-${String(c).padStart(2, '0')}`;
      } else if (c > 100) {
        const [day, month] = b > 12 ? [b, a] : [a, b];
        date = `${c}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
    if (!ISO_DATE_RE.test(date)) return { valid: false, reason: 'bad_date' };
  }

  const [y, m, d] = date.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1990 || y > 2100) {
    return { valid: false, reason: 'date_out_of_range' };
  }

  const amountRaw = t.amount_signed ?? t.amount;
  if (amountRaw === undefined || amountRaw === null) return { valid: false, reason: 'missing_amount' };
  const amount = typeof amountRaw === 'string' ? parseFloat(amountRaw) : Number(amountRaw);
  if (!Number.isFinite(amount)) return { valid: false, reason: 'bad_amount' };

  return { valid: true, date, amount };
}

// ========== ROBUST JSON PARSER ==========
function parseJsonFromAIResponse(rawContent: string): { transactions: any[] | null; error: string | null } {
  let jsonString = rawContent.trim();

  jsonString = jsonString.replace(/^```(?:json|JSON)?\s*\n?/g, '');
  jsonString = jsonString.replace(/\n?```\s*$/g, '');
  jsonString = jsonString.trim();

  if (!jsonString.startsWith('[') && !jsonString.startsWith('{')) {
    const arrayMatch = jsonString.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      jsonString = arrayMatch[0];
    } else {
      return { transactions: null, error: 'No JSON array found in response' };
    }
  }

  try {
    const parsed = JSON.parse(jsonString);
    if (Array.isArray(parsed)) return { transactions: parsed, error: null };
    if (parsed && typeof parsed === 'object') return { transactions: [parsed], error: null };
    return { transactions: null, error: 'Parsed result is not an array' };
  } catch {
    // Fall through to recovery.
  }

  console.log('[process-import] JSON parse failed, attempting recovery...');

  if (jsonString.startsWith('[')) {
    let depth = 0;
    let inString = false;
    let escape = false;
    let lastCompleteObject = -1;

    for (let i = 0; i < jsonString.length; i++) {
      const ch = jsonString[i];
      if (escape) { escape = false; continue; }
      if (ch === '\\' && inString) { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;

      if (ch === '[' || ch === '{') depth++;
      else if (ch === ']' || ch === '}') {
        depth--;
        if (depth === 1 && ch === '}') lastCompleteObject = i;
      }
    }

    if (lastCompleteObject > 0) {
      const recovered = jsonString.substring(0, lastCompleteObject + 1) + ']';
      try {
        const parsed = JSON.parse(recovered);
        if (Array.isArray(parsed)) {
          console.log(`[process-import] Recovered ${parsed.length} transactions from truncated JSON`);
          return { transactions: parsed, error: null };
        }
      } catch {
        // Recovery failed — fall through.
      }
    }
  }

  const objectPattern = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
  const objects: any[] = [];
  let match;
  while ((match = objectPattern.exec(jsonString)) !== null) {
    try {
      objects.push(JSON.parse(match[0]));
    } catch {
      // Skip malformed individual objects.
    }
  }
  if (objects.length > 0) {
    console.log(`[process-import] Extracted ${objects.length} transactions via object-level recovery`);
    return { transactions: objects, error: null };
  }

  return { transactions: null, error: 'Could not parse or recover JSON from AI response' };
}

// ========== CHUNKING LOGIC ==========
function splitIntoChunks(content: string): string[] {
  const chunks: string[] = [];

  const pagePattern = /---\s*Page\s*\d+\s*---/gi;
  const pages = content.split(pagePattern).filter(p => p.trim().length > 0);

  if (pages.length > 1) {
    let currentChunk = '';
    for (const page of pages) {
      if (currentChunk.length + page.length > MAX_CHUNK_SIZE && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = page;
      } else {
        currentChunk += '\n' + page;
      }
    }
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }
  } else {
    const lines = content.split('\n');
    const headerLine = lines.find(l => l.trim().length > 0) || '';
    const headerPrefix = headerLine ? headerLine + '\n' : '';

    let remaining = content;
    let isFirst = true;
    while (remaining.length > MAX_CHUNK_SIZE) {
      let breakPoint = remaining.lastIndexOf('\n', MAX_CHUNK_SIZE);
      if (breakPoint < MAX_CHUNK_SIZE / 2) {
        breakPoint = MAX_CHUNK_SIZE;
      }
      const raw = remaining.substring(0, breakPoint).trim();
      chunks.push(isFirst ? raw : headerPrefix + raw);
      remaining = remaining.substring(breakPoint).trim();
      isFirst = false;
    }
    if (remaining.length > 0) {
      chunks.push(isFirst ? remaining : headerPrefix + remaining);
    }
  }

  console.log(`[process-import] Split content into ${chunks.length} chunks`);
  return chunks;
}

// ========== AI CALL WITH RETRY ==========
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

async function callAIWithRetry(
  content: string,
  prompt: string,
  isLargeFile: boolean,
  retryCount = 0,
  imageContent?: Array<{ base64: string; mediaType: string }>,
): Promise<{ transactions: any[] | null; error: string | null; usage?: { input_tokens: number; output_tokens: number } }> {
  const maxRetries = 2;
  const isVision = !!imageContent && imageContent.length > 0;

  const timeLeft = remainingMs();
  if (timeLeft < 5_000) {
    return { transactions: null, error: 'Approaching edge function timeout — aborting AI call' };
  }

  const effectivePrompt = isLargeFile ? SIMPLE_EXTRACTION_PROMPT : prompt;
  const model = (isVision || isLargeFile || retryCount > 0) ? 'claude-sonnet-5' : 'claude-haiku-4-5-20251001';

  const userContent: any[] = [];
  if (isVision) {
    for (const img of imageContent!) {
      userContent.push({
        type: 'image',
        source: { type: 'base64', media_type: img.mediaType, data: img.base64 },
      });
    }
    userContent.push({
      type: 'text',
      text: 'Extract ALL transactions visible in these bank statement image(s). Read every row carefully — dates, descriptions, amounts, and balances.',
    });
  } else {
    userContent.push({
      type: 'text',
      text: `Extract ALL transactions from this financial data:\n\n${content}`,
    });
  }

  console.log(`[process-import] AI call attempt ${retryCount + 1}: model=${model}, isVision=${isVision}, contentLength=${content.length}, images=${imageContent?.length ?? 0}, isLargeFile=${isLargeFile}, timeLeftMs=${timeLeft}`);

  const controller = new AbortController();
  const fetchTimeout = Math.min(timeLeft - 3_000, 120_000);
  const timer = setTimeout(() => controller.abort(), fetchTimeout);

  let response: Response;
  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'x-api-key': ANTHROPIC_API_KEY ?? '',
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 16000,
        thinking: { type: 'disabled' },
        system: effectivePrompt,
        messages: [
          { role: 'user', content: userContent },
        ],
      }),
    });
  } catch (err: unknown) {
    clearTimeout(timer);
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('abort') || msg.includes('AbortError')) {
      console.error(`[process-import] AI call timed out after ${fetchTimeout}ms`);
      return { transactions: null, error: `AI call timed out (${Math.round(fetchTimeout / 1000)}s)` };
    }
    if (retryCount < maxRetries) {
      await new Promise(r => setTimeout(r, 1000 * (retryCount + 1)));
      return callAIWithRetry(content, prompt, isLargeFile, retryCount + 1, imageContent);
    }
    return { transactions: null, error: `AI fetch failed: ${msg}` };
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[process-import] AI API error: ${response.status} (model=${model})`, errorText);
    const detail = errorText.slice(0, 300);

    if (response.status === 401 || response.status === 402 || response.status === 403) {
      return { transactions: null, error: `API error: ${response.status} ${detail}` };
    }

    if (retryCount < maxRetries) {
      console.log(`[process-import] Retrying AI call after ${response.status} (escalating model)...`);
      await new Promise(r => setTimeout(r, 1000 * (retryCount + 1)));
      return callAIWithRetry(content, prompt, isLargeFile, retryCount + 1, imageContent);
    }

    return { transactions: null, error: `AI API error after retries: ${response.status} ${detail}` };
  }

  const aiData = await response.json();

  if (aiData.stop_reason === 'refusal') {
    return { transactions: null, error: 'AI declined to process the file' };
  }

  const rawContent = Array.isArray(aiData.content)
    ? aiData.content.find((b: any) => b.type === 'text')?.text
    : undefined;

  if (!rawContent) {
    return { transactions: null, error: 'No content in AI response' };
  }

  console.log(`[process-import] AI response length: ${rawContent.length}`);
  if (aiData.usage) {
    console.log(`[process-import] AI token usage: input=${aiData.usage.input_tokens}, output=${aiData.usage.output_tokens}, model=${model}`);
  }

  const result = parseJsonFromAIResponse(rawContent);

  if (result.error && retryCount < maxRetries) {
    console.log(`[process-import] Parse failed (${result.error}), retrying with pro model...`);
    console.log(`[process-import] Raw content preview: START>>>>${rawContent.substring(0, 300)}<<<<END`);
    console.log(`[process-import] Raw content end: START>>>>${rawContent.substring(Math.max(0, rawContent.length - 300))}<<<<END`);

    await new Promise(r => setTimeout(r, 1000));
    return callAIWithRetry(content, prompt, true, retryCount + 1, imageContent);
  }

  return { ...result, usage: aiData.usage };
}

// ========== MAIN EXTRACTION FUNCTION ==========

export interface ExtractionInput {
  fileContent: string | null;
  imageContent: Array<{ base64: string; mediaType: string }> | null;
  domain: string;
  csvResult: { transactions: any[]; delimiter: string; headerRow: number } | null;
}

export interface ExtractionResult {
  transactions: any[];
  aiInputTokens: number;
  aiOutputTokens: number;
  processingStrategy: string;
  lastAiError: string | null;
  error?: {
    type: 'payment_required' | 'rate_limited' | 'ai_processing_failed' | 'parse_failed';
    message: string;
    statusCode: number;
  };
}

export async function extractTransactions(input: ExtractionInput): Promise<ExtractionResult> {
  const { fileContent, imageContent, domain, csvResult } = input;
  const hasText = !!fileContent;
  const hasImages = Array.isArray(imageContent) && imageContent.length > 0;
  const isLargeFile = hasText && !csvResult && fileContent!.length > CHUNK_SIZE_THRESHOLD;
  const prompt = domain === 'INVESTING' ? INVESTING_ANALYSIS_PROMPT : CASHFLOW_ANALYSIS_PROMPT;

  let allTransactions: any[] = [];
  let aiInputTokens = 0;
  let aiOutputTokens = 0;
  let lastAiError: string | null = null;
  let processingStrategy = 'unknown';

  if (csvResult) {
    allTransactions = csvResult.transactions;
    processingStrategy = 'deterministic_csv';
    console.log(`[process-import] Skipped AI — deterministic parse: ${allTransactions.length} transactions`);
  } else if (hasImages) {
    processingStrategy = 'ai_vision';
    console.log(`[process-import] Vision mode: ${imageContent!.length} image(s)`);

    const result = await callAIWithRetry('', prompt, false, 0, imageContent!);
    aiInputTokens += result.usage?.input_tokens || 0;
    aiOutputTokens += result.usage?.output_tokens || 0;

    if (result.error) {
      console.error(`[process-import] AI processing failed: ${result.error}`);
      const errorType = result.error.includes('402') ? 'payment_required'
        : result.error.includes('429') ? 'rate_limited'
        : 'ai_processing_failed';
      const statusCode = errorType === 'payment_required' ? 402
        : errorType === 'rate_limited' ? 429 : 500;
      return {
        transactions: [], aiInputTokens, aiOutputTokens, processingStrategy, lastAiError: result.error,
        error: { type: errorType, message: result.error, statusCode },
      };
    }
    allTransactions = result.transactions || [];
  } else if (isLargeFile) {
    processingStrategy = 'ai_chunked_sonnet';
    console.log(`[process-import] Large file detected (${fileContent!.length} chars), using chunked processing`);

    const chunks = splitIntoChunks(fileContent!);
    const CHUNK_CONCURRENCY = 5;
    const chunkResults: Array<Awaited<ReturnType<typeof callAIWithRetry>>> = new Array(chunks.length);
    let nextChunk = 0;
    const runWorker = async () => {
      while (true) {
        const i = nextChunk++;
        if (i >= chunks.length) return;
        console.log(`[process-import] Processing chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)`);
        chunkResults[i] = await callAIWithRetry(chunks[i], prompt, true);
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(CHUNK_CONCURRENCY, chunks.length) }, () => runWorker()),
    );

    for (let i = 0; i < chunks.length; i++) {
      const result = chunkResults[i];
      aiInputTokens += result.usage?.input_tokens || 0;
      aiOutputTokens += result.usage?.output_tokens || 0;
      if (result.error) {
        console.error(`[process-import] Chunk ${i + 1} failed: ${result.error}`);
        lastAiError = result.error;
        continue;
      }
      if (result.transactions && result.transactions.length > 0) {
        allTransactions = allTransactions.concat(result.transactions);
        console.log(`[process-import] Chunk ${i + 1} extracted ${result.transactions.length} transactions (total: ${allTransactions.length})`);
      }
    }

    if (allTransactions.length === 0) {
      return {
        transactions: [], aiInputTokens, aiOutputTokens, processingStrategy, lastAiError,
        error: {
          type: 'parse_failed',
          message: lastAiError
            ? `AI extraction failed: ${lastAiError}`
            : 'No transactions extracted from the file',
          statusCode: 400,
        },
      };
    }
  } else {
    processingStrategy = 'ai_haiku';
    console.log(`[process-import] Small file (${fileContent!.length} chars), using single AI call`);

    const result = await callAIWithRetry(fileContent!, prompt, false);
    aiInputTokens += result.usage?.input_tokens || 0;
    aiOutputTokens += result.usage?.output_tokens || 0;

    if (result.error) {
      console.error(`[process-import] AI processing failed: ${result.error}`);
      const errorType = result.error.includes('402') ? 'payment_required'
        : result.error.includes('429') ? 'rate_limited'
        : 'ai_processing_failed';
      const statusCode = errorType === 'payment_required' ? 402
        : errorType === 'rate_limited' ? 429 : 500;
      return {
        transactions: [], aiInputTokens, aiOutputTokens, processingStrategy, lastAiError: result.error,
        error: { type: errorType, message: result.error, statusCode },
      };
    }
    allTransactions = result.transactions || [];
  }

  console.log(`[process-import] Total transactions parsed: ${allTransactions.length}`);
  return { transactions: allTransactions, aiInputTokens, aiOutputTokens, processingStrategy, lastAiError };
}
