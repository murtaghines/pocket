/**
 * ============================================================
 * TRANSACTION CATEGORIZER — CAPA 1
 * ============================================================
 * Languages  : Spanish (ES) + English (EN)
 * Countries  : España (ES) · Argentina (AR) · Chile (CL)
 *              Uruguay (UY) · United States (US)
 * Categories : 25 (2 TRANSFER · 7 INCOME · 16 EXPENSE)
 * Patterns   : ~2.500+
 *
 * ARCHITECTURE — NO OVERLAPS GUARANTEED:
 * Buckets are evaluated TOP → BOTTOM. First match wins.
 * Specific patterns are placed in EARLIER buckets.
 * When a merchant/keyword could belong to multiple categories,
 * the more specific bucket is placed first and uses negative
 * lookaheads to exclude the generic case further down.
 *
 * OVERLAP DECISIONS DOCUMENTED:
 *   AMAZON       → subscriptions if PRIME/MUSIC/VIDEO, else shopping
 *   REVOLUT      → to_investment if SAVINGS/VAULT, else own_transfer
 *   BOOKING      → rental_income if PAYOUT/DEPOSIT, else travel
 *   GAS          → housing if GAS NATURAL/NATURGAS, else transport
 *   PENSION      → to_investment if PLAN/APORTACION, else other_income
 *   MERCADO PAGO → sales(income) if COBRO/ACREDITACION, else shopping
 *   CAR RENTALS  → transport always (no context to distinguish vacation)
 *   IKEA/LEROY   → shopping always (housing = recurring services only)
 *   AFP/ISAPRE   → taxes (CL mandatory deductions treated as taxes)
 *   ABITAB/REDPAGOS → other_expense (bill aggregators, unknown payee)
 * ============================================================
 */

export type Movement = 'INCOME' | 'EXPENSE' | 'TRANSFER';

export type IncomeCategory =
  | 'salary'
  | 'freelance'
  | 'refunds'
  | 'sales'
  | 'investments_income'
  | 'gifts_received'
  | 'rental_income'
  | 'transfers_in'
  | 'other_income';

export type ExpenseCategory =
  | 'housing'
  | 'groceries'
  | 'restaurants'
  | 'transport'
  | 'health'
  | 'entertainment'
  | 'shopping'
  | 'education'
  | 'subscriptions'
  | 'travel'
  | 'sports'
  | 'pets'
  | 'gifts_given'
  | 'personal_services'
  | 'taxes'
  | 'family'
  | 'donations'
  | 'insurance'
  | 'other_expense';

export type TransferCategory = 'own_transfer' | 'to_investment' | 'to_joint_account';
export type Category = IncomeCategory | ExpenseCategory | TransferCategory;

export interface CategorizationResult {
  movement: Movement;
  category: Category;
  confidence: number;   // 0.80–0.99
  matchedRule: string;  // pattern that fired, for debugging
}

// ─────────────────────────────────────────────────────────────
// NORMALIZATION
// Mirrors what every bank does before we see the description.
// "Café & Bar Peña-Nieto 123" → "CAFE BAR PENANIETO 123" (hyphen between letters merges, doesn't space)
// ─────────────────────────────────────────────────────────────

// TLDs that show up glued to merchant names in bank descriptors (NETFLIX.COM,
// AMAZON.ES). Split out with a space BEFORE the H&M-style merge below, so the
// merge doesn't glue the merchant name to the TLD (NETFLIX.COM -> NETFLIXCOM,
// which breaks \b-anchored rules like 'NETFLIX\b' -- no boundary left to match).
// CAUTION when adding new rule patterns below: a rule like 'CRYPTOCOM\b' (glued
// form) will NOT match anymore now that the TLD splits out -- use 'CRYPTO\s*COM\b'
// style instead (imports-reviewer caught this exact regression for Crypto.com).
const GLUED_TLD = /\.(COM|NET|ORG|INFO|APP|IO|CO|ES|AR|CL|UY|MX)\b/g;

export function normalize(raw: string): string {
  return raw
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')                          // strip accents: é→e, ñ→n
    .replace(GLUED_TLD, ' $1')                                // NETFLIX.COM -> NETFLIX COM
    .replace(/(?<=[A-Z0-9])[^A-Z0-9\s]+(?=[A-Z0-9])/g, '')   // H&M→HM, 7-Eleven→7ELEVEN
    .replace(/[^A-Z0-9\s]/g, ' ')                             // remaining specials → space
    .replace(/\s+/g, ' ')
    .trim();
}

// ─────────────────────────────────────────────────────────────
// FUZZY TOKEN MATCHING
//
// Used for custom category keywords so that variations of a
// merchant name still match the user's defined keyword.
//
// APPROACH: stopwords-only filtering (NOT length-based).
//   Removes articles, prepositions, conjunctions.
//   Keeps everything else — including short but meaningful words:
//   HM (H&M), VET, GAS, BAR, YPF, DIA, AFP, BCI, UTE, OSE…
//
// NORMALIZATION: special chars between letters are collapsed:
//   "H&M" → "HM"  |  "7-Eleven" → "7ELEVEN"  |  "Co-op" → "COOP"
//
// THRESHOLD:
//   1–2 tokens in keyword → ALL must appear in description
//   3+  tokens in keyword → at least 2 must appear
//
// EXAMPLES:
//   "Clínica Vet López" → tokens ["CLINICA","VET","LOPEZ"]
//     "VET LOPEZ CONSULTA"    → 2/3 match ✓
//     "CLINICA DENTAL GARCIA" → 1/3 no match ✗
//     "LOPEZ FARMACIA"        → 1/3 no match ✗
//
//   "H&M Kids" → tokens ["HM","KIDS"]
//     "HM KIDS BARCELONA" → 2/2 match ✓
//     "HM STORE MADRID"   → 1/2 no match ✗
// ─────────────────────────────────────────────────────────────

/**
 * Words with no meaning in bank descriptions.
 * ONLY these are filtered out — everything else is kept,
 * including short abbreviations and brand siglas.
 */
const TOKEN_STOPWORDS = new Set<string>([
  // ES — articles
  'EL', 'LA', 'LOS', 'LAS', 'UN', 'UNA', 'UNOS', 'UNAS',
  // ES — prepositions
  'DE', 'DEL', 'AL', 'EN', 'CON', 'POR', 'PARA', 'SIN',
  'ANTE', 'BAJO', 'COMO', 'ENTRE', 'HASTA', 'HACIA', 'SEGUN', 'SOBRE', 'TRAS',
  // ES — conjunctions
  'Y', 'E', 'O', 'U', 'NI', 'QUE', 'SI', 'MAS', 'PERO', 'AUNQUE', 'PORQUE', 'PUES',
  // ES — pronouns / determiners
  'SU', 'SUS', 'MIS', 'TUS', 'SE', 'LE', 'LO', 'ME',
  'ESE', 'ESA', 'ESOS', 'ESAS', 'ESTE', 'ESTA',
  // ES — verbs common in descriptions
  'ES', 'SON', 'HAY', 'DA',
  // EN — articles
  'THE', 'A', 'AN',
  // EN — prepositions / conjunctions
  'OF', 'IN', 'AT', 'BY', 'TO', 'FOR', 'FROM', 'WITH',
  'ON', 'AS', 'UP', 'INTO', 'THAN', 'AND', 'OR', 'BUT',
  // EN — pronouns
  'IT', 'ITS', 'MY', 'YOUR',
]);

/**
 * Extract meaningful tokens from a description or keyword.
 * Removes only stopwords and pure numbers — keeps everything else,
 * including short abbreviations (HM, VET, GAS, YPF, DIA…).
 *
 * @example
 * extractTokens("H&M Kids")               → ["HM", "KIDS"]
 * extractTokens("Clínica Vet López")       → ["CLINICA", "VET", "LOPEZ"]
 * extractTokens("Gastos de la Mascota SA") → ["GASTOS", "MASCOTA", "SA"]
 * extractTokens("YPF Combustible 2024")    → ["YPF", "COMBUSTIBLE"]
 * extractTokens("Bar El Rincón de Paco")   → ["BAR", "RINCON", "PACO"]
 */
export function extractTokens(text: string): string[] {
  return normalize(text)
    .split(' ')
    .filter(w => !TOKEN_STOPWORDS.has(w) && !/^\d+$/.test(w));
}

/**
 * Fuzzy keyword match using token overlap.
 *
 * @param keyword     The user's keyword (e.g. "Clínica Vet López")
 * @param description The bank transaction description (raw or normalized)
 *
 * @example
 * fuzzyMatch("Clínica Vet López", "VET LOPEZ CONSULTA")
 * // → { matched: true,  score: 0.67, tokens: ["VET","LOPEZ"] }
 *
 * fuzzyMatch("H&M Kids", "HM KIDS BARCELONA")
 * // → { matched: true,  score: 1.0,  tokens: ["HM","KIDS"] }
 *
 * fuzzyMatch("Clínica Vet López", "LOPEZ FARMACIA")
 * // → { matched: false, score: 0.33, tokens: ["LOPEZ"] }
 */
export function fuzzyMatch(
  keyword: string,
  description: string,
): { matched: boolean; score: number; tokens: string[] } {
  const kwTokens = extractTokens(keyword);
  const descSet  = new Set(extractTokens(description));

  if (kwTokens.length === 0) return { matched: false, score: 0, tokens: [] };

  const matched = kwTokens.filter(t => descSet.has(t));
  const score   = matched.length / kwTokens.length;

  // 1–2 tokens → need ALL;  3+ tokens → need at least 2
  const required = kwTokens.length >= 3 ? 2 : kwTokens.length;

  return { matched: matched.length >= required, score, tokens: matched };
}


// ─────────────────────────────────────────────────────────────
// INTERNAL TYPES
// ─────────────────────────────────────────────────────────────

interface Rule {
  pattern: RegExp;
  label: string;
  confidence: number;
}

interface RuleBucket {
  movement: Movement;
  category: Category;
  rules: Rule[];
}

/** Compile an array of pattern strings into Rule objects. */
function r(patterns: string[], confidence = 0.97): Rule[] {
  return patterns.map(p => ({
    pattern: new RegExp(p, 'i'),
    label: p,
    confidence,
  }));
}

// ─────────────────────────────────────────────────────────────
// RULE BUCKETS
// ORDER MATTERS: evaluated top-to-bottom. First match wins.
// More-specific buckets MUST come before more-generic ones.
// ─────────────────────────────────────────────────────────────

const RULE_BUCKETS: RuleBucket[] = [

  // ══════════════════════════════════════════════════════════
  // INVESTMENTS_INCOME — checked FIRST, before any transfer rule
  //
  // WHY FIRST: "RENDIMIENTO FONDO COCOS" or "DIVIDENDO BALANZ"
  // contain broker names that would otherwise match to_investment.
  // Investment returns are INCOME (new money), not transfers.
  // By checking income keywords first, we ensure:
  //   "COCOS RENDIMIENTO OCTUBRE" → investments_income (INCOME)
  //   "COCOS CAPITAL TRANSFERENCIA" → to_investment (TRANSFER)
  // ══════════════════════════════════════════════════════════

  {
    movement: 'INCOME',
    category: 'investments_income',
    rules: r([
      // ES/LATAM — return/income keywords
      'DIVIDENDO\\b',
      'DIVIDENDOS\\b',
      'LIQUIDACION\\s*VALORES',
      'INTERESES\\s*DEPOSITO',
      'INTERES\\s*CUENTA\\s*AHORRO',
      'RENDIMIENTO\\b',           // "RENDIMIENTO FONDO COCOS" → income
      'RENDIMIENTO\\s*FONDO',
      'CUPON\\s*BONO',
      'VENTA\\s*ACCIONES',
      'VENTA\\s*FONDOS',
      'REEMBOLSO\\s*FONDO',
      'RESCATE\\s*FONDO',
      'LIQUIDACION\\s*FONDO',
      'PLUSVALIA\\b',
      'BENEFICIO\\s*INVERSION',
      'RENTABILIDAD\\b',
      'ACREDITACION\\s*PLAZO\\s*FIJO',
      'VENCIMIENTO\\s*PLAZO\\s*FIJO',
      'INTERESES\\s*PLAZO\\s*FIJO',
      'RENTA\\s*FIJA\\s*COBRO',
      'CAUCION\\s*COBRO',
      // AR specific
      'INTERESES\\s*FONDO\\s*COMUN',
      'FCI\\s*RESCATE',
      'LETES\\s*COBRO',
      'LECAP\\s*COBRO',
      // CL specific
      'APV\\s*RETIRO',
      'RESCATE\\s*APV',
      'FONDO\\s*MUTUO\\s*RESCATE',
      // EN
      'DIVIDEND\\b',
      'DIVIDENDS\\b',
      'INTEREST\\s*INCOME',
      'SAVINGS\\s*INTEREST',
      'INVESTMENT\\s*INCOME',
      'INVESTMENT\\s*RETURN',
      'CAPITAL\\s*GAIN',
      'STOCK\\s*DIVIDEND',
      'ETF\\s*DIVIDEND',
      'ETF\\s*DISTRIBUTION',
      'BOND\\s*COUPON',
      'BOND\\s*INTEREST',
      'FUND\\s*DISTRIBUTION',
      'PORTFOLIO\\s*INCOME',
      'STAKING\\s*REWARD',
      'CRYPTO\\s*INTEREST',
      'YIELD\\s*EARNED',
      '401K\\s*DISTRIBUTION',
      'IRA\\s*DISTRIBUTION',
      // EN — interest paid by neobanks / savings accounts
      'NET\\s*INTEREST\\s*PAID',
      'INTEREST\\s*PAID\\s*TO',
      'INTEREST\\s*EARNED',
      'INTEREST\\s*PAYMENT',
      'INTEREST\\s*CREDIT',
      'ANNUAL\\s*INTEREST',
      'MONTHLY\\s*INTEREST',
      'ACCRUED\\s*INTEREST',
    ], 0.99),
  },

  // ══════════════════════════════════════════════════════════
  // TRANSFER — checked after investments_income
  //
  // ARCHITECTURE:
  //   own_transfer  → money moving between user's own accounts.
  //                   Does NOT appear in expense dashboard.
  //                   Is a neutral movement.
  //
  //   to_investment → money sent to an investment platform.
  //                   Does NOT appear in expense dashboard.
  //                   Appears ONLY in the Investments module.
  //                   ("You sent $X to invest")
  //
  // KEY RULE: a Bizum / transfer TO ANOTHER PERSON is an EXPENSE
  // (gifts_given or other_expense), NOT a transfer.
  // own_transfer only fires when we can confirm the destination
  // is the user themselves — either by name match (injected at
  // runtime via UserContext) or by recognising a known personal
  // account / neobank keyword.
  //
  // Name-matching is handled OUTSIDE this static bucket list,
  // in the categorize() function which receives UserContext.
  // ══════════════════════════════════════════════════════════

  // ── TRANSFER → to_investment ──────────────────────────────
  // MUST come before own_transfer so "Revolut Savings" doesn't
  // fall into the generic Revolut → own_transfer rule.
  //
  // WHAT COUNTS as to_investment:
  //   • Named investment brokers / platforms
  //   • Named crypto exchanges
  //   • Savings/vault sub-accounts on neobanks (Revolut Savings,
  //     Monzo Pot, N26 Spaces…)
  //   • Generic keywords that only appear in investment contexts
  //     (e.g. "APORTE FONDO", "TRASPASO FONDOS")
  //
  // WHAT DOES NOT COUNT:
  //   • Generic "TRANSFERENCIA" without an investment name
  //   • AFP mandatory deductions → those go to taxes
  //   • Staking rewards / dividends → those go to investments_income
  {
    movement: 'TRANSFER',
    category: 'to_investment',
    rules: r([
      // ── ES: Brokers & robo-advisors ───────────────────────
      'TRADE\\s*REPUBLIC',
      'MYINVESTOR',
      'MY\\s*INVESTOR',
      'INDEXA\\s*CAPITAL',
      'FINIZENS',
      'INBESTME',
      'OPENBANK\\s*INVER',
      'SELFBANK\\s*INVER',
      'RENTA\\s*4\\b',
      'RENTA4\\b',
      'BANKINTER\\s*FONDOS',
      'CAIXABANK\\s*INVER',
      'SABADELL\\s*INVER',
      'SINGULAR\\s*BANK',
      'DIAPHANUM',
      'GROW\\s*LY',
      // ── AR: Brokers & investment platforms ────────────────
      'COCOS\\s*CAPITAL',
      'COCOS\\b',
      'BALANZ\\b',
      'IOL\\b',
      'INVERTIRONLINE',
      'PORTFOLIO\\s*PERSONAL',
      'PPI\\b',
      'BULL\\s*MARKET\\s*BROKER',
      'ALLARIA\\b',
      'FACIMEX\\b',
      'MEGAQM\\b',
      'CRITERIA\\b',
      'ADMIRAL\\s*MARKETS',
      // ── AR: Structured investment products ────────────────
      'FONDO\\s*COMUN',           // Fondo Común de Inversión
      'FCI\\b',
      'LETES\\b',
      'LECAP\\b',
      'BOPREAL\\b',
      'PLAZO\\s*FIJO',            // Fixed-term deposit AR/UY
      'DEPOSITO\\s*A\\s*PLAZO',
      'DEPOSITO\\s*PLAZO\\s*FIJO',
      'CAUCION\\b',               // Caución bursátil AR
      // ── CL: Brokers & investment platforms ────────────────
      'FINTUAL\\b',
      'BICE\\s*INVERSIONES',
      'CREDICORP\\s*CAPITAL',
      'BTG\\s*PACTUAL',
      'BTGPACTUAL\\b',
      'CAPITARIA\\b',
      'RENTA4\\s*CL',
      // ── CL: AFP voluntary contributions (not mandatory) ───
      // Mandatory AFP deductions → taxes. Voluntary APV → investment.
      'APV\\b',
      'SEGURO\\s*DE\\s*VIDA\\s*APV',
      'DEPOSITO\\s*APV',
      'APORTE\\s*VOLUNTARIO\\s*AFP',
      // ── UY: Investment platforms ──────────────────────────
      'NOBILIS\\b',
      'GLETIR\\b',
      'BEVSA\\b',
      'REPUBLICA\\s*AFAP',
      'AFAP\\b',
      'UNION\\s*CAPITAL\\s*AFAP',
      'SURA\\s*AFAP',
      'INTEGRACION\\s*AFAP',
      // ── US: Brokers & investment platforms ────────────────
      'VANGUARD\\b',
      'FIDELITY\\b',
      'SCHWAB\\b',
      'ROBINHOOD\\b',
      'WEBULL\\b',
      'TD\\s*AMERITRADE',
      'ETRADE\\b',
      'INTERACTIVE\\s*BROKERS',
      'IBKR\\b',
      'BETTERMENT\\b',
      'WEALTHFRONT\\b',
      'SOFI\\s*INVEST',
      'M1\\s*FINANCE',
      'ACORNS\\b',
      'STASH\\s*INVEST',
      'PUBLIC\\s*COM',
      'ALLY\\s*INVEST',
      '401K\\s*CONTRIBUTION',
      'IRA\\s*CONTRIBUTION',
      'ROTH\\s*IRA',
      'HSA\\s*CONTRIBUTION',
      // ── EU/Global: Brokers ────────────────────────────────
      'DEGIRO\\b',
      'ETORO\\b',
      'SCALABLE\\s*CAPITAL',
      'JUSTTRADE\\b',
      'SAXO\\s*BANK',
      'SWISSQUOTE\\b',
      'NUTMEG\\b',
      'MONEYFARM\\b',
      'MONEYBOX\\b',
      'WEALTHSIMPLE\\b',
      // ── Crypto exchanges ──────────────────────────────────
      'COINBASE\\b',
      'BINANCE\\b',
      'KRAKEN\\b',
      'BITPANDA\\b',
      'BITSTAMP\\b',
      'KUCOIN\\b',
      'BYBIT\\b',
      'OKEX\\b',
      'CRYPTO\\s*COM\\b', // was 'CRYPTOCOM\b' (glued form); "CRYPTO.COM" normalizes to "CRYPTO COM" now
      'GEMINI\\s*CRYPTO',
      'HUOBI\\b',
      'BITFINEX\\b',
      'BELO\\b',
      'LEMON\\s*CASH',
      'BUENBIT\\b',
      'BITSO\\b',
      'RIPIO\\b',
      'SATOSHI\\s*TANGO',
      // ── Crypto keywords (only when clearly a purchase/transfer)
      'BITCOIN\\s*PURCHASE',
      'CRYPTO\\s*PURCHASE',
      'CRYPTO\\s*TRANSFER',
      'CRYPTOCURRENCY\\s*PURCHASE',
      // ── Neobank sub-accounts tagged as investments ─────────
      // (these are savings/investment sub-pockets, not the main account)
      'REVOLUT\\s*SAVINGS',
      'REVOLUT.*VAULT',
      'REVOLUT.*INSTANT\\s*ACCESS',
      'MONZO\\s*POT',
      'MONZO\\s*SAVINGS',
      'STARLING\\s*SAVINGS',
      'N26\\s*SPACES',
      'CUENTA\\s*REMUNERADA',
      'CUENTA\\s*AHORRO\\s*PLUS',
      // ── Generic savings sub-account keywords (without bank prefix) ─
      'TO\\s*INSTANT\\s*ACCESS\\s*SAVINGS',
      'TO\\s*SAVINGS\\s*ACCOUNT',
      'TO\\s*SAVINGS\\s*POT',
      'INSTANT\\s*ACCESS\\s*SAVINGS(?!.*INTEREST)(?!.*PAID)',
      // ── Generic investment movement keywords ──────────────
      // Only phrases that unambiguously mean "moving money to invest"
      'TRASPASO\\s*FOND',
      'SUSCRIPCION\\s*FONDO',
      'APORTACION\\s*FONDO',
      'APORTE\\s*FONDO',
      'APORTE\\s*AL\\s*FONDO',
      'FONDOS\\s*DE\\s*INVERSION',
      'FONDO\\s*DE\\s*INVERSION',
      'PLAN\\s*DE\\s*PENSIONES',
      'APORTACION\\s*PLAN\\s*PENSION',
      'APORTE\\s*PENSION\\s*VOLUNTARIA',
      'INVESTMENT\\s*TRANSFER',
      'BROKERAGE\\s*TRANSFER',
      'PENSION\\s*TRANSFER',
      'PENSION\\s*FUND\\s*TRANSFER',
      'STOCKS\\s*AND\\s*SHARES\\s*ISA',
      'ISA\\s*TRANSFER',
    ], 0.99),
  },

  // ── TRANSFER → to_joint_account ───────────────────────────
  //
  // Money sent to a shared/joint account. Expenses from this
  // account are split by a configurable percentage (default 50%).
  // The destination is recognized by joint account holder names
  // injected at runtime via UserContext.joint_account_names.
  //
  // Static patterns here catch generic joint account keywords.
  {
    movement: 'TRANSFER',
    category: 'to_joint_account',
    rules: r([
      'CUENTA\\s*CONJUNTA',
      'CUENTA\\s*COMPARTIDA',
      'JOINT\\s*ACCOUNT',
      'SHARED\\s*ACCOUNT',
      'CONTA\\s*CONJUNTA',
      'CONTA\\s*COMPARTILHADA',
    ], 0.95),
  },

  // ── TRANSFER → own_transfer ───────────────────────────────
  //
  // WHAT COUNTS as own_transfer:
  //   • User's own name detected in description (handled in
  //     categorize() at runtime via UserContext — see below)
  //   • Known neobank / fintech app transfers (Revolut main
  //     account, Wise, N26, MODO, Uala, Zelle…)
  //   • "DESDE [bank name]" / "A [bank name]" patterns
  //   • Explicit self-transfer keywords ("traspaso entre cuentas")
  //   • Generic SEPA / Faster Payments / TEF at LOW confidence
  //     (0.75) so ML can override when it sees a third-party name
  //
  // WHAT DOES NOT COUNT:
  //   • "Bizum a [someone else]" → EXPENSE / gifts_given
  //   • "Transferencia a [company]" → likely EXPENSE
  //   • Named investment platforms → to_investment (above)
  {
    movement: 'TRANSFER',
    category: 'own_transfer',
    rules: [
      // ── Explicit self-transfer phrases (high confidence) ──
      ...r([
        'TRASPASO\\s*ENTRE\\s*CUENTAS',
        'TRANSFERENCIA\\s*PROPIA',
        'TRANSFERENCIA\\s*ENTRE\\s*CUENTAS',
        'TRANSFERENCIA\\s*CUENTA\\s*PROPIA',
        'AUTOTRANSFERENCIA',
        'TRASPASO\\s*INTERNO',
        'MOVIMIENTO\\s*INTERNO',
        'TRANSFERENCIA\\s*PERSONAL',
        'ENVIO\\s*PROPIO',
        'PASE\\s*ENTRE\\s*CUENTAS',
        'OWN\\s*TRANSFER',
        'INTERNAL\\s*TRANSFER',
        'SELF\\s*TRANSFER',
        'ACCOUNT\\s*TO\\s*ACCOUNT',
        'INTER\\s*ACCOUNT\\s*TRANSFER',
        'BETWEEN\\s*MY\\s*ACCOUNTS',
        'BETWEEN\\s*ACCOUNTS',
        'TRANSFER\\s*TO\\s*MY\\s*SAVINGS',
        'TRANSFER\\s*TO\\s*MY\\s*CURRENT',
        'TRANSFER\\s*TO\\s*MY\\s*CHECKING',
      ], 0.99),

      // ── Named neobanks / cross-border fintechs ────────────
      // Transfers to/from these are almost always own-account moves.
      // Specific sub-accounts (Revolut Savings, Monzo Pot) are
      // already caught by to_investment above.
      ...r([
        'REVOLUT(?!.*SAVINGS)(?!.*VAULT)(?!.*INSTANT)',
        'WISE\\b',
        'TRANSFERWISE\\b',
        'N26\\b',
        'MONZO(?!.*POT)(?!.*SAVINGS)',
        'STARLING(?!.*SAVINGS)',
        'BUNQ\\b',
        'CHIME\\b',
        'BNEXT\\b',
        'IMAGIN\\b',
        'COINC\\b',
        'PIBANK\\b',
        'VIVID\\b',
        'PAYSEND\\b',
        'REMITLY\\b',
        'WORLDREMIT\\b',
        'XOOM\\b',
      ], 0.90),

      // ── AR: Own fintech / wallet accounts ─────────────────
      ...r([
        'MERCADO\\s*PAGO(?!.*COBRO)(?!.*ACREDITACION)(?!.*VENTA)',
        'MODO\\b',
        'CUENTA\\s*DNI',
        'BRUBANK\\b',
        'UALA\\b',
        'NARANJA\\s*X',
        'PERSONAL\\s*PAY',
        'BIND\\b',
        'WILOBANK\\b',
        'PREX\\b',
      ], 0.90),

      // ── CL: Own fintech / wallet accounts ─────────────────
      ...r([
        'MACH\\b',
        'FPAY\\b',
        'TENPO\\b',
        'KHIPU\\b',
        'WEBPAY(?!.*COMPRA)(?!.*PAGO)',
      ], 0.90),

      // ── UY: Own fintech accounts ──────────────────────────
      ...r([
        'MIDINERO\\b',
        'OCA\\s*TRANSFER',
      ], 0.90),

      // ── US: P2P (own account context) ─────────────────────
      // Note: Zelle/Venmo to ANOTHER person = EXPENSE (gifts_given).
      // These patterns only match when there's NO third-party name.
      // The name-detection logic in categorize() handles that.
      ...r([
        'ZELLE\\b',
        'VENMO(?!.*PAYMENT\\s*RECEIVED)(?!.*PURCHASE)',
        'CASH\\s*APP(?!.*PURCHASE)',
        'PAYPAL(?!.*PURCHASE)(?!.*PAYMENT)(?!.*REFUND)',
        'APPLE\\s*CASH',
        'GOOGLE\\s*PAY(?!.*PURCHASE)',
      ], 0.85),

      // ── "DESDE [bank]" — incoming from own bank ───────────
      ...r([
        // ES
        'DESDE\\s*BBVA',
        'DESDE\\s*SANTANDER',
        'DESDE\\s*CAIXABANK',
        'DESDE\\s*LA\\s*CAIXA',
        'DESDE\\s*SABADELL',
        'DESDE\\s*BANKINTER',
        'DESDE\\s*ING\\b',
        'DESDE\\s*ING\\s*DIRECT',
        'DESDE\\s*UNICAJA',
        'DESDE\\s*IBERCAJA',
        'DESDE\\s*KUTXABANK',
        'DESDE\\s*ABANCA',
        'DESDE\\s*OPENBANK',
        'DESDE\\s*EVO\\s*BANCO',
        'DESDE\\s*CAJAMAR',
        'DESDE\\s*CAJASUR',
        'DESDE\\s*LABORAL\\s*KUTXA',
        // AR
        'DESDE\\s*GALICIA',
        'DESDE\\s*NACION',
        'DESDE\\s*BANCO\\s*NACION',
        'DESDE\\s*PROVINCIA',
        'DESDE\\s*MACRO',
        'DESDE\\s*PATAGONIA',
        'DESDE\\s*SUPERVIELLE',
        'DESDE\\s*CREDICOOP',
        // CL
        'DESDE\\s*BANCO\\s*ESTADO',
        'DESDE\\s*BCI\\b',
        'DESDE\\s*SCOTIABANK\\s*CL',
        'DESDE\\s*FALABELLA\\s*BANCO',
        'DESDE\\s*ITAU\\s*CL',
        'DESDE\\s*SANTANDER\\s*CL',
        // UY
        'DESDE\\s*BROU\\b',
        'DESDE\\s*BANCO\\s*REPUBLICA',
        'DESDE\\s*SANTANDER\\s*UY',
        'DESDE\\s*ITAU\\s*UY',
        'DESDE\\s*BANDES\\b',
      ], 0.90),

      // ── NOTE: Generic "TRANSFERENCIA RECIBIDA/EMITIDA", "BIZUM RECIBIDO/ENVIADO" ──
      // These are NOT included here because they could be to/from third parties.
      // Only explicit self-transfer phrases (above) should match own_transfer.
      // Generic transfers fall through to AI which classifies based on amount sign
      // and counterparty context.
    ],
  },

  // ══════════════════════════════════════════════════════════
  // INCOME
  // Ordered: most-specific first to avoid misfires.
  // ══════════════════════════════════════════════════════════

  // ── income / rental_income ────────────────────────────────
  // Before generic BOOKING → travel rule.
  {
    movement: 'INCOME',
    category: 'rental_income',
    rules: r([
      'BOOKING\\s*PAYOUT',
      'BOOKING\\s*DEPOSIT',
      'AIRBNB\\s*PAYOUT',
      'AIRBNB\\s*DEPOSIT',
      'VRBO\\s*PAYOUT',
      'VRBO\\s*DEPOSIT',
      'ALQUILER\\s*COBRADO',
      'RENTA\\s*ALQUILER\\s*COBRO',
      'INGRESO\\s*ALQUILER',
      'ARRENDAMIENTO\\s*COBRO',
      'RENTAS\\s*INMUEBLE',
      'COBRO\\s*ALQUILER',
      'PAGO\\s*INQUILINO',
      'RENTAL\\s*INCOME',
      'RENT\\s*RECEIVED',
      'RENT\\s*PAYMENT\\s*FROM',
      'TENANT\\s*PAYMENT',
      'LETTING\\s*INCOME',
      'PROPERTY\\s*INCOME',
      'LANDLORD\\s*INCOME',
    ], 0.99),
  },

  // ── income / sales ────────────────────────────────────────
  // MERCADO PAGO COBRO before generic Mercado Pago → own_transfer.
  {
    movement: 'INCOME',
    category: 'sales',
    rules: r([
      // AR: Mercado Pago income
      'MERCADO\\s*PAGO\\s*COBRO',
      'MERCADO\\s*PAGO\\s*ACREDITACION',
      'MERCADO\\s*PAGO\\s*VENTA',
      'ACREDITACION\\s*MERCADO\\s*PAGO',
      'MERCADOLIBRE\\s*COBRO',
      'MERCADOLIBRE\\s*VENTA',
      'ML\\s*PAGO\\s*VENDEDOR',
      // CL
      'FLOW\\s*COBRO',
      'WEBPAY\\s*COBRO',
      'GETNET\\s*COBRO',
      // US
      'PAYPAL\\s*PAYMENT\\s*RECEIVED',
      'PAYPAL\\s*DEPOSIT',
      'VENMO\\s*PAYMENT\\s*RECEIVED',
      'STRIPE\\s*PAYOUT',
      'STRIPE\\s*TRANSFER',
      'SQUARE\\s*DEPOSIT',
      'SQUARE\\s*PAYOUT',
      'SHOPIFY\\s*PAYOUT',
      'ETSY\\s*DEPOSIT',
      'ETSY\\s*PAYMENT\\s*RECEIVED',
      'AMAZON\\s*SELLER\\s*PAYOUT',
      'AMAZON\\s*SELLER\\s*DISBURSEMENT',
      'EBAY\\s*PAYOUT',
      'EBAY\\s*PAYMENT\\s*RECEIVED',
      // ES/LATAM
      'VENTA\\s*WALLAPOP',
      'WALLAPOP\\s*PAGO',
      'VINTED\\s*PAYOUT',
      'VENTA\\s*VINTED',
      'DEPOP\\s*PAYMENT',
      'SUBASTA\\s*COBRO',
      'MARKETPLACE\\s*COBRO',
      'MARKETPLACE\\s*PAYOUT',
      'SELLING\\s*INCOME',
    ], 0.97),
  },

  // ── income / salary ───────────────────────────────────────
  {
    movement: 'INCOME',
    category: 'salary',
    rules: r([
      // ES/LATAM
      'NOMINA\\b',
      'SALARIO\\b',
      'SUELDO\\b',
      'HABERES\\b',
      'RETRIBUCION\\b',
      'REMUNERACION\\b',
      'MENSUALIDAD\\s*EMPRESA',
      'PAGA\\s*EXTRA',
      'PAGA\\s*DE\\s*NAVIDAD',
      'AGUINALDO\\b',            // LATAM 13th salary
      'LIQUIDACION\\s*LABORAL',
      'FINIQUITO\\b',
      'LIQUIDACION\\s*FINAL',
      'GRATIFICACION\\s*LEGAL',  // CL legal bonus
      'PLUS\\s*PRODUCTIVIDAD',
      'COMPLEMENTO\\s*SALARIAL',
      'ANTICIPO\\s*NOMINA',
      'ANTICIPO\\s*SUELDO',
      'SUELDO\\s*QUINCENA',
      'QUINCENA\\b',
      'JORNAL\\b',
      'ACREDITACION\\s*HABERES',
      'ACRED\\s*HABERES',
      'SUELDO\\s*BASICO',
      // EN
      'SALARY\\b',
      'PAYROLL\\b',
      'WAGES\\b',
      'WAGE\\s*PAYMENT',
      'EMPLOYMENT\\s*INCOME',
      'MONTHLY\\s*PAY',
      'WEEKLY\\s*PAY',
      'BIWEEKLY\\s*PAY',
      'FORTNIGHTLY\\s*PAY',
      'PAYCHECK\\b',
      'PAYSTUB\\b',
      'PAYDAY\\b',
      'DIRECT\\s*DEPOSIT\\s*PAYROLL',
      'EMPLOYER\\s*PAYMENT',
      'STAFF\\s*SALARY',
      'BONUS\\s*PAYMENT',
      'ANNUAL\\s*BONUS',
      'SIGNING\\s*BONUS',
      'PERFORMANCE\\s*BONUS',
      'COMMISSION\\s*INCOME',
      'COMMISSION\\s*PAYMENT',
    ], 0.99),
  },

  // ── income / freelance ────────────────────────────────────
  {
    movement: 'INCOME',
    category: 'freelance',
    rules: r([
      // ES/LATAM
      'FACTURA\\s*EMITIDA',
      'HONORARIOS\\b',
      'AUTONOMO\\b',
      'MONOTRIBUTO\\s*COBRO',    // AR self-employed income
      'INGRESO\\s*PROYECTO',
      'PAGO\\s*PROYECTO',
      'TRABAJO\\s*FREELANCE',
      'SERVICIOS\\s*PROFESIONALES',
      'MINUTA\\b',
      'PRESTACION\\s*SERVICIOS',
      'COBRO\\s*FACTURA',
      'HONORARIO\\s*PROFESIONAL',
      'BOLETA\\s*HONORARIO',     // CL freelance invoice
      'BOLETA\\s*HONORARIOS',
      // EN
      'FREELANCE\\b',
      'CONTRACT\\s*PAYMENT',
      'CONTRACTOR\\s*FEE',
      'CONSULTING\\s*FEE',
      'INVOICE\\s*PAYMENT',
      'INVOICE\\s*RECEIVED',
      'CLIENT\\s*PAYMENT',
      'PROJECT\\s*PAYMENT',
      'PROFESSIONAL\\s*FEE',
      // Freelance platforms
      'UPWORK\\s*PAYMENT',
      'UPWORK\\s*WITHDRAWAL',
      'FIVERR\\s*WITHDRAWAL',
      'FIVERR\\s*PAYMENT',
      'TOPTAL\\s*PAYMENT',
      'MALT\\s*PAGO',
      'MALT\\s*PAYMENT',
      'WORKANA\\s*COBRO',        // LATAM freelance platform
      'FREELANCER\\s*WITHDRAWAL',
      'GURU\\s*PAYMENT',
      'PEOPLE\\s*PER\\s*HOUR',
    ], 0.95),
  },

  // ── income / refunds ──────────────────────────────────────
  {
    movement: 'INCOME',
    category: 'refunds',
    rules: r([
      // ES/LATAM
      'DEVOLUCION\\b',
      'REEMBOLSO\\b',
      'ABONO\\s*DEVOLUCION',
      'CARGO\\s*ANULADO',
      'ANULACION\\s*CARGO',
      'ANULACION\\s*COBRO',
      'COMPENSACION\\b',
      'REINTEGRO\\b',
      'RECTIFICACION\\b',
      'CORRECCION\\s*CARGO',
      'NOTA\\s*DE\\s*CREDITO',   // LATAM credit note
      'ACREDITACION\\s*DEVOLUCION',
      'DEVOLUCION\\s*COMPRA',
      'DEVOLUCION\\s*IVA',
      'DEVOLUCION\\s*HACIENDA',
      'DEVOLUCION\\s*SII',       // CL tax refund
      'DEVOLUCION\\s*DGI',       // UY tax refund
      'DEVOLUCION\\s*AFIP',      // AR tax refund
      'REINTEGRO\\s*IMPUESTO',
      'CASHBACK\\b',
      'BONIFICACION\\s*BANCO',
      'CASH\\s*BACK',
      // EN
      'REFUND\\b',
      'CHARGEBACK\\b',
      'REVERSAL\\b',
      'CREDIT\\s*REVERSAL',
      'RETURN\\s*CREDIT',
      'PRICE\\s*ADJUSTMENT',
      'PARTIAL\\s*REFUND',
      'FULL\\s*REFUND',
      'PURCHASE\\s*REFUND',
      'ORDER\\s*REFUND',
      'AMAZON\\s*REFUND',
      'PAYPAL\\s*REFUND',
      'STRIPE\\s*REFUND',
      'KLARNA\\s*REFUND',
      'TAX\\s*REFUND',
      'TAX\\s*RETURN\\s*CREDIT',
      'IRS\\s*REFUND',
      'HMRC\\s*REFUND',
    ], 0.99),
  },

  // ── income / other_income ─────────────────────────────────
  {
    movement: 'INCOME',
    category: 'other_income',
    rules: r([
      // ES: Public benefits
      'PRESTACION\\s*DESEMPLEO',
      'PARO\\b',
      'SUBSIDIO\\b',
      'BECA\\b',
      'AYUDA\\s*PUBLICA',
      'SUBVENCION\\b',
      'PRESTACION\\s*MATERNIDAD',
      'PRESTACION\\s*PATERNIDAD',
      'PRESTACION\\s*INCAPACIDAD',
      'INCAPACIDAD\\s*TEMPORAL',
      'PENSION\\s*JUBILACION',
      'PENSION\\s*VIUDEDAD',
      'PENSION\\s*ORFANDAD',
      'PENSION\\s*NO\\s*CONTRIBUTIVA',
      'INGRESO\\s*MINIMO\\s*VITAL',
      'ERTE\\b',
      // AR: Public benefits
      'ANSES\\b',
      'ASIGNACION\\s*FAMILIAR',
      'AUH\\b',                  // Asignación Universal por Hijo
      'JUBILACION\\b',
      'PENSION\\s*ANSES',
      'AYUDA\\s*SOCIAL',
      'IFE\\b',                  // Ingreso Familiar de Emergencia
      'ALIMENTAR\\b',
      // CL: Public benefits
      'BONO\\s*GOBIERNO',
      'BONO\\s*COVID',
      'IFE\\s*CL',
      'SUBSIDIO\\s*CL',
      'PENSIONES\\s*SOLIDARIAS',
      'PBS\\b',                  // Pensión Básica Solidaria
      // UY: Public benefits
      'BPS\\s*JUBILACION',
      'BPS\\s*PENSION',
      'ASIGNACIONES\\s*FAMILIARES',
      // EN: Public benefits
      'UNIVERSAL\\s*CREDIT',
      'JOBSEEKER',
      'JSA\\b',
      'ESA\\b',
      'PIP\\b',
      'CHILD\\s*BENEFIT',
      'WORKING\\s*TAX\\s*CREDIT',
      'HOUSING\\s*BENEFIT',
      'PENSION\\s*CREDIT',
      'SOCIAL\\s*SECURITY\\s*BENEFIT',
      'SOCIAL\\s*SECURITY\\s*PAYMENT',
      'DISABILITY\\s*BENEFIT',
      'WELFARE\\s*PAYMENT',
      'GOVERNMENT\\s*GRANT',
      'STIMULUS\\s*CHECK',       // US
      'UNEMPLOYMENT\\s*BENEFIT',
      'UNEMPLOYMENT\\s*INSURANCE',
      // Education income
      'BURSARY\\b',
      'SCHOLARSHIP\\b',
      'STUDENT\\s*LOAN\\s*PAYMENT',
      'GRANT\\s*PAYMENT',
    ], 0.95),
  },

  // ── income / gifts_received ───────────────────────────────
  {
    movement: 'INCOME',
    category: 'gifts_received',
    rules: r([
      'REGALO\\s*RECIBIDO',
      'DONACION\\s*RECIBIDA',
      'HERENCIA\\b',
      'DONATIVO\\s*RECIBIDO',
      'GIFT\\s*RECEIVED',
      'MONETARY\\s*GIFT',
      'BIRTHDAY\\s*MONEY',
      'INHERITANCE\\b',
    ], 0.80),
  },


  // ── income / transfers_in ─────────────────────────────────
  // Generic incoming Bizum / transfer from a third party.
  // LOW priority: only fires if no more specific income rule
  // (salary, sales, refunds, rents, gifts…) matched first.
  // The sign-first guardrail in process-import ensures this
  // only applies to positive amounts.
  {
    movement: 'INCOME',
    category: 'transfers_in',
    rules: r([
      'BIZUM\\s*DE\\b',
      'BIZUM\\s*RECIBIDO',
      'BIZUM\\s*A\\s*FAVOR',
      'TRANSFERENCIA\\s*RECIBIDA',
      'TRANSFERENCIA\\s*A\\s*FAVOR',
      'TRANSFERENCIA\\s*INMEDIATA\\s*A\\s*FAVOR',
      'TRANSFERENCIA\\s*INMEDIATA\\s*DE\\b',
      'TRANSFERENCIA\\s*DE\\b',
      'TRANSF\\s*DE\\b',
      'INGRESO\\s*TRANSFERENCIA',
      'INGRESO\\s*DE\\s*TRANSFERENCIA',
      'INCOMING\\s*TRANSFER',
      'TRANSFER\\s*RECEIVED',
      'WIRE\\s*RECEIVED',
      'ZELLE\\s*RECEIVED',
      'VENMO\\s*RECEIVED',
      'TWINT\\s*RECEIVED',
    ], 0.70),
  },
  // ══════════════════════════════════════════════════════════
  // EXPENSE
  // Most-specific first. No pattern should appear in two buckets.
  // ══════════════════════════════════════════════════════════

  // ── expense / taxes ───────────────────────────────────────
  // Must come before housing (avoids IBI → housing conflict if
  // the pattern description also contains address keywords).
  {
    movement: 'EXPENSE',
    category: 'taxes',
    rules: r([
      // ── ES ────────────────────────────────────────────────
      'AGENCIA\\s*TRIBUTARIA',
      'AEAT\\b',
      'HACIENDA\\b',
      'IRPF\\b',
      'MODELO\\s*[0-9]{3}\\b',   // Modelo 100, 130, 303, 390, etc.
      'AUTOLIQUIDACION\\b',
      'DECLARACION\\s*RENTA',
      'CUOTA\\s*AUTONOMO',
      'REGIMEN\\s*AUTONOMO',
      'SEGURIDAD\\s*SOCIAL\\s*CUOTA',
      'CUOTA\\s*SS\\b',
      'COTIZACION\\s*SS',
      'TESORERIA\\s*GENERAL',
      'TGSS\\b',
      'IBI\\b',                  // Impuesto Bienes Inmuebles (property tax)
      'IMPUESTO\\s*BIENES\\s*INMUEB',
      'IMPUESTO\\s*SOBRE\\s*LA\\s*RENTA',
      'IMPUESTO\\s*TRANSMISIONES',
      'ITP\\b',
      'AJD\\b',
      'IMPUESTO\\s*SOCIEDADES',
      'PLUSVALIA\\s*MUNICIPAL',
      'TASA\\s*BASURAS',
      'TASA\\s*MUNICIPAL',
      'TRIBUTOS\\s*MUNICIPALES',
      'RECIBO\\s*BASURAS',
      'EMBARGO\\s*HACIENDA',
      'SANCION\\s*HACIENDA',
      'SANCION\\s*DGT',
      'MULTA\\s*DGT',
      'MULTA\\s*TRAFICO',
      'DGT\\s*MULTA',
      'ORA\\s*MULTA',            // Ordenación del Tráfico Ayuntamiento
      // ── AR ────────────────────────────────────────────────
      'AFIP\\b',
      '\\bARCA\\b',                 // Nueva denominación de AFIP (word boundary to avoid LAMARCA)
      'ARBA\\b',                 // Agencia Recaudación Buenos Aires
      'AGIP\\b',                 // Administración Gubernamental Ingresos Públicos CABA
      'DGR\\b',                  // Dirección General de Rentas (provincias)
      'INGRESOS\\s*BRUTOS',
      'IIBB\\b',
      'MONOTRIBUTO\\b',
      'IMPUESTO\\s*GANANCIAS',
      'BIENES\\s*PERSONALES',
      'IVA\\s*AFIP',
      'AUTOMOTOR\\s*PATENTE',
      'PATENTE\\s*VEHICULO',
      'ABL\\b',                  // Alumbrado Barrido y Limpieza CABA
      'TGI\\b',                  // Tasa General de Inmuebles
      'IMPUESTO\\s*INMOBILIARIO',
      'SELLOS\\b',               // Impuesto de Sellos AR
      // ── CL ────────────────────────────────────────────────
      'SII\\b',                  // Servicio Impuestos Internos
      'TGR\\b',                  // Tesorería General República
      'CONTRIBUCIONES\\s*BIENES\\s*RAICES',
      'PPM\\b',                  // Pagos Provisionales Mensuales CL
      'IMPUESTO\\s*RENTA\\s*CL',
      'F22\\b',                  // Formulario 22 declaración renta CL
      'F29\\b',                  // IVA mensual CL
      'AFP\\s*OBLIGATORIO',      // AFP obligatorio → taxes (not investment)
      'AFP\\s*DESCUENTO',
      'DESCUENTO\\s*AFP',
      'ISAPRE\\b',               // CL health insurance mandatory deduction
      'FONASA\\b',               // CL public health mandatory deduction
      'INP\\b',                  // Instituto Normalización Previsional CL
      'PREVISION\\s*SOCIAL',
      'COTIZACION\\s*AFP',
      'COTIZACION\\s*ISAPRE',
      // ── UY ────────────────────────────────────────────────
      'DGI\\b',                  // Dirección General Impositiva UY
      'BPS\\s*PAGO',             // Banco de Previsión Social UY (contributions)
      'BPS\\s*APORTE',
      'APORTE\\s*BPS',
      'IRPF\\s*UY',
      'IRAE\\b',                 // Impuesto Rentas Actividades Económicas UY
      'IVA\\s*DGI',
      'IRNR\\b',                 // Impuesto Rentas No Residentes UY
      'FONDES\\b',
      'IMPUESTO\\s*PATRIMONIO',
      // ── US ────────────────────────────────────────────────
      'IRS\\s*PAYMENT',
      'IRS\\s*TAX',
      'FEDERAL\\s*TAX\\s*PAYMENT',
      'STATE\\s*TAX\\s*PAYMENT',
      'PROPERTY\\s*TAX',
      'REAL\\s*ESTATE\\s*TAX',
      'PAYROLL\\s*TAX',
      'FICA\\b',
      'SELF\\s*EMPLOYMENT\\s*TAX',
      'ESTIMATED\\s*TAX',
      'QUARTERLY\\s*TAX',
      // ── UK ────────────────────────────────────────────────
      'HMRC\\s*PAYMENT',
      'HMRC\\s*SELF\\s*ASSESSMENT',
      'SELF\\s*ASSESSMENT\\s*TAX',
      'COUNCIL\\s*TAX',
      'VAT\\s*PAYMENT',
      'NATIONAL\\s*INSURANCE\\s*CONTRIBUTION',
      'NIC\\s*PAYMENT',
    ], 0.99),
  },

  // ── expense / housing ─────────────────────────────────────
  // Note: IBI is handled in taxes above. GAS NATURAL → housing,
  // but bare GAS is reserved for transport (gas station).
  {
    movement: 'EXPENSE',
    category: 'housing',
    rules: r([
      // Rent & mortgage ES/LATAM
      'ALQUILER\\b',
      'RENTA\\s*MENSUAL\\s*VIVIENDA',
      'PAGO\\s*ALQUILER',
      'RECIBO\\s*ALQUILER',
      'HIPOTECA\\b',
      'CUOTA\\s*HIPOTECA',
      'ARRENDAMIENTO\\b',
      'EXPENSAS\\b',             // AR community fees
      'EXPENSAS\\s*ORDINARIAS',
      'EXPENSAS\\s*EXTRAORDINARIAS',
      'ADMINISTRACION\\s*EDIFICIO',
      // Rent & mortgage EN
      'RENT\\s*PAYMENT',
      'MONTHLY\\s*RENT',
      'RENT\\s*DUE',
      'MORTGAGE\\s*PAYMENT',
      'MORTGAGE\\b',
      'LEASE\\s*PAYMENT',
      'HOME\\s*LOAN\\s*PAYMENT',
      // Community fees ES
      'COMUNIDAD\\s*DE\\s*PROPIETARIOS',
      'COMUNIDAD\\s*VECINOS',
      'CUOTA\\s*COMUNIDAD',
      'GASTOS\\s*COMUNIDAD',
      // Community fees EN
      'SERVICE\\s*CHARGE',
      'GROUND\\s*RENT',
      'MAINTENANCE\\s*FEE',
      'HOA\\b',                  // US Homeowners Association
      'HOA\\s*PAYMENT',
      'STRATA\\s*LEVY',
      // ── Electricity ES ────────────────────────────────────
      'ENDESA\\b',
      'IBERDROLA\\b',
      'NATURGY\\b',
      'REPSOL\\s*LUZ',
      'REPSOL\\s*ELECTRICIDAD',
      'HOLALUZ\\b',
      'OCTOPUS\\s*ENERGY',
      'EDP\\s*ENERGIA',
      'VIESGO\\b',
      'CHC\\s*ENERGIA',
      'FACTOR\\s*ENERGIA',
      'PODO\\b',
      'PEPE\\s*ENERGY',
      'LUCERA\\b',
      'NEXUS\\s*ENERGIA',
      'SOM\\s*ENERGIA',
      'REPSOL\\s*HOGAR',
      // ── Electricity AR ────────────────────────────────────
      'EDENOR\\b',
      'EDESUR\\b',
      'EDELAP\\b',
      'EPE\\b',                  // Empresa Provincial de la Energía
      'EPEC\\b',                 // Córdoba
      'EPEN\\b',                 // Neuquén
      'EDEA\\b',
      'EDEA\\s*SA',
      'ENERSA\\b',               // Entre Ríos
      'DPEC\\b',                 // Corrientes
      'ANDE\\b',                 // Paraguay (also used by AR border zones)
      'LUZ\\s*Y\\s*FUERZA',
      'COOPERATIVA\\s*ELECTRICA',
      // ── Electricity CL ────────────────────────────────────
      'ENEL\\s*DISTRIBUCION',
      'CGE\\b',
      'SAESA\\b',
      'FRONTEL\\b',
      'CHILQUINTA\\b',
      'COOPELAN\\b',
      'LUZ\\s*OSORNO',
      // ── Electricity UY ────────────────────────────────────
      'UTE\\b',                  // Usinas y Trasmisiones Eléctricas
      'FACTURA\\s*UTE',
      // ── Electricity UK ────────────────────────────────────
      'BRITISH\\s*GAS',
      'EON\\b',
      'EDF\\s*ENERGY',
      'NPOWER\\b',
      'SCOTTISH\\s*POWER',
      'SSE\\b',
      'OVO\\s*ENERGY',
      'BULB\\s*ENERGY',
      'SHELL\\s*ENERGY',
      'UTILITY\\s*WAREHOUSE',
      'ELECTRICITY\\s*BILL',
      'ELECTRIC\\s*BILL',
      // ── Gas ES ────────────────────────────────────────────
      // NOTE: bare 'GAS' is in transport (gas station). Only specific gas companies here.
      'GAS\\s*NATURAL\\s*FENOSA',
      'GAS\\s*NATURAL\\b',
      'NATURGAS\\b',
      'MADRILEÑA\\s*RED\\s*GAS',
      'NEDGIA\\b',
      'GAS\\s*DIRECTO',
      'SORGENIA\\b',
      // ── Gas AR ────────────────────────────────────────────
      'METROGAS\\b',
      'LITORAL\\s*GAS',
      'GASNOR\\b',
      'GASNEA\\b',
      'CAMUZZI\\b',
      'DISTRIBUIDORA\\s*GAS',
      'ECOGAS\\b',
      'GAS\\s*PATAGONIA',
      // ── Gas CL ────────────────────────────────────────────
      'ABASTIBLE\\b',
      'GASCO\\b',
      'LIPIGAS\\b',
      'METROGAS\\s*CL',
      // ── Gas UY ────────────────────────────────────────────
      'ANCAP\\b',
      'GASEBA\\b',
      // ── Gas UK ────────────────────────────────────────────
      'GAS\\s*BILL',
      'GAS\\s*PAYMENT',
      // ── Water ES ──────────────────────────────────────────
      'CANAL\\s*ISABEL',
      'AGUAS\\s*DE\\b',
      'AIGUES\\s*DE',
      'EMASA\\b',
      'EMAVESA\\b',
      'AQUALIA\\b',
      'FACTURA\\s*AGUA',
      'RECIBO\\s*AGUA',
      'AGBAR\\b',
      'EMASESA\\b',
      'SOREA\\b',
      'ABASTECIMIENTO\\s*AGUA',
      'SUMINISTRO\\s*AGUA',
      'AGUAS\\s*MUNICIPALES',
      // ── Water AR ──────────────────────────────────────────
      'AYSA\\b',
      'AGUA\\s*Y\\s*SANEAMIENTOS',
      'IMAS\\b',
      'OBRAS\\s*SANITARIAS',
      'COOPERATIVA\\s*AGUA',
      // ── Water CL ──────────────────────────────────────────
      'AGUAS\\s*ANDINAS',
      'ESSBIO\\b',
      'ESVAL\\b',
      'ESSAL\\b',
      'AGUAS\\s*ARAUCANIA',
      'AGUAS\\s*MAGALLANES',
      'AGUAS\\s*DEL\\s*ALTIPLANO',
      'SMAPA\\b',
      // ── Water UY ──────────────────────────────────────────
      'OSE\\b',                  // Obras Sanitarias del Estado UY
      'FACTURA\\s*OSE',
      // ── Water UK/US ───────────────────────────────────────
      'THAMES\\s*WATER',
      'SEVERN\\s*TRENT',
      'YORKSHIRE\\s*WATER',
      'UNITED\\s*UTILITIES',
      'ANGLIAN\\s*WATER',
      'SOUTHERN\\s*WATER',
      'WATER\\s*BILL',
      'WATER\\s*RATES',
      // ── Internet & phone ES ───────────────────────────────
      'MOVISTAR\\b',
      'VODAFONE\\b',
      'ORANGE\\b',
      'JAZZTEL\\b',
      'MASMOVIL\\b',
      'YOIGO\\b',
      'PEPEPHONE\\b',
      'SIMYO\\b',
      'DIGI\\b',
      'LOWI\\b',
      'O2\\b',
      'FINETWORK\\b',
      'EUSKALTEL\\b',
      'R\\s*CABLE\\b',
      'TELECABLE\\b',
      'ADAMO\\b',
      'AVATEL\\b',
      'MAS\\s*MOVIL',
      'AIRE\\s*NETWORKS',
      'VIRGIN\\s*TELCO',
      // ── Internet & phone AR ───────────────────────────────
      'TELECENTRO\\b',
      'FIBERTEL\\b',
      'CABLEVISION\\b',
      'FLOW\\s*CABLEVISION',
      'CLARO\\s*AR',
      'PERSONAL\\s*AR',
      'MOVISTAR\\s*AR',
      'TUENTI\\b',
      'ARNET\\b',
      'SPEEDY\\b',
      'IPLAN\\b',
      'METROTEL\\b',
      'DATCO\\b',
      // ── Internet & phone CL ───────────────────────────────
      'ENTEL\\b',
      'CLARO\\s*CL',
      'MOVISTAR\\s*CL',
      'WOM\\b',
      'VTR\\b',
      'GTD\\b',
      'TELSUR\\b',
      'MUNDO\\s*PACIFICO',
      // ── Internet & phone UY ───────────────────────────────
      'ANTEL\\b',
      'CLARO\\s*UY',
      'MOVISTAR\\s*UY',
      'DEDICADO\\s*UY',
      // ── Internet & phone UK ───────────────────────────────
      'BT\\s*GROUP',
      'BT\\s*INTERNET',
      'VIRGIN\\s*MEDIA',
      'SKY\\s*BROADBAND',
      'TALK\\s*TALK',
      'PLUSNET\\b',
      'NOW\\s*BROADBAND',
      // ── Internet & phone US ───────────────────────────────
      'COMCAST\\b',
      'VERIZON\\b',
      'ATT\\b',
      'TMOBILE\\b',
      'SPECTRUM\\b',
      'COX\\s*COMMUNICATIONS',
      'XFINITY\\b',
      'CENTURYLINK\\b',
      'LUMEN\\b',
      'FRONTIER\\s*COMMUNICATIONS',
      'OPTIMUM\\b',
      'ALTICE\\b',
      'DISH\\s*NETWORK',
      'DIRECTV\\s*HOME',
      'PHONE\\s*BILL',
      'BROADBAND\\s*BILL',
      'INTERNET\\s*BILL',
      'MOBILE\\s*BILL',
      'CELL\\s*PHONE\\s*BILL',
      // ── Home services ─────────────────────────────────────
      'SEGURO\\s*HOGAR',
      'MANTENIMIENTO\\s*HOGAR',
      'FONTANER\\b',
      'ELECTRICISTA\\s*HOGAR',
      'LIMPIEZA\\s*HOGAR',
      'HOME\\s*INSURANCE',
      'CONTENTS\\s*INSURANCE',
      'HOME\\s*MAINTENANCE',
      'PLUMBER\\b',
      'HANDYMAN\\b',
      // ── Storage ───────────────────────────────────────────
      'TRASTERO\\b',
      'GARAJE\\s*MENSUAL',
      'STORAGE\\s*UNIT',
      'SELF\\s*STORAGE',
      'PUBLIC\\s*STORAGE',
      'EXTRA\\s*SPACE\\s*STORAGE',
    ], 0.97),
  },

  // ── expense / groceries ───────────────────────────────────
  {
    movement: 'EXPENSE',
    category: 'groceries',
    rules: r([
      // ── ES ────────────────────────────────────────────────
      'MERCADONA\\b',
      'CARREFOUR\\b',
      'LIDL\\b',
      'ALDI\\b',
      'DIA\\b',
      'EROSKI\\b',
      'CONSUM\\b',
      'ALCAMPO\\b',
      'HIPERCOR\\b',
      'SUPERCOR\\b',
      'EL\\s*CORTE\\s*INGLES.*SUPERMERCADO',
      'SIMPLY\\s*MARKET',
      'PLUS\\s*FRESC',
      'FROIZ\\b',
      'MASYMAS\\b',
      'CONDIS\\b',
      'BONPREU\\b',
      'SORLI\\b',
      'SPAR\\b',
      'COVIRAN\\b',
      'SUPERSOL\\b',
      'BM\\s*SUPERMERCADOS',
      'GADIS\\b',
      'CLAUDIO\\s*SUPERMERCADO',
      'ALIMERKA\\b',
      'LUPA\\s*SUPERMERCADOS',
      'AHORRAMAS\\b',
      'EL\\s*ARBOL\\s*SUPERMERCADO',
      'DIALPRIX\\b',
      'UVESCO\\b',
      'UDAKO\\b',
      'CECOSA\\b',
      'AHORRAMAAS\\b',
      'SABECO\\b',
      'COALIMENT\\b',
      'VALVI\\b',
      'FAMILIA\\s*SUPERMERCADOS',
      'SUMA\\s*SUPERMERCADOS',
      'CAPRABO\\b',
      'SUPERMERCAT\\b',
      // ── AR ────────────────────────────────────────────────
      'COTO\\b',
      'DISCO\\s*AR',
      'VEA\\b',
      'JUMBO\\b',
      'CHANGOMAS\\b',
      'LA\\s*ANONIMA',
      'WALMART\\s*AR',
      'CARREFOUR\\s*AR',
      'DIA\\s*AR',
      'LIDL\\s*AR',
      'MAXICONSUMO\\b',
      'VITAL\\b',
      'MAKRO\\s*AR',
      'CARREFOUR\\s*MAXI',
      'SUPER\\s*VEA',
      'SUPER\\s*EKONO',
      'CORDIEZ\\b',
      'LA\\s*NUEVA\\s*ECONOMICA',
      'SUPERMERCADOS\\s*DIA',
      'NORTE\\s*SUPERMERCADO',
      'TIA\\s*SUPERMERCADO',     // also EC/PE
      // ── CL ────────────────────────────────────────────────
      'JUMBO\\s*CL',
      'SANTA\\s*ISABEL',
      'UNIMARC\\b',
      'LIDER\\b',
      'TOTTUS\\b',
      'ACUENTA\\b',
      'EKONO\\b',
      'MAYORISTA\\s*10',
      'CENTRAL\\s*MAYORISTA',
      'CARREFOUR\\s*CL',
      'MARKET\\s*CL',
      'SUPERMERCADO\\s*MONTSERRAT',
      'OK\\s*MARKET',
      'SUPERBODEGA\\b',
      'BODEGA\\s*CENTRAL',       // CL supermarket chain
      // ── UY ────────────────────────────────────────────────
      'TIENDA\\s*INGLESA',
      'DISCO\\s*UY',
      'DEVOTO\\b',
      'GEANT\\b',
      'TA\\s*TA\\b',
      'MULTIAHORRO\\b',
      'EL\\s*DORADO\\s*SUPERMERCADO',
      'TIENDAS\\s*MAS\\b',
      'MACRO\\s*UY',
      'SUPERMERCADO\\s*MICRO',
      'SUPERMERCADOS\\s*FULL',
      'FRESH\\s*MARKET\\s*UY',
      // ── US ────────────────────────────────────────────────
      'WHOLE\\s*FOODS',
      'TRADER\\s*JOES',
      'KROGER\\b',
      'PUBLIX\\b',
      'SAFEWAY\\b',
      'WEGMANS\\b',
      'COSTCO\\b',
      'SAM\\s*S\\s*CLUB',
      'INSTACART\\b',
      'FRESH\\s*DIRECT',
      'PEAPOD\\b',
      'SHIPT\\b',
      'WALMART\\s*GROCERY',
      'TARGET\\s*GROCERY',
      'ALDI\\s*US',
      'LIDL\\s*US',
      'MEIJER\\b',
      'HEB\\b',
      'ALBERTSONS\\b',
      'VONS\\b',
      'RALPHS\\b',
      'SMITH\\s*FOOD',
      'FRED\\s*MEYER',
      'KING\\s*SOOPERS',
      'HARRIS\\s*TEETER',
      'FOOD\\s*LION',
      'STOP\\s*AND\\s*SHOP',
      'GIANT\\s*FOOD',
      'WINN\\s*DIXIE',
      'PIGGLY\\s*WIGGLY',
      'INGLE\\s*S',
      'ACME\\s*MARKETS',
      // ── UK ────────────────────────────────────────────────
      'TESCO\\b',
      'SAINSBURY\\b',
      'ASDA\\b',
      'MORRISONS\\b',
      'WAITROSE\\b',
      'MARKS\\s*AND\\s*SPENCER\\s*FOOD',
      'MS\\s*FOOD',
      'ICELAND\\s*FOODS',
      'CO\\s*OP\\s*FOOD',
      'OCADO\\b',
      'FARMFOODS\\b',
      // ── DE/FR ─────────────────────────────────────────────
      'REWE\\b',
      'EDEKA\\b',
      'NETTO\\b',
      'PENNY\\b',
      'NORMA\\b',
      'KAUFLAND\\b',
      'LECLERC\\b',
      'INTERMARCHE\\b',
      'AUCHAN\\b',
      'SUPER\\s*U\\b',
      // ── Generic ───────────────────────────────────────────
      'SUPERMERCADO\\b',
      'SUPERMARKET\\b',
      'FRUTERIA\\b',
      'VERDULERIA\\b',
      'CARNICERIA\\b',
      'PESCADERIA\\b',
      'ULTRAMARINOS\\b',
      'COLMADO\\b',
      'ALMACEN\\b',
      'GROCERY\\b',
      'GROCERIES\\b',
      'FOOD\\s*SHOP',
      'WEEKLY\\s*SHOP',
    ], 0.99),
  },

  // ── expense / restaurants ─────────────────────────────────
  {
    movement: 'EXPENSE',
    category: 'restaurants',
    rules: r([
      // ── Delivery apps ─────────────────────────────────────
      'GLOVO\\b',
      'JUST\\s*EAT',
      'JUSTEAT\\b',
      'UBER\\s*EATS',
      'UBEREATS\\b',
      'DELIVEROO\\b',
      'BOLT\\s*FOOD',
      'PEDIDOS\\s*YA',
      'PEDIDOSYA\\b',
      'RAPPI\\b',
      'DOORDASH\\b',
      'GRUBHUB\\b',
      'POSTMATES\\b',
      'SEAMLESS\\b',
      'MENULOG\\b',
      'FOODORA\\b',
      'WOLT\\b',
      // ── Fast food global ──────────────────────────────────
      'MCDONALDS\\b',
      'MC\\s*DONALDS',
      'BURGER\\s*KING',
      'BURGERKING\\b',
      'FIVE\\s*GUYS',
      'KFC\\b',
      'SUBWAY\\b',
      'DOMINOS\\b',
      'PIZZA\\s*HUT',
      'PAPA\\s*JOHNS',
      'TACO\\s*BELL',
      'CHIPOTLE\\b',
      'WENDYS\\b',
      'POPEYES\\b',
      // ── Fast food ES ──────────────────────────────────────
      'TELEPIZZA\\b',
      'FOSTER\\s*HOLLY',
      'TGB\\b',
      'VIPS\\b',
      'GINOS\\b',
      'PANS\\s*CO',
      '100\\s*MONTADITOS',
      'GOIKO\\b',
      'HONEST\\s*GREENS',
      'UDON\\b',
      'BACOA\\b',
      'VICIO\\b',
      'GROSSO\\s*NAPOLETANO',
      'KIOSKO\\s*BAR',
      'LA\\s*PEPITA',
      'BOB\\s*S\\s*FREE\\s*BURGER',
      // ── Fast food AR ──────────────────────────────────────
      'MOSTAZA\\b',
      'UNICO\\s*BURGER',
      'FREDDO\\b',
      'GRIDO\\b',
      'RAPANUI\\b',
      'VIA\\s*CAFE',
      'BONAFIDE\\b',
      'FOTOMAT\\b',
      // ── Fast food CL ──────────────────────────────────────
      'BRAVISSIMO\\b',
      'PIZZA\\s*PIZZA\\s*CL',
      'PAPA\\s*JOHNS\\s*CL',
      'EMPANADAS\\s*ZUNINO',
      'DOMINOS\\s*CL',
      // ── Coffee chains ─────────────────────────────────────
      'STARBUCKS\\b',
      'DUNKIN\\b',
      'COSTA\\s*COFFEE',
      'CAFFE\\s*NERO',
      'PRET\\s*A\\s*MANGER',
      'PRET\\b',
      'PAUL\\b',
      'CHOCOLATERIA\\s*SAN\\s*GINES',
      'CAFE\\s*MARTINEZ',        // AR chain
      'HAVANNA\\b',              // AR chain
      'COSI\\b',                 // US chain
      // ── UK restaurant chains ──────────────────────────────
      'GREGGS\\b',
      'NANDOS\\b',
      'ITSU\\b',
      'LEON\\s*RESTAURANT',
      'CAFE\\s*ROUGE',
      'BELLA\\s*ITALIA',
      'PIZZA\\s*EXPRESS',
      'PREZZO\\b',
      'WAGAMAMA\\b',
      'WASABI\\b',
      'YO\\s*SUSHI',
      'BYRON\\s*BURGER',
      // ── Generic restaurant keywords ───────────────────────
      'RESTAURANTE\\b',
      'RESTAURANT\\b',
      'CAFETERIA\\b',
      'CERVECERIA\\b',
      'ASADOR\\b',
      'MARISQUERIA\\b',
      'TAPAS\\b',
      'CHIRINGUITO\\b',
      'HAMBURGUESERIA\\b',
      'HELADERIA\\b',
      'PASTELERIA\\b',
      'BODEGA\\s*VINO',
      'TABERNA\\b',
      'MESON\\b',
      'PAELLERIA\\b',
      'CHURRERIA\\b',
      'BAR\\s*RESTAUR',
      'COMIDA\\s*RAPIDA',
      'ROTISERIA\\b',            // AR take-away
      'CANTINA\\b',
      'DINING\\b',
      'FOOD\\s*DELIVERY',
      'TAKE\\s*AWAY',
      'TAKEAWAY\\b',
      'SUSHI\\s*RESTAURANT',
      // ── Generic food keywords ES ──────────────────────────
      'COMIDA\\b',                // "COMIDA" alone → restaurants
      'ALMUERZO\\b',
      'CENA\\b',
      'BRUNCH\\b',
    ], 0.97),
  },

  // ── expense / subscriptions ───────────────────────────────
  // AMAZON PRIME must be here before AMAZON → shopping below.
  {
    movement: 'EXPENSE',
    category: 'subscriptions',
    rules: r([
      // ── Streaming video ───────────────────────────────────
      'NETFLIX\\b',
      'HBO\\s*MAX',
      'HBOMAX\\b',
      'MAX\\s*STREAMING',
      'MAX\\s*SUBSCRIPTION',
      'DISNEY\\s*PLUS',
      'DISNEY\\+',
      'AMAZON\\s*PRIME\\s*VIDEO',
      'AMAZON\\s*PRIME',          // placed before generic AMAZON
      'APPLE\\s*TV\\s*PLUS',
      'APPLE\\s*TV\\+',
      'ATRESPLAYER\\b',
      'MOVISTAR\\s*PLUS',
      'FILMIN\\b',
      'MUBI\\b',
      'CRUNCHYROLL\\b',
      'CURIOSITYSTREAM\\b',
      'DISCOVERY\\s*PLUS',
      'DISCOVERYPLUS\\b',
      'DAZN\\b',
      'PARAMOUNT\\s*PLUS',
      'PARAMOUNTPLUS\\b',
      'PEACOCK\\b',
      'HULU\\b',
      'FUBO\\s*TV',
      'YOUTUBE\\s*PREMIUM',
      'APPLE\\s*ONE',
      'SKY\\s*SPORTS',
      'SKY\\s*GO',
      'SKY\\s*SUBSCRIPTION',
      'DIRECTV\\s*STREAMING',
      'STAR\\s*PLUS',             // LATAM Disney streaming
      'CLAROVIDEO\\b',
      'BLIM\\s*TV',
      'FLOW\\s*STREAMING',        // AR
      // ── Music ─────────────────────────────────────────────
      'SPOTIFY\\b',
      'APPLE\\s*MUSIC',
      'TIDAL\\b',
      'DEEZER\\b',
      'YOUTUBE\\s*MUSIC',
      'AMAZON\\s*MUSIC',
      'SOUNDCLOUD\\b',
      'NAPSTER\\b',
      'PANDORA\\b',
      // ── Cloud storage ─────────────────────────────────────
      'ICLOUD\\b',
      'GOOGLE\\s*ONE',
      'GOOGLE\\s*STORAGE',
      'GOOGLE\\s*WORKSPACE',
      'DROPBOX\\b',
      'ONEDRIVE\\b',
      'BOX\\s*STORAGE',
      'PCLOUD\\b',
      'MEGA\\s*STORAGE',
      // ── Productivity / Office ─────────────────────────────
      'MICROSOFT\\s*365',
      'OFFICE\\s*365',
      'MICROSOFT\\s*PERSONAL',
      'MICROSOFT\\s*FAMILY',
      'ADOBE\\s*CC',
      'ADOBE\\s*CREATIVE\\s*CLOUD',
      'ADOBE\\s*SUBSCRIPTION',
      'CANVA\\s*PRO',
      'CANVA\\s*SUBSCRIPTION',
      'NOTION\\s*SUBSCRIPTION',
      'EVERNOTE\\s*PREMIUM',
      'TODOIST\\s*PREMIUM',
      // ── Security / VPN ────────────────────────────────────
      'LASTPASS\\b',
      '1PASSWORD\\b',
      'BITWARDEN\\b',
      'NORDVPN\\b',
      'NORD\\s*VPN',
      'EXPRESSVPN\\b',
      'SURFSHARK\\b',
      'PROTONVPN\\b',
      'NORTON\\s*SUBSCRIPTION',
      'MCAFEE\\s*SUBSCRIPTION',
      'KASPERSKY\\s*SUBSCRIPTION',
      'AVAST\\s*PREMIUM',
      // ── Developer / SaaS ──────────────────────────────────
      'GITHUB\\s*SUBSCRIPTION',
      'GITHUB\\s*PRO',
      'GITLAB\\s*SUBSCRIPTION',
      'FIGMA\\s*SUBSCRIPTION',
      'FIGMA\\s*PROFESSIONAL',
      'VERCEL\\s*SUBSCRIPTION',
      'NETLIFY\\s*SUBSCRIPTION',
      'HEROKU\\s*SUBSCRIPTION',
      'AWS\\s*SUBSCRIPTION',
      'GOOGLE\\s*CLOUD\\s*SUBSCRIPTION',
      'AZURE\\s*SUBSCRIPTION',
      'DIGITALOCEAN\\s*SUBSCRIPTION',
      'SUPABASE\\s*SUBSCRIPTION',
      'OPENAI\\s*SUBSCRIPTION',
      'ANTHROPIC\\s*SUBSCRIPTION',
      'MIDJOURNEY\\s*SUBSCRIPTION',
      'ZAPIER\\s*SUBSCRIPTION',
      'AIRTABLE\\s*SUBSCRIPTION',
      'MONDAY\\s*COM',
      'ASANA\\s*SUBSCRIPTION',
      'JIRA\\s*SUBSCRIPTION',
      'SLACK\\s*SUBSCRIPTION',
      'ZOOM\\s*SUBSCRIPTION',
      'LOOM\\s*SUBSCRIPTION',
      'NOTION\\b',
      // ── Gym / fitness subscriptions ───────────────────────
      'GIMNASIO\\b',
      'GYM\\b',
      'BASIC\\s*FIT',
      'METROPOLITAN\\s*GYM',
      'HOLMES\\s*PLACE',
      'VIRGIN\\s*ACTIVE',
      'DAVID\\s*LLOYD',
      'PUREGYM\\b',
      'BANNATYNE\\b',
      'THE\\s*GYM\\b',
      'ANYTIME\\s*FITNESS',
      'DIR\\s*SPORT',
      'SPORT\\s*CLUB',
      'CROSSFIT\\s*MEMBRESIA',
      'PELOTON\\b',
      'CLASSPASS\\b',
      'FREELETICS\\b',
      'FITBIT\\s*PREMIUM',
      'STRAVA\\s*SUBSCRIPTION',
      'MYFITNESSPAL\\s*PREMIUM',
      // ── News / Reading ────────────────────────────────────
      'NYTIMES\\s*SUBSCRIPTION',
      'NY\\s*TIMES\\s*SUBSCRIPTION',
      'FINANCIAL\\s*TIMES\\s*SUBSCRIPTION',
      'ECONOMIST\\s*SUBSCRIPTION',
      'MEDIUM\\s*MEMBERSHIP',
      'SUBSTACK\\b',
      'KINDLE\\s*UNLIMITED',
      'SCRIBD\\b',
      'AUDIBLE\\b',
      'EL\\s*PAIS\\s*SUSCRIPCION',
      'LA\\s*NACION\\s*SUSCRIPCION',  // AR
      'CLARIN\\s*SUSCRIPCION',         // AR
      // ── Dating ────────────────────────────────────────────
      'TINDER\\s*GOLD',
      'TINDER\\s*PLUS',
      'TINDER\\s*SUBSCRIPTION',
      'BUMBLE\\s*PREMIUM',
      'HINGE\\s*SUBSCRIPTION',
      'MEETIC\\b',
      'BADOO\\s*PREMIUM',
      // ── Generic ───────────────────────────────────────────
      'SUSCRIPCION\\b',
      'MEMBRESIA\\b',
      'SUBSCRIPTION\\b',
      'MONTHLY\\s*MEMBERSHIP',
      'ANNUAL\\s*MEMBERSHIP',
      'PREMIUM\\s*PLAN',
      'PLAN\\s*PREMIUM',
    ], 0.99),
  },

  // ── expense / transport ───────────────────────────────────
  {
    movement: 'EXPENSE',
    category: 'transport',
    rules: r([
      // ── Rideshare ES/EU ───────────────────────────────────
      'UBER\\b',
      'CABIFY\\b',
      'BOLT\\b',
      'FREE\\s*NOW',
      'MYTAXI\\b',
      'BLABLACAR\\b',
      // ── Rideshare US ──────────────────────────────────────
      'LYFT\\b',
      'GETT\\b',
      // ── Rideshare AR ──────────────────────────────────────
      'BEAT\\s*AR',
      'INDRIVE\\b',
      'TAXI\\s*BEAT',
      // ── Rideshare CL ──────────────────────────────────────
      'CABIFY\\s*CL',
      'BEAT\\s*CL',
      'RIDEMONKEY\\b',
      // ── Taxi generic ──────────────────────────────────────
      'TAXI\\b',
      'REMIS\\b',                // AR informal taxi
      'REMISERIA\\b',
      // ── Public transport ES ───────────────────────────────
      'RENFE\\b',
      'CERCANIAS\\b',
      'EMT\\b',
      'TMB\\b',
      'FGC\\b',
      'METRO\\s*MADRID',
      'METRO\\s*BARCELONA',
      'METRO\\s*BILBAO',
      'METRO\\s*SEVILLA',
      'METRO\\s*VALENCIA',
      'TARJETA\\s*TRANSPORTE',
      'ABONO\\s*TRANSPORTE',
      'BONO\\s*BUS',
      'BONO\\s*METRO',
      'AUTOBUS\\b',
      'ALSA\\b',
      'AVANZA\\b',
      'ALVIA\\b',
      'OUIGO\\b',
      'IRYO\\b',
      'SOCIBUS\\b',
      'SAMAR\\b',
      // ── Public transport AR ───────────────────────────────
      'SUBE\\b',                 // Sistema Único de Boleto Electrónico
      'CARGA\\s*SUBE',
      'METROBUS\\b',
      'SUBTE\\b',
      'TREN\\s*ROCA',
      'TREN\\s*SARMIENTO',
      'TREN\\s*MITRE',
      'TREN\\s*SAN\\s*MARTIN',
      'TREN\\s*BELGRANO',
      'TRENES\\s*ARGENTINOS',
      'COLECTIVO\\b',
      'OMNIBUS\\b',
      // ── Public transport CL ───────────────────────────────
      'BIPCARD\\b',
      'TARJETA\\s*BIP',
      'TRANSANTIAGO\\b',
      'RED\\s*MOVILIDAD',
      'EFE\\s*TRENES',
      'METROTREN\\b',
      'BIOBUS\\b',
      // ── Public transport UY ───────────────────────────────
      'STM\\b',                  // Sistema de Transporte Metropolitano UY
      'TARJETA\\s*STM',
      'CUTCSA\\b',
      'COETC\\b',
      'RAINCOOP\\b',
      'COME\\b',                 // UY bus company
      // ── Public transport UK ───────────────────────────────
      'TFL\\b',
      'TRANSPORT\\s*FOR\\s*LONDON',
      'OYSTER\\b',
      'NATIONAL\\s*RAIL',
      'TRAINLINE\\b',
      'AVANTI\\b',
      'ARRIVA\\b',
      'STAGECOACH\\b',
      'FIRST\\s*BUS',
      // ── Public transport US ───────────────────────────────
      'MTA\\b',
      'BART\\b',
      'METRO\\s*CARD',
      'CLIPPER\\s*CARD',
      'PRESTO\\s*CARD',
      'AMTRAK\\b',
      'GREYHOUND\\b',
      // ── Intercity buses EU ────────────────────────────────
      'FLIXBUS\\b',
      'EUROLINES\\b',
      // ── Fuel ES ───────────────────────────────────────────
      'REPSOL\\s*COMBUSTIBLE',
      'REPSOL\\s*ESTACION',
      'BP\\s*GASOLINERA',
      'SHELL\\s*COMBUSTIBLE',
      'CEPSA\\b',
      'GALP\\b',
      'PETRONOR\\b',
      'GASOLINERA\\b',
      'COMBUSTIBLE\\b',
      'GASOLINA\\b',
      'GASOLEO\\b',
      'ESTACION\\s*SERVICIO',
      'ESTACION\\s*DE\\s*SERVICIO',
      // ── Fuel AR ───────────────────────────────────────────
      'YPF\\b',
      'SHELL\\s*AR',
      'AXION\\s*ENERGY',
      'PUMA\\s*ENERGY',
      'PETROBRAS\\s*AR',
      'OIL\\s*COMBUSTIBLES',
      'NAFTA\\b',                // AR word for gasoline
      'GNC\\b',                  // Gas Natural Comprimido (AR vehicles)
      // ── Fuel CL ───────────────────────────────────────────
      'COPEC\\b',
      'ENEX\\b',
      'PETROBRAS\\s*CL',
      'SHELL\\s*CL',
      'TERPEL\\b',               // also CO
      // ── Fuel UY ───────────────────────────────────────────
      'ANCAP\\s*COMBUSTIBLE',
      'PETROBRAS\\s*UY',
      // ── Fuel UK/US ────────────────────────────────────────
      'FUEL\\b',
      'PETROL\\b',
      'GAS\\s*STATION',
      'GAS\\s*PUMP',
      'FILLING\\s*STATION',
      'CHEVRON\\b',
      'EXXON\\b',
      'MOBIL\\b',
      'SUNOCO\\b',
      'CIRCLE\\s*K',
      'WAWA\\b',
      'SPEEDWAY\\b',
      'SHEETZ\\b',
      // ── Parking ES ────────────────────────────────────────
      'PARKING\\b',
      'APARCAMIENTO\\b',
      'PARQUIMETRO\\b',
      'EMPARK\\b',
      'INDIGO\\s*PARK',
      'SABA\\s*PARK',
      'DORNIER\\s*PARKING',
      // ── Parking US/UK ─────────────────────────────────────
      'CAR\\s*PARK',
      'NCP\\b',
      'Q\\s*PARK',
      'APCOA\\b',
      'PARKJOCKEY\\b',
      'PARKWHIZ\\b',
      'SPOTHERO\\b',
      // ── Tolls ES ──────────────────────────────────────────
      'AUTOPISTA\\b',
      'PEAJE\\b',
      'VIA\\s*T',
      // ── Tolls US ──────────────────────────────────────────
      'EZPASS\\b',
      'FASTRAK\\b',
      'SUNPASS\\b',
      'TOLL\\s*PAYMENT',
      // ── Tolls UK ──────────────────────────────────────────
      'DART\\s*CHARGE',
      'CONGESTION\\s*CHARGE',
      // ── Micro-mobility ES ─────────────────────────────────
      'BICING\\b',
      'VALENBISI\\b',
      'SEVICI\\b',
      'ECOBICI\\b',
      'LIME\\b',
      'VOI\\b',
      'TIER\\b',
      'ACCIONA\\s*MOTO',
      'COOLTRA\\b',
      'MUVING\\b',
      'BIRD\\b',
      'SPIN\\s*SCOOTER',
      // ── Micro-mobility AR ─────────────────────────────────
      'ECOBICI\\s*AR',
      'TEMBICI\\b',
      // ── Car ownership ES ──────────────────────────────────
      'ITV\\b',
      'SEGURO\\s*AUTO',
      'SEGURO\\s*COCHE',
      'SEGURO\\s*VEHICULO',
      // ── Generic vehicle keywords ES ───────────────────────
      '\\bAUTO\\b',               // "AUTO" alone → transport
      '\\bAUTOMOVIL\\b',
      '\\bCOCHE\\b',
      '\\bVEHICULO\\b',
      'TALLER\\s*MECANICO',
      'RENTING\\s*VEHICULO',
      'LEASING\\s*VEHICULO',
      // ── Car ownership AR ──────────────────────────────────
      'PATENTE\\s*AUTO',         // AR vehicle tax → transport (not taxes; it's a registration fee)
      'VTV\\b',                  // Verificación Técnica Vehicular AR
      // ── Car ownership US/UK ───────────────────────────────
      'CAR\\s*INSURANCE',
      'AUTO\\s*INSURANCE',
      'DMV\\b',
      'VEHICLE\\s*REGISTRATION',
      'MOT\\b',
      'CAR\\s*LOAN\\s*PAYMENT',
      'AUTO\\s*LOAN',
      // ── Car rental (always transport) ─────────────────────
      'ENTERPRISE\\s*CAR',
      'ENTERPRISE\\s*RENT',
      'AVIS\\b',
      'HERTZ\\b',
      'EUROPCAR\\b',
      'SIXT\\b',
      'BUDGET\\s*CAR',
      'DOLLAR\\s*CAR',
      'THRIFTY\\s*CAR',
      'ALAMO\\s*CAR',
      'NATIONAL\\s*CAR',
      'RECORD\\s*GO',
      'CENTAURO\\b',
      'GOLDCAR\\b',
    ], 0.97),
  },

  // ── expense / health ─────────────────────────────────────
  {
    movement: 'EXPENSE',
    category: 'health',
    rules: r([
      // ── Pharmacy ES ───────────────────────────────────────
      'FARMACIA\\b',
      'PARAFARMACIA\\b',
      'FARMACIA\\s*CENTRAL',
      // ── Pharmacy AR ───────────────────────────────────────
      'FARMACIAS\\s*DEL\\s*PUEBLO',
      'FARMACITY\\b',
      'FARMACIAS\\s*AHUMADA',    // also CL
      'FARMACIAS\\s*CRUZ\\s*VERDE',
      'FARMACIAS\\s*SALCO',
      // ── Pharmacy CL ───────────────────────────────────────
      'FARMACIAS\\s*SB',
      'FARMACIAS\\s*DR\\s*SIMI',
      'DR\\s*SIMI\\b',
      // ── Pharmacy UY ───────────────────────────────────────
      'FARMASHOP\\b',
      'FARMAPOLIS\\b',
      // ── Pharmacy UK/US ────────────────────────────────────
      'PHARMACY\\b',
      'CHEMIST\\b',
      'BOOTS\\b',
      'LLOYDS\\s*PHARMACY',
      'SUPERDRUG\\b',
      'CVS\\b',
      'WALGREENS\\b',
      'RITE\\s*AID',
      'DUANE\\s*READE',
      // ── Medical ES ────────────────────────────────────────
      'CLINICA\\b',
      'CLINICADENT\\b',
      'DENTISTA\\b',
      'ODONTOLOG\\b',
      'MEDICO\\b',
      'CONSULTA\\s*MEDICA',
      'HOSPITAL\\b',
      'CENTRO\\s*SALUD',
      'AMBULATORIO\\b',
      'URGENCIAS\\b',
      'RADIOGRAFIA\\b',
      'LABORATORIO\\s*ANALISIS',
      'ANALISIS\\s*CLINICOS',
      'ECOGRAFIA\\b',
      'FISIOTERAPEUTA\\b',
      'FISIOTERAPIA\\b',
      'PSICOLOG\\b',
      'PSIQUIATRA\\b',
      'OFTALMOLOG\\b',
      'AUDIFONOS\\b',
      'VACUNA\\b',
      'NUTRICIONISTA\\b',
      'LOGOPEDA\\b',
      // ── Medical AR ────────────────────────────────────────
      'MEDICUS\\b',
      'SWISS\\s*MEDICAL',
      'OSDE\\b',
      'GALENO\\b',
      'ACCORD\\s*SALUD',
      'OMINT\\b',
      'BOREAL\\s*SALUD',
      'MEDICINA\\s*PRIVADA',
      'PREPAGA\\b',
      'CUOTA\\s*PREPAGA',
      'CUOTA\\s*MEDICINAL',
      // ── Medical CL ────────────────────────────────────────
      'CLINICA\\s*ALEMANA',
      'CLINICA\\s*LAS\\s*CONDES',
      'CLINICA\\s*SANTA\\s*MARIA',
      'CLINICA\\s*INDISA',
      'MEDICENTRO\\b',
      'MEGASALUD\\b',
      'CUOTA\\s*ISAPRE',
      // ── Medical UY ────────────────────────────────────────
      'MUTUALISTA\\b',
      'CASMU\\b',
      'ASOCIACION\\s*ESPANOLA',
      'MEDICA\\s*URUGUAYA',
      'COMADEP\\b',
      'DISSE\\b',
      'CUOTA\\s*MUTUALISTA',
      // ── Optics ES ─────────────────────────────────────────
      'OPTICA\\b',
      'MULTIOPTICAS\\b',
      'GENERAL\\s*OPTICA',
      'ALAIN\\s*AFFLELOU',
      'VISION\\s*LAB',
      'SPECSAVERS\\b',
      'VISION\\s*EXPRESS',
      // ── Health insurance ES ───────────────────────────────
      'SANITAS\\b',
      'ADESLAS\\b',
      'ASISA\\b',
      'MAPFRE\\s*SALUD',
      'DKV\\b',
      'CIGNA\\b',
      'AXA\\s*SALUD',
      'GENERALI\\s*SALUD',
      'SEGURO\\s*MEDICO',
      'SEGURO\\s*SALUD',
      'MUFACE\\b',
      // ── Health insurance UK ───────────────────────────────
      'BUPA\\b',
      'AXA\\s*HEALTH',
      'NUFFIELD\\s*HEALTH',
      'SPIRE\\s*HEALTH',
      // ── Health insurance US ───────────────────────────────
      'HEALTH\\s*INSURANCE\\s*PREMIUM',
      'BLUE\\s*CROSS',
      'BLUE\\s*SHIELD',
      'AETNA\\b',
      'CIGNA\\s*HEALTH',
      'HUMANA\\b',
      'UNITED\\s*HEALTH',
      'KAISER\\s*PERMANENTE',
      // ── Generic ───────────────────────────────────────────
      'DOCTOR\\b',
      'DENTIST\\b',
      'THERAPIST\\b',
      'PHYSIOTHERAPY\\b',
      'OPTICIAN\\b',
      'PRESCRIPTION\\b',
      'CLINIC\\b',
      'MEDICAL\\s*BILL',
      'HEALTH\\s*CARE',
    ], 0.97),
  },

  // ── expense / travel ──────────────────────────────────────
  {
    movement: 'EXPENSE',
    category: 'travel',
    rules: r([
      // ── Flights ES ────────────────────────────────────────
      'RYANAIR\\b',
      'VUELING\\b',
      'IBERIA\\b',
      'IBERIA\\s*EXPRESS',
      'VOLOTEA\\b',
      'AIR\\s*EUROPA',
      'AENA\\b',
      'AEROPUERTO\\b',
      // ── Flights AR/LATAM ──────────────────────────────────
      'AEROLINEAS\\s*ARGENTINAS',
      'FLYBONDI\\b',
      'JET\\s*SMART',
      'JETSMART\\b',
      'ANDES\\s*LINEAS\\s*AEREAS',
      'LATAM\\b',
      'AVIANCA\\b',
      'COPA\\s*AIRLINES',
      'WINGO\\b',
      'VIVA\\s*AIR',
      'AEROMEXICO\\b',
      'GOL\\s*LINHAS',
      'AZUL\\s*LINHAS',
      'TAM\\s*LINHAS',
      // ── Flights EU ────────────────────────────────────────
      'EASYJET\\b',
      'NORWEGIAN\\b',
      'WIZZ\\s*AIR',
      'TRANSAVIA\\b',
      'EUROWINGS\\b',
      'LAUDA\\b',
      // ── Flights global ────────────────────────────────────
      'LUFTHANSA\\b',
      'AIR\\s*FRANCE',
      'KLM\\b',
      'BRITISH\\s*AIRWAYS',
      'EMIRATES\\b',
      'QATAR\\s*AIRWAYS',
      'TURKISH\\s*AIRLINES',
      'UNITED\\s*AIRLINES',
      'AMERICAN\\s*AIRLINES',
      'DELTA\\s*AIRLINES',
      'SOUTHWEST\\s*AIRLINES',
      'JETBLUE\\b',
      'SPIRIT\\s*AIRLINES',
      'FRONTIER\\s*AIRLINES',
      'ALASKA\\s*AIRLINES',
      'HAWAII\\s*AIRLINES',
      'AIR\\s*CANADA',
      'QANTAS\\b',
      'CATHAY\\s*PACIFIC',
      'SINGAPORE\\s*AIRLINES',
      'JAPAN\\s*AIRLINES',
      // ── Booking platforms ─────────────────────────────────
      // No 'BOOKING\.COM' literal here: normalize() strips dots before matching,
      // so a rule with `\.` in it could never fire. 'BOOKING\s*COM' below covers
      // both "BOOKING COM" and the pre-normalize form.
      'BOOKING\\s*COM',
      'BOOKING(?!.*PAYOUT)(?!.*DEPOSIT)',  // generic booking ≠ host payout
      'AIRBNB(?!.*PAYOUT)(?!.*DEPOSIT)',
      'EXPEDIA\\b',
      'TRIVAGO\\b',
      'HOTELS\\s*COM',
      'LASTMINUTE\\b',
      'EDREAMS\\b',
      'DESTINIA\\b',
      'RUMBO\\b',
      'LOGITRAVEL\\b',
      'KAYAK\\b',
      'SKYSCANNER\\b',
      'MOMONDO\\b',
      'DESPEGAR\\b',             // LATAM OTA
      'ALMUNDO\\b',              // AR OTA
      'VIAJES\\s*FALABELLA',
      // ── Accommodation ─────────────────────────────────────
      'HOTEL\\b',
      'HOSTAL\\b',
      'HOSTEL\\b',
      'APARTAMENTO\\s*TURIST',
      'MOTEL\\b',
      'RESORT\\b',
      'BED\\s*AND\\s*BREAKFAST',
      'INN\\b',
      // ── Train intercity ───────────────────────────────────
      'RENFE\\s*LARGO',
      'AVE\\s*BILLETE',
      'EUROSTAR\\b',
      'THALYS\\b',
      'INTERRAIL\\b',
      'TRAINTICKET\\b',
      // ── Travel insurance ──────────────────────────────────
      'SEGURO\\s*VIAJE',
      'TRAVEL\\s*INSURANCE',
      'MONDIAL\\s*ASSISTANCE',
      'IATI\\s*SEGUROS',
      'ASSIST\\s*CARD',          // LATAM travel assistance
    ], 0.97),
  },

  // ── expense / entertainment ──────────────────────────────
  {
    movement: 'EXPENSE',
    category: 'entertainment',
    rules: r([
      // ── Cinema ES ─────────────────────────────────────────
      'CINESA\\b',
      'YELMO\\s*CINES',
      'KINEPOLIS\\b',
      'UCI\\s*CINES',
      'MULTICINES\\b',
      'CINES\\s*MODERNO',
      'CINES\\s*VERDI',
      // ── Cinema AR ─────────────────────────────────────────
      'VILLAGE\\s*CINES',
      'HOYTS\\b',
      'SHOWCASE\\s*CINEMAS',
      'CINEMARK\\b',
      'CINES\\s*ATLAS',
      // ── Cinema CL ─────────────────────────────────────────
      'CINEMARK\\s*CL',
      'CINEMUNDO\\b',
      'CINE\\s*HOYTS\\s*CL',
      // ── Cinema UK/US ──────────────────────────────────────
      'ODEON\\b',
      'VUE\\s*CINEMA',
      'CINEWORLD\\b',
      'AMC\\s*CINEMA',
      'AMC\\s*THEATRE',
      'REGAL\\s*CINEMA',
      'CINEPOLIS\\b',
      'FANDANGO\\b',
      // ── Cinema generic ────────────────────────────────────
      'CINE\\b',
      'CINEMA\\b',
      // ── Theatre & concerts ────────────────────────────────
      'TEATRO\\b',
      'CONCIERTO\\b',
      'FESTIVAL\\b',
      'TICKETMASTER\\b',
      'ENTRADAS\\b',
      'EVENTBRITE\\b',
      'TICKETEA\\b',
      'ATRAPALO\\b',
      'SEATGEEK\\b',
      'STUBHUB\\b',
      'VIAGOGO\\b',
      'LIVENATION\\b',
      'PLATEATICKETS\\b',        // AR
      'TICKETEK\\b',             // AR/CL
      // ── Nightlife ─────────────────────────────────────────
      'DISCOTECA\\b',
      'DISCO\\b',
      'CLUB\\s*NOCTURNO',
      'SALA\\s*DE\\s*FIESTAS',
      'NIGHTCLUB\\b',
      'BOLICHE\\b',              // AR slang for nightclub
      // ── Activities ────────────────────────────────────────
      'BOWLING\\b',
      'KARTING\\b',
      'ESCAPE\\s*ROOM',
      'LASER\\s*TAG',
      'PARQUE\\s*DE\\s*ATRACCIONES',
      'WARNER\\s*PARK',
      'ZOO\\b',
      'ACUARIO\\b',
      'MUSEO\\b',
      'EXPOSICION\\b',
      'AVENTURA\\s*PARK',
      'GO\\s*KARTING',
      'MINIGOLF\\b',
      'TRAMPOLINA\\b',
      'PAINT\\s*BALL',
      // ── Gaming ────────────────────────────────────────────
      'STEAM\\b',
      'PLAYSTATION\\s*STORE',
      'PLAYSTATION\\s*NETWORK',
      'XBOX\\s*LIVE',
      'XBOX\\s*GAME',
      'NINTENDO\\s*ESHOP',
      'NINTENDO\\s*SWITCH',
      'EPIC\\s*GAMES',
      'GOG\\b',
      'HUMBLE\\s*BUNDLE',
      'GAMESTOP\\b',
      'EA\\s*GAMES',
      'BLIZZARD\\b',
      'RIOT\\s*GAMES',
      'APPLE\\s*ARCADE',
      'GOOGLE\\s*PLAY\\s*GAMES',
      // ── Gambling ES ───────────────────────────────────────
      'CASINO\\b',
      'BET365\\b',
      'CODERE\\b',
      'SPORTIUM\\b',
      'KIROLBET\\b',
      'TOMBOLA\\b',
      'LOTERIA\\s*NACIONAL',
      'ONCE\\b',
      'BONOLOTO\\b',
      'PRIMITIVA\\b',
      'EUROMILLONES\\b',
      // ── Gambling EN ───────────────────────────────────────
      'BETWAY\\b',
      'WILLIAM\\s*HILL',
      'LADBROKES\\b',
      'PADDY\\s*POWER',
      'BETFAIR\\b',
      'DRAFTKINGS\\b',
      'FANDUEL\\b',
      // ── Gambling AR ───────────────────────────────────────
      'BETSSON\\b',
      'CODERE\\s*AR',
      'PLAYTECH\\s*AR',
      'LOTERIAS\\s*PROVINCIALES',
    ], 0.95),
  },

  // ── expense / shopping ───────────────────────────────────
  // AMAZON here catches all Amazon that aren't Prime/Music/Video.
  {
    movement: 'EXPENSE',
    category: 'shopping',
    rules: r([
      // ── Online marketplaces ───────────────────────────────
      'AMAZON(?!\\s*PRIME)(?!\\s*MUSIC)(?!\\s*VIDEO)(?!\\s*SELLER)',
      'ALIEXPRESS\\b',
      'SHEIN\\b',
      'TEMU\\b',
      'EBAY\\b',
      'ZALANDO\\b',
      'ASOS\\b',
      'VINTED\\b',
      'WALLAPOP\\b',
      'MIRAVIA\\b',
      'PCCOMPONENTES\\b',
      'MEDIAMARKT\\b',
      'FNAC\\b',
      // ── Online marketplaces AR ────────────────────────────
      'MERCADOLIBRE\\b',
      'MERCADO\\s*LIBRE',
      'MERCADO\\s*PAGO(?!.*COBRO)(?!.*ACREDITACION)(?!.*VENTA)',  // buyer side
      'TIENDA\\s*NUBE',
      'LINIO\\b',
      'OLX\\b',
      // ── Online marketplaces CL ────────────────────────────
      'FALABELLA\\s*COM',
      'RIPLEY\\s*COM',
      'PARIS\\s*COM',
      'LIDER\\s*COM',
      // ── Department stores ES ──────────────────────────────
      'EL\\s*CORTE\\s*INGLES(?!.*SUPERMERCADO)',
      // ── Department stores US/UK ───────────────────────────
      'JOHN\\s*LEWIS',
      'MARKS\\s*AND\\s*SPENCER(?!.*FOOD)',
      'DEBENHAMS\\b',
      'SELFRIDGES\\b',
      'HARRODS\\b',
      'BLOOMINGDALES\\b',
      'NORDSTROM\\b',
      'MACY\\b',
      'TARGET(?!.*GROCERY)',
      'WALMART(?!.*GROCERY)',
      'KOHLS\\b',
      'JC\\s*PENNEY',
      // ── Department stores LATAM ───────────────────────────
      'FALABELLA\\b',
      'RIPLEY\\b',
      'PARIS\\b',
      'CORONA\\s*TIENDA',
      'LIVERPOOL\\s*TIENDA',     // MX
      // ── Fashion ES ────────────────────────────────────────
      'ZARA(?!.*HOME)',
      'PULL\\s*AND\\s*BEAR',
      'BERSHKA\\b',
      'STRADIVARIUS\\b',
      'MASSIMO\\s*DUTTI',
      'MANGO\\b',
      'HM\\b',
      'PRIMARK\\b',
      'SPRINGFIELD\\b',
      'WOMEN\\s*SECRET',
      'CORTEFIEL\\b',
      'PEDRO\\s*DEL\\s*HIERRO',
      'DESIGUAL\\b',
      'PEPE\\s*JEANS',
      'BOSS\\b',
      'TOMMY\\s*HILFIGER',
      'LEVIS\\b',
      'RALPH\\s*LAUREN',
      'LACOSTE\\b',
      'CALVIN\\s*KLEIN',
      'GUESS\\b',
      // ── Fashion UK/US ─────────────────────────────────────
      'NEXT\\b',
      'RIVER\\s*ISLAND',
      'TOPSHOP\\b',
      'BOOHOO\\b',
      'URBAN\\s*OUTFITTERS',
      'ANTHROPOLOGIE\\b',
      'FREE\\s*PEOPLE',
      'GAP\\b',
      'BANANA\\s*REPUBLIC',
      'OLD\\s*NAVY',
      'UNIQLO\\b',
      'FOREVER\\s*21',
      'H\\s*AND\\s*M',
      // ── Fashion AR/LATAM ──────────────────────────────────
      'MIMO\\b',
      'RAPSODIA\\b',
      'DAFITI\\b',
      'CHEEKY\\b',
      'KOAJ\\b',
      // ── Shoes ─────────────────────────────────────────────
      'FOOTLOCKER\\b',
      'FOOT\\s*LOCKER',
      'SNIPES\\b',
      'JD\\s*SPORTS',
      'NIKE\\b',
      'ADIDAS\\b',
      'PUMA\\b',
      'NEW\\s*BALANCE',
      'CONVERSE\\b',
      'VANS\\b',
      'SKECHERS\\b',
      'CAMPER\\b',
      // ── Home & deco ───────────────────────────────────────
      // Note: IKEA and LEROY MERLIN → shopping (not housing; housing = services)
      'IKEA\\b',
      'LEROY\\s*MERLIN',
      'BRICOMART\\b',
      'BRICO\\s*DEPOT',
      'BRICOR\\b',
      'ZARA\\s*HOME',
      'HABITAT\\b',
      'THE\\s*WHITE\\s*COMPANY',
      'DUNELM\\b',
      'B\\s*AND\\s*Q',
      'HOMEBASE\\b',
      'CASAS\\s*BAHIA',          // BR
      'EASY\\s*TIENDA',          // AR home depot equivalent
      // ── Electronics ───────────────────────────────────────
      'APPLE\\s*STORE',
      'APPLE\\s*COM',
      'CURRYS\\b',
      'PC\\s*WORLD',
      'BEST\\s*BUY',
      'WORTEN\\b',
      'MUSIMUNDO\\b',            // AR electronics
      'GARBARINO\\b',            // AR electronics
      'FRAVEGA\\b',              // AR electronics
      'MEGATONE\\b',             // AR electronics
      // ── Luxury ────────────────────────────────────────────
      'LOUIS\\s*VUITTON',
      'GUCCI\\b',
      'PRADA\\b',
      'HERMES\\b',
      'BALENCIAGA\\b',
      'BURBERRY\\b',
      // ── Bill aggregators LATAM ────────────────────────────
      // These are service payment networks — categorized as other_expense
      // NOT here: RAPIPAGO, PAGOFACIL, ABITAB, REDPAGOS → other_expense
      // ── Generic purchase keywords ─────────────────────────
      'REGALO\\b',               // "REGALO KINDLE" etc → shopping
      'COMPRA\\b',
    ], 0.95),
  },

  // ── expense / sports ──────────────────────────────────────
  {
    movement: 'EXPENSE',
    category: 'sports',
    rules: r([
      // ── Winter sports ─────────────────────────────────────
      'SKI\\b',
      'ESQUI\\b',
      'SNOWBOARD\\b',
      'ESTACION\\s*ESQUI',
      'FORFAIT\\b',
      // ── Other sports ──────────────────────────────────────
      'DEPORTE\\b',
      'DEPORTES\\b',
      'FUTBOL\\b',
      'PADEL\\b',
      'TENIS\\b',
      'NATACION\\b',
      'PISCINA\\b',
      'PILATES\\b',
      'YOGA\\b',
      'RUNNING\\b',
      'MARATON\\b',
      'CICLISMO\\b',
      'BICICLETA\\b',
      'SURF\\b',
      'ESCALADA\\b',
      'CLIMBING\\b',
      'BOXING\\b',
      'BOXEO\\b',
      'MARTIAL\\s*ARTS',
      'ARTES\\s*MARCIALES',
      'CROSSFIT\\b',
      'SPINNING\\b',
      // ── Sports facilities ─────────────────────────────────
      'POLIDEPORTIVO\\b',
      'CANCHA\\b',
      'CLUB\\s*DEPORTIVO',
      'CENTRO\\s*DEPORTIVO',
      // ── EN ────────────────────────────────────────────────
      'SPORTS\\b',
      'ATHLETIC\\b',
      'SKIING\\b',
      'GOLF\\s*CLUB',
      'TENNIS\\s*CLUB',
      'SWIM\\b',
      'SWIMMING\\s*POOL',
      'ICE\\s*SKATING',
      'SKATING\\b',
    ], 0.95),
  },

  // ── expense / education ───────────────────────────────────
  {
    movement: 'EXPENSE',
    category: 'education',
    rules: r([
      // ── Online learning ───────────────────────────────────
      'UDEMY\\b',
      'COURSERA\\b',
      'DOMESTIKA\\b',
      'OPENWEBINARS\\b',
      'PLATZI\\b',
      'LINKEDIN\\s*LEARNING',
      'SKILLSHARE\\b',
      'MASTERCLASS\\b',
      'CODECADEMY\\b',
      'PLURALSIGHT\\b',
      'DATACAMP\\b',
      'BRILLIANT\\b',
      'EDX\\b',
      'FUN\\s*MOOC',
      'UDACITY\\b',
      'TREEHOUSE\\b',
      'CODERHOUSE\\b',           // LATAM
      'ALKEMY\\b',               // AR
      'DESAFIO\\s*LATAM',        // LATAM bootcamp
      // ── Languages ─────────────────────────────────────────
      'DUOLINGO\\b',
      'BABBEL\\b',
      'BUSUU\\b',
      'PREPLY\\b',
      'LINGODA\\b',
      'ITALKI\\b',
      'ROSETTA\\s*STONE',
      'PIMSLEUR\\b',
      // ── Books ─────────────────────────────────────────────
      'LIBRERIA\\b',
      'CASA\\s*DEL\\s*LIBRO',
      'KINDLE\\b',
      'AMAZON\\s*KINDLE',
      'EL\\s*ATENEO',            // AR bookstore
      'CUSPIDE\\b',              // AR bookstore
      'ANTARTICA\\b',            // CL bookstore
      'LIBRERIA\\s*NACIONAL',
      // ── School fees ES ────────────────────────────────────
      'MATRICULA\\b',
      'TASA\\s*UNIVERSITARIA',
      'ESCUELA\\b',
      'FORMACION\\b',
      'CERTIFICACION\\b',
      'EXAMEN\\b',
      'ACADEMIA\\b',
      'OPOSICION\\b',
      'SELECTIVIDAD\\b',
      // ── School fees LATAM ─────────────────────────────────
      'CUOTA\\s*COLEGIO',
      'ARANCEL\\s*UNIVERSITARIO',
      'ARANCEL\\s*COLEGIO',
      'MATRICULA\\s*UNIVERSITARIA',
      'PENSION\\s*COLEGIO',      // AR monthly school fee (not pension)
      'CUOTA\\s*UNIVERSIDAD',
      'CUOTA\\s*INSTITUTO',
      // ── School fees US/UK ─────────────────────────────────
      'TUITION\\b',
      'SCHOOL\\s*FEES',
      'UNIVERSITY\\s*FEES',
      'STUDENT\\s*FEES',
      'EXAMINATION\\s*FEES',
      'COURSE\\s*FEES',
      'TRAINING\\s*FEES',
      'WORKSHOP\\s*FEES',
      'COLLEGE\\s*TUITION',
    ], 0.95),
  },

  // ── expense / insurance ───────────────────────────────────
  {
    movement: 'EXPENSE',
    category: 'insurance',
    rules: r([
      // ── ES insurers (generic — no housing/auto/health qualifier) ─
      'MAPFRE(?!.*HOGAR)(?!.*AUTO)(?!.*SALUD)',
      'ALLIANZ(?!.*HOGAR)',
      'AXA(?!.*SALUD)',
      'GENERALI(?!.*SALUD)',
      'MUTUA\\s*MADRILENA',
      'LINEA\\s*DIRECTA',
      'VERTI\\b',
      'FIATC\\b',
      'HELVETIA\\b',
      'ZURICH\\b',
      'PELAYO\\b',
      'OCASO\\b',
      'CASER\\b',
      'REALE\\s*SEGUROS',
      'SANTALUCIA\\b',
      // ── AR insurers ───────────────────────────────────────
      'SANCOR\\s*SEGUROS',
      'ZURICH\\s*AR',
      'FEDERACION\\s*PATRONAL',
      'LA\\s*SEGUNDA',
      'EXPERTA\\s*SEGUROS',
      'MERIDIONAL\\s*SEGUROS',
      'GALENO\\s*SEGUROS',
      'FIANZAS\\s*Y\\s*CREDITO',
      'PREVENCIÓN\\s*ART',
      'PREVISION\\s*ART',
      'GALICIA\\s*SEGUROS',
      'NACION\\s*SEGUROS',
      'SMG\\s*SEGUROS',
      // ── CL insurers ───────────────────────────────────────
      'BICE\\s*VIDA',
      'CONSORCIO\\s*SEGUROS',
      'METLIFE\\b',
      'LIBERTY\\s*SEGUROS',
      'HDI\\s*SEGUROS',
      'RSA\\s*SEGUROS',
      'MAPFRE\\s*CL',
      // ── UY insurers ───────────────────────────────────────
      'MAPFRE\\s*UY',
      'SURA\\s*SEGUROS',
      'BSE\\b',                  // Banco de Seguros del Estado UY
      'PORTO\\s*SEGURO',
      // ── UK insurers ───────────────────────────────────────
      'DIRECT\\s*LINE',
      'ADMIRAL\\b',
      'AVIVA\\b',
      'HASTINGS\\b',
      'CHURCHILL\\b',
      'LV\\s*INSURANCE',
      'NFU\\s*MUTUAL',
      // ── US insurers ───────────────────────────────────────
      'STATE\\s*FARM',
      'ALLSTATE\\b',
      'GEICO\\b',
      'PROGRESSIVE\\s*INSURANCE',
      'NATIONWIDE\\s*INSURANCE',
      'TRAVELERS\\s*INSURANCE',
      'LIBERTY\\s*MUTUAL',
      'FARMERS\\s*INSURANCE',
      // ── Generic insurance ─────────────────────────────────
      'SEGURO\\s*VIDA',
      'SEGURO\\s*ACCIDENTE',
      'PRIMA\\s*SEGURO',
      'RECIBO\\s*SEGURO',
      'INSURANCE\\s*PREMIUM',
      'LIFE\\s*INSURANCE',
      'INCOME\\s*PROTECTION',
      'CRITICAL\\s*ILLNESS',
      'RENTERS\\s*INSURANCE',
    ], 0.97),
  },

  // ── expense / pets ────────────────────────────────────────
  {
    movement: 'EXPENSE',
    category: 'pets',
    rules: r([
      // Vet ES/LATAM
      'VETERINARI\\b',
      'VETERINARIO\\b',
      'CLINICA\\s*VETERINARIA',
      'HOSPITAL\\s*VETERINARIO',
      'CONSULTA\\s*VETERINARIA',
      // Pet shops ES
      'KIWOKO\\b',
      'TIENDANIMAL\\b',
      'ZOOPLUS\\b',
      'MISCOTA\\b',
      'ANIMALEAR\\b',
      // Pet shops AR
      'PETCO\\s*AR',
      'PUPPIS\\b',
      'MAXIDOG\\b',
      'TIERRAGRO\\b',
      // Pet shops UK/US
      'PETS\\s*AT\\s*HOME',
      'PETSMART\\b',
      'PETCO\\b',
      'PET\\s*SUPPLIES\\s*PLUS',
      'PETFOOD\\b',
      // Pet food brands
      'ROYAL\\s*CANIN',
      'PIENSO\\b',
      'HILL\\s*S\\s*PET',
      'PURINA\\b',
      'WHISKAS\\b',
      'FELIX\\s*CAT',
      'ALIMENTO\\s*MASCOTAS',
      // Pet services
      'RESIDENCIA\\s*CANINA',
      'PELUQUERIA\\s*CANINA',
      'ADIESTRAMIENTO\\b',
      'GROOMING\\b',
      'PET\\s*GROOMING',
      'DOG\\s*GROOMING',
      'VETERINARY\\b',
      'VET\\s*BILL',
      'PET\\s*INSURANCE',
    ], 0.97),
  },

  // ── expense / personal_services ──────────────────────────
  {
    movement: 'EXPENSE',
    category: 'personal_services',
    rules: r([
      // Hair & beauty ES/LATAM
      'PELUQUERIA\\b',
      'BARBERIA\\b',
      'BARBER\\b',
      'SALON\\s*DE\\s*BELLEZA',
      'CENTRO\\s*ESTETICA',
      'ESTETICA\\b',
      'MANICURA\\b',
      'PEDICURA\\b',
      'SPA\\b',
      'MASAJE\\b',
      'DEPILACION\\b',
      'CENTRO\\s*DEPILACION',
      'LASER\\s*DEPILACION',
      // Hair & beauty EN
      'HAIR\\s*SALON',
      'BEAUTY\\s*SALON',
      'BARBERSHOP\\b',
      'NAIL\\s*SALON',
      'MASSAGE\\s*THERAPY',
      'HAIRDRESSER\\b',
      'BEAUTY\\s*TREATMENT',
      // Laundry ES/LATAM
      'LAVANDERIA\\b',
      'TINTORERIA\\b',
      'LIMPIEZA\\s*ROPA',
      // Laundry EN
      'LAUNDRY\\b',
      'DRY\\s*CLEANING',
      'DRY\\s*CLEANER',
      'LAUNDERETTE\\b',
      'LAUNDROMAT\\b',
      // Repairs & trades
      'SASTRE\\b',
      'REPARACION\\s*CALZADO',
      'ZAPATERO\\b',
      'CERRAJERO\\b',
      'PLOMERO\\b',              // LATAM plumber
      'GASFITER\\b',             // CL plumber
      'MUDANZA\\b',
      'MOVING\\s*SERVICE',
      'CLEANING\\s*SERVICE',
      'SERVICIO\\s*LIMPIEZA',
      // Professional services
      'GESTOR\\b',
      'GESTORIA\\b',
      'ASESORIA\\b',
      'NOTARI\\b',
      'ABOGADO\\b',
      'SOLICITOR\\b',
      'ACCOUNTANT\\b',
      'CONTADOR\\b',
      'ESTUDIO\\s*CONTABLE',
    ], 0.95),
  },

  // ── expense / family ──────────────────────────────────────
  {
    movement: 'EXPENSE',
    category: 'family',
    rules: r([
      // ES/LATAM
      'GUARDERIA\\b',
      'JARDIN\\s*DE\\s*INFANCIA',
      'JARDIN\\s*MATERNAL',      // AR
      'JARDIN\\s*INFANTES',      // AR
      'CANGURO\\b',
      'PENSION\\s*ALIMENTICIA',
      'CUOTA\\s*ALIMENTARIA',    // AR
      'ALIMENTOS\\s*MENORES',    // LATAM
      'LUDOTECA\\b',
      'COLONIA\\s*DE\\s*VACACIONES',  // AR summer camp
      'ACTIVIDAD\\s*EXTRAESCOLAR',
      // EN
      'NURSERY\\b',
      'CHILDCARE\\b',
      'CHILD\\s*CARE',
      'DAYCARE\\b',
      'AFTER\\s*SCHOOL',
      'SCHOOL\\s*TRIP',
      'SCHOOL\\s*UNIFORM',
      'NANNY\\b',
      'AU\\s*PAIR',
      'CHILD\\s*MAINTENANCE',
      'CHILD\\s*SUPPORT',
    ], 0.95),
  },

  // ── expense / donations ───────────────────────────────────
  {
    movement: 'EXPENSE',
    category: 'donations',
    rules: r([
      // ES/LATAM
      'DONACION\\b',
      'DONATIVO\\b',
      'ONG\\b',
      'CRUZ\\s*ROJA',
      'MEDICOS\\s*SIN\\s*FRONTERAS',
      'UNICEF\\b',
      'CARITAS\\b',
      'ALDEAS\\s*INFANTILES',
      'AMNISTIA\\s*INTERNACIONAL',
      'GREENPEACE\\b',
      'WWF\\b',
      'TECHO\\b',                // LATAM housing NGO
      'BANCO\\s*DE\\s*ALIMENTOS',
      'FUNDACION\\b',
      // EN
      'CHARITY\\b',
      'DONATE\\b',
      'DONATION\\b',
      'GOFUNDME\\b',
      'PATREON\\b',
      'SAVE\\s*THE\\s*CHILDREN',
      'OXFAM\\b',
      'RED\\s*CROSS',
      'CANCER\\s*RESEARCH',
      'MACMILLAN\\b',
      'SHELTER\\b',
      'MIND\\b',
      'RSPCA\\b',
      'AMERICAN\\s*RED\\s*CROSS',
      'SALVATION\\s*ARMY',
      'HABITAT\\s*FOR\\s*HUMANITY',
      'DOCTORS\\s*WITHOUT\\s*BORDERS',
    ], 0.97),
  },

  // ── expense / other_expense ───────────────────────────────
  // Catch-all for known-but-unclassifiable patterns.
  // Only add patterns here that you KNOW are expenses but can't
  // determine the subcategory from the description alone.
  {
    movement: 'EXPENSE',
    category: 'other_expense',
    rules: r([
      // ── AR: Bill payment networks ──────────────────────────
      // These can pay ANY utility, phone, or service — no sub-category possible.
      'RAPIPAGO\\b',
      'PAGO\\s*FACIL',
      'PAGOFACIL\\b',
      'BAPRO\\s*PAGOS',
      'PROVINCIA\\s*NET',
      'COBRANZA\\s*RED',
      'COBROS\\s*NET',
      'RED\\s*LINK\\s*PAGO',
      'MERCADO\\s*PAGO\\s*PAGO',   // MP used to pay (not receive)
      // ── UY: Bill payment networks ─────────────────────────
      'ABITAB\\b',
      'REDPAGOS\\b',
      'RED\\s*PAGOS',
      // ── CL: Bill payment networks ─────────────────────────
      'KLAP\\b',
      'MULTICAJA\\b',
      // ── Generic ATM / cash ────────────────────────────────
      'CAJERO\\s*AUTOMATICO',
      'EXTRACCION\\s*EFECTIVO',
      'ATM\\s*WITHDRAWAL',
      'CASH\\s*WITHDRAWAL',
      'RETIRO\\s*EFECTIVO',
      'RETIRO\\s*ATM',
      // ── Bank fees ─────────────────────────────────────────
      'COMISION\\s*BANCARIA',
      'COMISION\\s*MANTENIMIENTO',
      'CUOTA\\s*TARJETA',
      'COSTO\\s*TARJETA',
      'BANK\\s*FEE',
      'ACCOUNT\\s*FEE',
      'OVERDRAFT\\s*FEE',
      'WIRE\\s*FEE',
      'TRANSFER\\s*FEE',
      'FOREIGN\\s*TRANSACTION\\s*FEE',
      'FX\\s*FEE',
      'ANNUAL\\s*FEE',
      // ── Generic purchase signals ───────────────────────────
      'PAGO\\s*EN\\s*COMERCIO',
      'COMPRA\\s*EN\\s*COMERCIO',
    ], 0.80),
  },
];

// ─────────────────────────────────────────────────────────────
// USER CONTEXT
// ─────────────────────────────────────────────────────────────

/**
 * Optional runtime context about the account holder.
 * Built from the Supabase user row + onboarding data at runtime.
 * Never hardcode values here — always inject from your DB.
 *
 * @example
 * const ctx: UserContext = {
 *   firstName:        user.first_name,
 *   lastName:         user.last_name,
 *   country:          user.country,          // from onboarding step 7
 *   customCategories: user.custom_categories, // from profile settings
 *   jointAccountNames: user.joint_account_names,
 * };
 */
export interface UserContext {
  /** User's first name as entered at signup — normalized internally */
  firstName: string;
  /** User's last name as entered at signup — normalized internally */
  lastName:  string;

  /**
   * User's primary country — from onboarding step 7.
   * Used to boost confidence on country-specific patterns and
   * disambiguate keywords that exist in multiple countries.
   *
   * Examples of disambiguation:
   *   "PERSONAL" + country=AR → housing (AR mobile carrier)
   *   "FLOW"     + country=AR → subscriptions (Cablevisión streaming)
   *   "FLOW"     + country=CL → own_transfer (CL payment platform)
   *   "COPEC"    + country=CL → transport (fuel station)
   */
  country?: 'ES' | 'AR' | 'CL' | 'UY' | 'US';


  /**
   * Optional extra name aliases for the same person.
   * Use for: nicknames, maiden name, second surname, hyphenated names.
   * Each alias is matched paired with lastName.
   *
   * Populated from user profile settings in the app.
   * @example aliases: ["Mari", "María José"]
   */
  aliases?: string[];

  /**
   * Joint / shared accounts where the user is a co-holder.
   * Any transaction mentioning one of these name strings is treated
   * as an own_transfer — even if the primary holder is someone else.
   *
   * Format: the name exactly as it appears on bank statements.
   * The categorizer normalizes it internally (strips accents, uppercases).
   * Populated from a "joint accounts" section in user profile settings.
   *
   * @example
   * // Joint account appears on statements as "Ana Ruiz & Carlos Fernandez"
   * // User adds the co-holder's name:
   * jointAccountNames: ["Carlos Fernandez", "Fernandez Ruiz"]
   *
   * IMPORTANT: use names specific enough to avoid false positives.
   */
  jointAccountNames?: string[];

  /**
   * User-defined custom categories — created in profile settings.
   *
   * The user writes a display name + a list of keywords.
   * Any transaction whose description contains one of those keywords
   * is classified into the custom category BEFORE standard rules run.
   * This lets users override standard categorization for specific merchants.
   *
   * Keywords are matched exactly like standard patterns:
   * normalized (no accents, uppercase) and tested as regex substrings.
   *
   * @example
   * // User creates "Ropa Bebé" with keywords ["Zara Kids", "Prenatal"]
   * // A transaction "ZARA KIDS MADRID 29.99" → custom category "Ropa Bebé"
   * // instead of the standard "shopping" it would normally get.
   *
   * customCategories: [
   *   {
   *     slug:     'ropa_bebe',
   *     name:     'Ropa Bebé',
   *     movement: 'EXPENSE',
   *     keywords: ['Zara Kids', 'H&M Kids', 'Prenatal'],
   *   },
   *   {
   *     slug:     'gastos_mascota',
   *     name:     'Gastos Mascota',
   *     movement: 'EXPENSE',
   *     keywords: ['Kiwoko', 'Tiendanimal', 'Clínica Vet López'],
   *   },
   * ]
   *
   * DB schema (Supabase):
   *   custom_categories: jsonb  -- array of CustomCategory objects
   */
  customCategories?: CustomCategory[];
}

/**
 * A user-defined category with keyword-based matching rules.
 * Created by the user in profile settings — not hardcoded.
 *
 * slug:     URL-safe identifier, auto-generated from name
 *           e.g. "Ropa Bebé" → "ropa_bebe"
 *           Prefixed with "custom_" in CategorizationResult to
 *           distinguish from standard categories.
 *           e.g. category = "custom_ropa_bebe"
 *
 * name:     Display name shown in the UI (preserves original casing/accents)
 *
 * movement: Whether this is an EXPENSE or INCOME category.
 *           Most custom categories will be EXPENSE.
 *
 * keywords: List of strings to match against the normalized description.
 *           Each keyword is tested as a case-insensitive substring.
 *           Keep keywords specific enough to avoid false positives.
 *           e.g. "Zara Kids" is safer than just "Zara" (already in shopping)
 */
export interface CustomCategory {
  slug:     string;
  name:     string;
  movement: 'EXPENSE' | 'INCOME';
  keywords: string[];
}

/**
 * Build all name patterns to check for a given UserContext.
 *
 * Matching strategy:
 *   Personal name: requires BOTH first + last name (avoids false positives).
 *   Joint account: matches the full joint account name as a literal string,
 *   OR the partner's full name (first + last) when provided in jointAccountNames.
 */
function buildPersonalNamePatterns(ctx: UserContext): RegExp[] {
  const first = normalize(ctx.firstName);
  const last  = normalize(ctx.lastName);

  const patterns: RegExp[] = [
    new RegExp(`${first}\\s+${last}`, 'i'),
    new RegExp(`${last}\\s+${first}`, 'i'),
    new RegExp(`${first.charAt(0)}[\\s.]+${last}`, 'i'),
    new RegExp(`${last}[\\s,]+${first.charAt(0)}\\b`, 'i'),
  ];

  if (ctx.aliases) {
    for (const alias of ctx.aliases) {
      const a = normalize(alias);
      patterns.push(new RegExp(`${a}\\s+${last}`, 'i'));
      patterns.push(new RegExp(`${last}\\s+${a}`, 'i'));
    }
  }

  return patterns;
}

// ─────────────────────────────────────────────────────────────
// MAIN CATEGORIZER
// ─────────────────────────────────────────────────────────────

/**
 * Categorize a single transaction using rule-based matching.
 *
 * @param description  Raw transaction description from the bank statement
 * @param amount       Signed amount (negative = debit, positive = credit)
 * @param ctx          Optional user context for name-based self-transfer detection
 * @returns CategorizationResult if a rule fired, null → send to Capa 2 (ML)
 *
 * ─── TRANSFER LOGIC ───────────────────────────────────────────
 *
 * Step 1 — Name match (highest priority):
 *   If the description contains the user's first + last name,
 *   it is an own_transfer regardless of other keywords.
 *   e.g. "Bizum a [user's name]" → own_transfer (confidence 0.99)
 *
 * Step 2 — Investment platform name:
 *   If the description mentions a known broker/exchange,
 *   it is a to_investment.
 *   "COCOS CAPITAL 500" → to_investment (confidence 0.99)
 *
 * Step 3 — Own-account keywords:
 *   Neobank names, "DESDE BBVA", "Traspaso entre cuentas", etc.
 *   → own_transfer at varying confidence (0.75–0.99)
 *
 * Step 4 — Everything else:
 *   A "Bizum a [someone not me]" gets NO transfer match here
 *   and falls through to null → Capa 2 ML will classify it as
 *   gifts_given or other_expense based on training data.
 *
 * ─── DASHBOARD IMPACT ─────────────────────────────────────────
 *   own_transfer       → invisible in expense dashboard (neutral move)
 *   to_investment      → visible only in Investments module
 *   investments_income → visible in Income dashboard
 *   everything else    → visible in Expense or Income dashboard
 *
 * @example
 * // ctx is built from the logged-in user's DB row — never hardcoded:
 * const ctx: UserContext = {
 *   firstName:        user.first_name,
 *   lastName:         user.last_name,
 *   jointAccountNames: user.joint_account_names, // set in profile settings
 * };
 *
 * // Own account — name detected → hidden from dashboard
 * categorize("BIZUM A " + user.full_name.toUpperCase(), -50, ctx)
 * // → own_transfer ✓
 *
 * // Joint account — partner's name detected → also hidden
 * categorize("TRANSFERENCIA CTA " + jointHolder.toUpperCase(), -200, ctx)
 * // → own_transfer ✓
 *
 * // Third party — no match → goes to ML → classified as expense
 * categorize("BIZUM A PEDRO GARCIA", -17.70, ctx)
 * // → null → ML → gifts_given / other_expense
 *
 * // Investment platform → Investments module only
 * categorize("COCOS CAPITAL TRANSFERENCIA", -5000, ctx)
 * // → to_investment ✓
 */
export function categorize(
  description: string,
  amount: number,
  ctx?: UserContext,
): CategorizationResult | null {
  const norm = normalize(description);

  // ── Step 1: Name-based transfer detection ───────────────────
  // Runs before everything.
  // 1a. Joint account names → to_joint_account (checked first, more specific)
  // 1b. User's own name → own_transfer
  if (ctx?.firstName && ctx?.lastName) {
    // Check joint account names first (more specific)
    if (ctx.jointAccountNames?.length) {
      for (const name of ctx.jointAccountNames) {
        const normName = normalize(name);
        if (new RegExp(normName, 'i').test(norm)) {
          return {
            movement:    'TRANSFER',
            category:    'to_joint_account',
            confidence:  0.99,
            matchedRule: 'JOINT_ACCOUNT_NAME_MATCH',
          };
        }
      }
    }

    // Then check user's own name
    const personalPatterns = buildPersonalNamePatterns(ctx);
    for (const pattern of personalPatterns) {
      if (pattern.test(norm)) {
        return {
          movement:    'TRANSFER',
          category:    'own_transfer',
          confidence:  0.99,
          matchedRule: 'USER_NAME_MATCH',
        };
      }
    }
  }

  // ── Step 2: User-defined custom categories ─────────────────
  // Runs BEFORE standard rules so the user can override any
  // standard categorization for specific merchants.
  //
  // Uses fuzzy token matching so variations of a merchant name
  // still match the user's keyword:
  //   keyword: "Clínica Vet López"
  //   "VET LOPEZ CONSULTA"     → matched (2 of 3 tokens) ✓
  //   "CLINICA VET LOPEZ"      → matched (3 of 3 tokens) ✓
  //   "LOPEZ FARMACIA CENTRO"  → not matched (1 of 3 tokens) ✗
  //
  // Category slug in result is prefixed with "custom_" so the
  // frontend can distinguish custom from standard categories.
  if (ctx?.customCategories?.length) {
    for (const cc of ctx.customCategories) {
      for (const keyword of cc.keywords) {
        const { matched } = fuzzyMatch(keyword, norm);
        if (matched) {
          return {
            movement:    cc.movement,
            category:    `custom_${cc.slug}` as Category,
            confidence:  0.95,
            matchedRule: `CUSTOM:${cc.slug}:${keyword}`,
          };
        }
      }
    }
  }

  // ── Step 3: Standard rule buckets ─────────────────────────
  // country from ctx is used to boost confidence on matches
  // from country-specific patterns (see confidence values in buckets).
  // Currently: all country patterns work without country hint,
  // but future versions can use ctx.country to filter or boost.
  for (const bucket of RULE_BUCKETS) {
    for (const rule of bucket.rules) {
      if (rule.pattern.test(norm)) {
        return {
          movement:    bucket.movement,
          category:    bucket.category,
          confidence:  rule.confidence,
          matchedRule: rule.label,
        };
      }
    }
  }

  // No rule fired → send to Capa 2 (ML model)
  return null;
}
