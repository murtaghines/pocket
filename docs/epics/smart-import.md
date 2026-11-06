# Epic: Smart Import — From Broker Files to Portfolio Database

## Vision

Transform Pocket's investment import from a simple "deposit/withdrawal detector" into a
**full transaction parser** that reads any Argentine broker file (Balanz, Cocos, IOL, etc.)
and auto-populates holdings, transactions, exchange rates, and dividends — turning a raw
CSV or PDF into a complete, analyzable portfolio.

**Before:** Upload broker CSV → AI extracts "you sent $X to Cocos" → saves as deposit.
90% of the data is thrown away.

**After:** Upload broker CSV → AI extracts every BUY/SELL/DIVIDEND/FEE with ticker, quantity,
price, fees, and exchange rates → auto-creates holdings, transaction history, and rate
snapshots. The user gets a full portfolio from a single file upload.

---

## The problem (what exists today)

The current `process-investment-file` edge function:
1. Takes raw file content (CSV text, PDF text, XLSX parsed text)
2. Sends it to Claude Haiku with a prompt asking for **deposit/withdrawal only**
3. AI returns `[{date, description, amount, type:"deposit"|"withdrawal", platform, asset_type}]`
4. Saves to the `investments` table (the cashflow ledger)

**What's lost:**
- Ticker, quantity, price per unit → no holdings created
- Fees/commissions → no fee tracking
- Exchange rates (DolarMEP, DolarCCL, DolarOficial) → no multi-currency data
- Transaction types (BUY vs SELL vs DIVIDEND) → everything becomes "deposit"
- Instrument metadata (asset class, description) → generic "Mixed" asset type

**The disconnect:** Phase 2 built `investment_transactions` (BUY/SELL/DIVIDEND/FEE) with a DB
trigger that auto-updates holdings… but the import pipeline still outputs to the old
`investments` table. The two systems never meet.

---

## Architecture

### Data flow (new)

```
User uploads file (.csv, .pdf, .xlsx)
        │
        ▼
┌─────────────────────┐
│  extractFileContent  │  (existing: CSV→text, PDF→text, XLSX→text)
└─────────┬───────────┘
          │ raw text
          ▼
┌─────────────────────────────────────┐
│  process-investment-file (enhanced) │
│                                     │
│  1. Detect file format              │
│     (Balanz CSV? Cocos CSV? PDF?    │
│      generic broker statement?)     │
│                                     │
│  2. Select extraction prompt        │
│     (format-specific instructions   │
│      + rich output schema)          │
│                                     │
│  3. AI extracts structured data     │
│     → transactions[]                │
│     → exchange_rates[]              │
│     → position_snapshot[] (PDFs)    │
│                                     │
│  4. Server-side validation          │
│     & normalization                 │
└─────────────┬───────────────────────┘
              │
              ▼
┌──────────────────────────────┐
│     Preview (enhanced UI)    │
│                              │
│  Transactions table:         │
│  Type│Ticker│Qty│Price│Fee   │
│  BUY │MELI  │10 │19970│1570  │
│  DIV │MSFT  │ - │  -  │  -   │
│                              │
│  Holdings impact:            │
│  🟢 New: MELI (10 @ $19970) │
│  🔄 Update: MSFT (+dividend)│
│                              │
│  Exchange rates detected:    │
│  USD/ARS MEP: 1434.00       │
│  USD/ARS CCL: 1482.49       │
└──────────────┬───────────────┘
               │ user confirms
               ▼
┌──────────────────────────────────────────────┐
│  Persist (server-side, in single edge call)  │
│                                              │
│  1. Find-or-create holdings                  │
│     (by user + ticker + account)             │
│                                              │
│  2. Insert investment_transactions           │
│     → DB trigger auto-updates holdings       │
│     (qty, avg_cost, realized_pnl)            │
│                                              │
│  3. Save exchange rates                      │
│     → portfolio_rate_overrides               │
│                                              │
│  4. Legacy: also insert into investments     │
│     (deposit record for dashboard KPI)       │
│                                              │
│  5. Take portfolio snapshot                  │
└──────────────────────────────────────────────┘
```

### Key design decisions

1. **AI-first, not parser-first.** We don't write regex parsers per broker. The AI reads
   the raw text and extracts structured data. But we give it format-specific hints (column
   names, separators, number format) detected server-side from the file header. This scales
   to any broker without code changes.

2. **Find-or-create holdings.** On import, the edge function matches each transaction to an
   existing holding by `(user_id, ticker, account_id)`. If none exists, it creates one. This
   is new logic in the edge function — the current trigger only *updates* existing holdings,
   it doesn't create them.

3. **Dual-write to both tables.** Each import writes to `investment_transactions` (the rich
   data) AND a single aggregated row to `investments` (deposit total for dashboard KPIs).
   This preserves backward compatibility with the existing "Sent to Invest" dashboard card.

4. **Exchange rates are captured, not required.** When the file includes dollar rates
   (Balanz CSV has DolarMEP/CCL/Oficial columns), they're extracted and offered to the user
   in the preview. On confirm, they're saved to `portfolio_rate_overrides`. If the file
   doesn't have rates, the import still works fine.

5. **Position snapshot import (PDFs).** Consolidated position PDFs (like Balanz's) are a
   special case: they describe *current state*, not transactions. These create/update holdings
   directly (overwriting quantity and current_price) without going through
   `investment_transactions`. This is the "initialize portfolio from a PDF" flow.

---

## AI Extraction Schema

The AI returns a JSON object with three arrays:

```typescript
interface ExtractionResult {
  transactions: {
    type: "buy" | "sell" | "dividend" | "fee" | "deposit" | "withdrawal";
    ticker: string | null;      // "MELI", "AL30", "ESTRA1A", null for cash
    asset_name: string;         // "CEDEAR MERCADOLIBRE INC.", "BONO REP. ARGENTINA..."
    asset_class: string;        // "stocks", "etf", "bonds", "fci", "crypto", "cash", "other"
    quantity: number;           // units bought/sold (0 for fees/dividends without units)
    price_per_unit: number;     // price per unit in the file's currency
    total_amount: number;       // total = qty × price (or explicit total from file)
    fee: number;                // commission/gastos (0 if none)
    currency: string;           // "ARS", "USD", "EUR"
    date: string;               // ISO date "2026-03-30"
    description: string;        // clean human-readable label
    exchange_rates?: {          // if present in the file
      usd_mep?: number;
      usd_ccl?: number;
      usd_official?: number;
    };
  }[];
  exchange_rates: {
    from: string;               // "USD"
    to: string;                 // "ARS"
    rate: number;               // 1434.00
    rate_type: string;          // "mep" | "ccl" | "official"
    date: string;               // date the rate was observed
  }[];
  positions?: {                 // only for consolidated position files
    ticker: string;
    asset_name: string;
    asset_class: string;
    quantity: number;
    current_price: number;
    current_value: number;
    currency: string;
  }[];
}
```

---

## File format detection

Server-side heuristics (before AI call) to select the right prompt:

| Signal | Format | Prompt hint |
|--------|--------|-------------|
| CSV, comma-separated, header contains `Tipo,Ticker,Descripcion,Fecha` | **Balanz Period Results** | Argentine broker buy/sell CSV. Comma separator. Columns: Tipo, Ticker, Descripcion, Fecha, Cantidad, PrecioCompra, Gastos, Moneda, DolarMEP, DolarCCL, DolarOficial. Argentine number format (`.` = thousands, `,` = decimal). |
| CSV, semicolon-separated, header contains `nroTicket;nroComprobante;fechaEjecucion` | **Cocos Capital Movements** | Argentine broker movements. Semicolon separator. Columns: tipoOperacion, instrumento, moneda, cantidad, precio, montoBruto, comision, total. Argentine number format. Operations: DIVIDENDOS EN ESPECIE, Renta y Amortizacion, Compra, Liq Suscripcion Fci. |
| PDF text contains "Balanz" + "Posición Consolidada" | **Balanz Consolidated Position** | Positions snapshot. Extract each holding with ticker, quantity, price, value. |
| PDF text contains "Balanz" + "Cuenta Corriente" | **Balanz Checking Account** | Per-instrument account movements: saldo anterior, movements, saldo final. Includes dividends. |
| PDF text contains "Cocos" + "Resumen de Cuenta" | **Cocos Capital Statement** | Positions at close + movements in ARS/USD MEP/USD Cable columns. |
| None of the above | **Generic broker file** | Generic prompt — extract whatever transaction data is visible. |

The detection is a **hint** passed to the AI alongside the file content. The AI still
analyzes the raw text — the hint just makes extraction more accurate. Unknown formats
fall back to the generic prompt (which is still much richer than today's deposit-only prompt).

---

## Implementation plan

### Step 1: DB migration — link transactions to imports

Small schema addition to connect the import pipeline with investment_transactions:

```sql
-- Add import_id to investment_transactions for traceability
ALTER TABLE investment_transactions
  ADD COLUMN IF NOT EXISTS import_id uuid REFERENCES imports(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inv_tx_import
  ON investment_transactions(import_id) WHERE import_id IS NOT NULL;

-- Enhance the trigger to auto-create holdings when holding_id is NULL but ticker is set
CREATE OR REPLACE FUNCTION process_investment_transaction()
RETURNS trigger ...
  -- If holding_id is NULL and ticker is not null and type is 'buy':
  --   1. Try to find existing open holding by (user_id, ticker, account_id)
  --   2. If not found, create a new holding
  --   3. Set NEW.holding_id to the found/created holding
  --   4. Then run the existing buy/sell logic
```

### Step 2: Enhanced edge function — new AI prompt + processing

Rewrite `process-investment-file/index.ts`:

1. **Format detection**: Read first few lines, detect separator and header pattern
2. **Prompt selection**: Pick format-specific prompt or generic prompt
3. **AI call**: Send file content + prompt → get `ExtractionResult`
4. **Validation**: Normalize types, currencies, dates; validate numbers
5. **Preview response**: Return structured preview data to the client
6. **Confirm path**: Receive back the previewed data, persist to DB:
   - For each BUY/SELL: insert `investment_transactions` (trigger handles holdings)
   - For DIVIDEND/FEE: insert `investment_transactions`
   - For positions (snapshot import): upsert holdings directly
   - For exchange rates: upsert `portfolio_rate_overrides`
   - For legacy KPI: insert single deposit/withdrawal summary into `investments`
   - Take portfolio snapshot

### Step 3: Enhanced preview UI

Replace `InvestmentPreviewDialog` with a richer preview:

- **Summary cards**: Total transactions, Buys, Sells, Dividends, Fees (not just deposit/withdrawal)
- **Transactions table**: Type badge | Ticker | Qty | Price | Fee | Total | Currency
  - BUY = green badge, SELL = red, DIVIDEND = purple, FEE = orange
  - Each row shows the holding impact ("New position" or "Updates existing")
- **Holdings impact section**: List of holdings that will be created or updated
  - 🟢 New: MELI — 10 units @ $19,970 ARS
  - 🔄 Update: AL30 — +133 units (total: 318)
- **Exchange rates section** (if detected): MEP $1,434 | CCL $1,482 | Oficial $1,382
  - Toggle to save these rates to portfolio settings
- **Position snapshot section** (for PDF position imports): Holdings that will be set
- Row-level editing before confirm (change ticker, asset_class, fix amounts)

### Step 4: Upload hook enhancements

Update `useMonthlyInvestmentUpload`:
- Handle new preview data shape (transactions + exchange_rates + positions)
- Pass `previewTransactions` back to confirm endpoint (not legacy investments array)
- After confirm: invalidate `investment-transactions`, `holdings`, `portfolio-summary` queries
- Auto-trigger portfolio snapshot

### Step 5: Exchange rate auto-capture

When the AI extracts exchange rates from the file:
- Show them in the preview with a "Save to portfolio" checkbox (default: on)
- On confirm, upsert into `portfolio_rate_overrides` with the correct `rate_type` (mep/ccl/official)
- Use the most recent date in the file as the rate date
- If the user already has rates for that pair+type, show "Will update from X to Y"

---

## File-by-file expected output

### 1. Balanz Period Results CSV → 51 BUY transactions

| Type | Ticker | Asset Class | Qty | Price | Fee | Currency |
|------|--------|-------------|-----|-------|-----|----------|
| BUY | AL30 | bonds | 133 | 912.10 | 730.89 | ARS |
| BUY | AL30 | bonds | 185 | 864.50 | 963.60 | ARS |
| BUY | AMAT | stocks | 2 | 96,525 | 1,518.34 | ARS |
| BUY | MELI | stocks | 10 | 19,970 | 1,570.64 | ARS |
| ... | ... | ... | ... | ... | ... | ... |

**Holdings created:** ~30 (AL30, AMAT, AMZN, AO27, AVGO, COPX, DNCBO, EAC4O, ESTRA1A,
EWZ, IREN, MCC3O, MELI, META, MSFT, MU, NU, NVDA, QQQ, RSP, SPY, TSLA, UBER, URA, CP38O)

**Exchange rates captured:** 8 unique dates × 3 types (MEP/CCL/Oficial)

### 2. Cocos Capital Movements CSV → ~30 transactions

| Type | Ticker | Qty | Amount | Currency |
|------|--------|-----|--------|----------|
| DIVIDEND | — | — | 5.07 | ARS |
| DIVIDEND | — | — | 36.80 | USD |
| BUY | COCOUSDPA (FCI) | 42.05 | 44.00 | USD |
| BUY | TZXM7 | 136,654 | 300,648.91 | ARS |
| DIVIDEND | — | — | 103.52 | ARS |
| ... | ... | ... | ... | ... |

**Key:** "DIVIDENDOS EN ESPECIE" → DIVIDEND, "Liq Suscripcion Fci" → BUY (FCI),
"Compra" → BUY, "Renta y Amortizacion" → DIVIDEND (bond coupon/amortization),
"Nota De Credito Conversion" → internal transfer (skip or deposit),
"Recibo De Cobro" → DEPOSIT (cash into broker)

### 3. Balanz Consolidated Position PDF → position snapshot

Direct holdings creation: ~30 positions with current quantities and prices.
This is the "seed my portfolio" flow — one upload sets up the entire holdings table.

### 4. Balanz Checking Account PDF → dividends + movements

Per-instrument movements, primarily useful for dividend extraction and reconciliation.

### 5. Cocos Capital Statement PDF → positions + movements

Mixed: positions at close (snapshot) + movements (transactions). The AI needs to
separate these into the `positions` and `transactions` arrays.

---

## Scope boundaries

**In scope:**
- Enhanced AI prompt with rich extraction schema
- Format detection (Balanz CSV, Cocos CSV, generic)
- Find-or-create holdings on import
- Preview UI showing transactions, holdings impact, exchange rates
- Exchange rate auto-capture from files that include them
- Position snapshot import from consolidated position PDFs
- Legacy dual-write to `investments` table for dashboard KPIs
- Full i18n (en + es)

**Out of scope (future):**
- Automatic price fetching from APIs (manual-first, as decided in Phase 1)
- Broker API integrations (only file upload)
- Real-time sync with brokers
- Broker-specific parsers in code (we rely on AI + hints, not regex)
- Tax lot tracking (FIFO/LIFO) — separate Phase 5 item
- Dividend calendar / ex-date tracking — separate Phase 5 item

---

## Testing strategy

Use the 5 real files from the user as the test suite:
1. Balanz Period Results CSV → expect ~51 BUY transactions, ~30 holdings, exchange rates
2. Cocos Movements CSV → expect ~30 mixed transactions (dividends, FCI buys, purchases)
3. Balanz Consolidated Position PDF → expect ~30 position snapshots
4. Balanz Checking Account PDF → expect dividends + instrument movements
5. Cocos Statement PDF → expect positions + movements

Each test: upload → verify preview data → confirm → verify DB state (holdings, transactions,
exchange rates, investments legacy row).

---

## Migration checklist

- [x] `ALTER TABLE investment_transactions ADD COLUMN import_id`
- [x] Enhanced `process_investment_transaction()` trigger with auto-create holding
- [x] Rewrite `process-investment-file/index.ts` with new prompt + processing
- [x] New `InvestmentPreviewDialog` (rich preview)
- [x] Update `useMonthlyInvestmentUpload` for new data shape
- [x] i18n keys for all new UI strings
- [x] Row-level editing in preview (edit ticker, type, amounts; remove rows)
- [ ] Test with all 5 broker files (manual — upload through UI after deploy)

## Progress

### Steps 1-5 — DONE (2026-11-06)
- Migration `20261106130000_smart_import_bridge.sql`: import_id column + enhanced trigger
- Edge function rewrite: format detection (Balanz CSV, Cocos CSV, 3 PDF types, generic),
  rich AI prompt, smart confirm path with cross-import dedup, position snapshot import,
  exchange rate capture, backward-compatible legacy path
- InvestmentPreviewDialog rewrite: type badges, ticker/qty/price columns, holdings impact,
  exchange rates toggle, position snapshot section
- useMonthlyInvestmentUpload: smartImportData confirm path, invalidates holdings/transactions/portfolio queries
- Full i18n (en + es)
