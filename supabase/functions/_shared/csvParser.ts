// Deterministic CSV parser for the imports pipeline.
//
// Attempts to parse bank-statement CSVs without AI by detecting headers, delimiter,
// date format, and amount format. Returns null when confidence is too low — the caller
// falls back to AI extraction. This avoids ~2000 input + ~1500 output tokens per import
// for the 40-60% of CSVs that have standard, recognizable column layouts.

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface DeterministicRow {
  posted_date: string;       // ISO YYYY-MM-DD
  description_raw: string;
  amount_signed: number;
  running_balance: number | null;
  currency: string | null;
}

export interface DeterministicParseResult {
  transactions: DeterministicRow[];
  headerRow: number;
  delimiter: string;
}

// ─── Header synonyms (lowercase, trimmed) ───────────────────────────────────────

const DATE_HEADERS = new Set([
  'date', 'fecha', 'datum', 'data', 'dato', 'posted', 'posted_date', 'posted date',
  'booking', 'booking date', 'bookingdate', 'transaction date', 'transactiondate',
  'value date', 'valuedate', 'trade date', 'tradedate', 'operation date',
  'f. valor', 'f. operación', 'f. operacion', 'fecha valor', 'fecha operación',
  'fecha operacion', 'fecha contable', 'buchungstag', 'buchungsdatum', 'wertstellung',
  'date de valeur', 'date opération', 'date operation', 'data operazione',
  'data contabile', 'data movimento', 'completed date', 'started date',
]);

const DESC_HEADERS = new Set([
  'description', 'descripción', 'descripcion', 'concept', 'concepto', 'detalle',
  'detalles', 'details', 'detail', 'reference', 'referencia', 'narrative',
  'movimiento', 'movimento', 'merchant', 'payee', 'beneficiary', 'beneficiario',
  'bezeichnung', 'beschreibung', 'buchungstext', 'verwendungszweck',
  'libellé', 'libelle', 'descrizione', 'name / description', 'transaction',
  'transactions', 'memo', 'remarks', 'remark', 'particular', 'particulars',
]);

const AMOUNT_HEADERS = new Set([
  'amount', 'importe', 'monto', 'montant', 'importo', 'valor', 'betrag',
  'amount (eur)', 'amount (usd)', 'amount (gbp)', 'total amount',
  'transaction amount', 'money', 'sum', 'suma',
]);

const DEBIT_HEADERS = new Set([
  'debit', 'débito', 'debito', 'cargo', 'debe', 'expenses', 'paid out',
  'money out', 'soll', 'débit', 'uscita', 'uscite', 'withdrawal', 'withdrawals',
]);

const CREDIT_HEADERS = new Set([
  'credit', 'crédito', 'credito', 'abono', 'haber', 'income', 'paid in',
  'money in', 'haben', 'crédit', 'entrata', 'entrate', 'deposit', 'deposits',
]);

const BALANCE_HEADERS = new Set([
  'balance', 'saldo', 'kontostand', 'solde', 'saldos', 'running balance',
  'running_balance', 'account balance', 'available balance', 'closing balance',
]);

const CURRENCY_HEADERS = new Set([
  'currency', 'moneda', 'divisa', 'währung', 'waehrung', 'devise', 'valuta', 'ccy',
]);

// ─── Delimiter detection ────────────────────────────────────────────────────────

const CANDIDATE_DELIMITERS = [',', ';', '\t', '|'] as const;

function detectDelimiter(lines: string[]): string {
  const sample = lines.slice(0, Math.min(10, lines.length));

  let best = ',';
  let bestScore = -1;

  for (const delim of CANDIDATE_DELIMITERS) {
    const counts = sample.map((l) => {
      // Don't count delimiters inside quoted fields
      let count = 0;
      let inQuote = false;
      for (const ch of l) {
        if (ch === '"') inQuote = !inQuote;
        else if (ch === delim && !inQuote) count++;
      }
      return count;
    });

    if (counts.every((c) => c === 0)) continue;

    // Consistency: how many lines share the most common count?
    const freq = new Map<number, number>();
    for (const c of counts) freq.set(c, (freq.get(c) ?? 0) + 1);
    const maxFreq = Math.max(...freq.values());
    const modeCount = [...freq.entries()].find(([, v]) => v === maxFreq)![0];

    // Score = consistency × column count (prefer more columns, penalize inconsistency)
    const score = (maxFreq / sample.length) * modeCount;
    if (score > bestScore) {
      bestScore = score;
      best = delim;
    }
  }

  return best;
}

// ─── CSV line splitting (RFC 4180 aware) ────────────────────────────────────────

function splitCsvLine(line: string, delim: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuote = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuote = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuote = true;
      } else if (ch === delim) {
        fields.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

// ─── Header detection ───────────────────────────────────────────────────────────

interface ColumnMap {
  date: number;
  description: number;
  amount: number | null;       // single amount column
  debit: number | null;        // split debit/credit
  credit: number | null;
  balance: number | null;
  currency: number | null;
}

function findHeaderRow(
  lines: string[],
  delim: string,
): { row: number; columns: ColumnMap } | null {
  // Check first 8 lines — some CSVs have metadata rows before the header.
  const limit = Math.min(8, lines.length);

  for (let r = 0; r < limit; r++) {
    const fields = splitCsvLine(lines[r], delim);
    if (fields.length < 2) continue;

    const normalized = fields.map((f) =>
      f.toLowerCase().replace(/^["'\s]+|["'\s]+$/g, '').replace(/\s+/g, ' '),
    );

    let dateCol = -1;
    let descCol = -1;
    let amountCol: number | null = null;
    let debitCol: number | null = null;
    let creditCol: number | null = null;
    let balanceCol: number | null = null;
    let currencyCol: number | null = null;

    for (let c = 0; c < normalized.length; c++) {
      const h = normalized[c];
      if (dateCol === -1 && DATE_HEADERS.has(h)) dateCol = c;
      else if (descCol === -1 && DESC_HEADERS.has(h)) descCol = c;
      else if (amountCol === null && AMOUNT_HEADERS.has(h)) amountCol = c;
      else if (debitCol === null && DEBIT_HEADERS.has(h)) debitCol = c;
      else if (creditCol === null && CREDIT_HEADERS.has(h)) creditCol = c;
      else if (balanceCol === null && BALANCE_HEADERS.has(h)) balanceCol = c;
      else if (currencyCol === null && CURRENCY_HEADERS.has(h)) currencyCol = c;
    }

    // Minimum: date + description + (amount OR debit/credit)
    const hasAmount = amountCol !== null || (debitCol !== null && creditCol !== null);
    if (dateCol >= 0 && descCol >= 0 && hasAmount) {
      return {
        row: r,
        columns: {
          date: dateCol,
          description: descCol,
          amount: amountCol,
          debit: debitCol,
          credit: creditCol,
          balance: balanceCol,
          currency: currencyCol,
        },
      };
    }
  }

  return null;
}

// ─── Date parsing ───────────────────────────────────────────────────────────────

type DateOrder = 'DMY' | 'MDY' | 'YMD';

function inferDateOrder(dateStrings: string[]): DateOrder {
  // If any date has day > 12, it disambiguates DMY vs MDY.
  let sawDayAbove12 = false;
  let sawMonthAbove12 = false;

  for (const s of dateStrings) {
    const parts = s.replace(/[./-]/g, '/').split('/');
    if (parts.length !== 3) continue;
    const nums = parts.map((p) => parseInt(p, 10));
    if (nums.some(Number.isNaN)) continue;

    // YYYY-MM-DD or YYYY/MM/DD
    if (nums[0] > 100) return 'YMD';

    // parts[0] and parts[1] — which could be day or month
    if (nums[0] > 12) sawDayAbove12 = true;
    if (nums[1] > 12) sawMonthAbove12 = true;
  }

  if (sawDayAbove12 && !sawMonthAbove12) return 'DMY';
  if (sawMonthAbove12 && !sawDayAbove12) return 'MDY';

  // Ambiguous — default to DMY (European), which is more common globally
  return 'DMY';
}

function parseDate(raw: string, order: DateOrder): string | null {
  const cleaned = raw.trim().replace(/[./-]/g, '/');
  const parts = cleaned.split('/');
  if (parts.length !== 3) return null;

  let d: number, m: number, y: number;
  const nums = parts.map((p) => parseInt(p, 10));
  if (nums.some(Number.isNaN)) return null;

  if (order === 'YMD') {
    [y, m, d] = nums;
  } else if (order === 'MDY') {
    [m, d, y] = nums;
  } else {
    [d, m, y] = nums;
  }

  // 2-digit year
  if (y < 100) y += y < 50 ? 2000 : 1900;

  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1990 || y > 2100) return null;

  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// ─── Amount parsing ─────────────────────────────────────────────────────────────

type DecimalStyle = 'dot' | 'comma';

function inferDecimalStyle(amountStrings: string[]): DecimalStyle {
  for (const raw of amountStrings) {
    const cleaned = raw.replace(/[^\d.,\-+\s]/g, '').trim();
    // Check last separator: if it's a comma followed by exactly 2 digits → comma decimal
    const commaMatch = cleaned.match(/,(\d+)$/);
    const dotMatch = cleaned.match(/\.(\d+)$/);

    if (commaMatch && commaMatch[1].length <= 2) {
      // e.g. "1.234,56" → comma is decimal
      return 'comma';
    }
    if (dotMatch && dotMatch[1].length <= 2 && cleaned.includes(',')) {
      // e.g. "1,234.56" — dot is decimal, comma is thousands
      return 'dot';
    }
  }

  // Default to dot-decimal (Anglo convention)
  return 'dot';
}

function parseAmount(raw: string, style: DecimalStyle): number | null {
  if (!raw || !raw.trim()) return null;

  let cleaned = raw.trim();

  // Handle parenthesized negatives: (123.45) → -123.45
  const isParenNeg = /^\(.*\)$/.test(cleaned);
  if (isParenNeg) cleaned = cleaned.slice(1, -1);

  // Strip currency symbols and whitespace
  cleaned = cleaned.replace(/[€$£¥₹R₽¢₡₱₺₴₮₲₵₸₼₽₿\s]/g, '');

  if (style === 'comma') {
    // European: 1.234,56 → 1234.56
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    // Anglo: 1,234.56 → 1234.56
    cleaned = cleaned.replace(/,/g, '');
  }

  const num = parseFloat(cleaned);
  if (!Number.isFinite(num)) return null;

  return isParenNeg ? -Math.abs(num) : num;
}

// ─── Currency extraction ────────────────────────────────────────────────────────

const CURRENCY_SYMBOLS: Record<string, string> = {
  '€': 'EUR', '$': 'USD', '£': 'GBP', '¥': 'JPY', '₹': 'INR',
  'R$': 'BRL', '₽': 'RUB', '₺': 'TRY', '₴': 'UAH',
};

function extractCurrency(raw: string): string | null {
  const upper = raw.trim().toUpperCase();
  if (/^[A-Z]{3}$/.test(upper)) return upper;
  for (const [sym, code] of Object.entries(CURRENCY_SYMBOLS)) {
    if (raw.includes(sym)) return code;
  }
  return null;
}

// ─── Main entry point ───────────────────────────────────────────────────────────

export function tryDeterministicParse(csvText: string): DeterministicParseResult | null {
  if (!csvText || csvText.length < 20) return null;

  // Normalize line endings and strip BOM
  let text = csvText;
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const allLines = text.split('\n').filter((l) => l.trim().length > 0);
  if (allLines.length < 2) return null;

  const delim = detectDelimiter(allLines);
  const header = findHeaderRow(allLines, delim);
  if (!header) return null;

  const dataLines = allLines.slice(header.row + 1);
  if (dataLines.length === 0) return null;

  const cols = header.columns;

  // Collect raw date and amount strings for format inference
  const sampleDates: string[] = [];
  const sampleAmounts: string[] = [];
  const sampleSize = Math.min(20, dataLines.length);

  for (let i = 0; i < sampleSize; i++) {
    const fields = splitCsvLine(dataLines[i], delim);
    if (fields[cols.date]) sampleDates.push(fields[cols.date]);
    if (cols.amount !== null && fields[cols.amount]) sampleAmounts.push(fields[cols.amount]);
    if (cols.debit !== null && fields[cols.debit]) sampleAmounts.push(fields[cols.debit]);
    if (cols.credit !== null && fields[cols.credit]) sampleAmounts.push(fields[cols.credit]);
  }

  if (sampleDates.length === 0) return null;

  const dateOrder = inferDateOrder(sampleDates);
  const decimalStyle = inferDecimalStyle(sampleAmounts);

  const transactions: DeterministicRow[] = [];

  for (const line of dataLines) {
    const fields = splitCsvLine(line, delim);

    // Parse date
    const dateRaw = fields[cols.date];
    if (!dateRaw) continue;
    const postedDate = parseDate(dateRaw, dateOrder);
    if (!postedDate) continue;

    // Parse description
    const descRaw = fields[cols.description] ?? '';
    if (!descRaw.trim()) continue;

    // Parse amount
    let amount: number | null = null;
    if (cols.amount !== null) {
      amount = parseAmount(fields[cols.amount] ?? '', decimalStyle);
    } else if (cols.debit !== null && cols.credit !== null) {
      const debit = parseAmount(fields[cols.debit] ?? '', decimalStyle);
      const credit = parseAmount(fields[cols.credit] ?? '', decimalStyle);
      if (credit && credit !== 0) {
        amount = Math.abs(credit);
      } else if (debit && debit !== 0) {
        amount = -Math.abs(debit);
      } else if (debit === 0 && credit === 0) {
        continue; // zero both sides — skip
      }
    }
    if (amount === null) continue;

    // Parse balance (optional)
    let balance: number | null = null;
    if (cols.balance !== null && fields[cols.balance]) {
      balance = parseAmount(fields[cols.balance], decimalStyle);
    }

    // Parse currency (optional)
    let currency: string | null = null;
    if (cols.currency !== null && fields[cols.currency]) {
      currency = extractCurrency(fields[cols.currency]);
    }

    transactions.push({
      posted_date: postedDate,
      description_raw: descRaw,
      amount_signed: amount,
      running_balance: balance,
      currency,
    });
  }

  // Confidence check: if we parsed < 80% of data lines, the parser is misreading — bail.
  const parseRate = transactions.length / dataLines.length;
  if (parseRate < 0.8 || transactions.length === 0) return null;

  return {
    transactions,
    headerRow: header.row,
    delimiter: delim,
  };
}
