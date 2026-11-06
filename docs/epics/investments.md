# Epic: Investments — Portfolio Tracker Redesign

## Vision

Transform Pocket's Investments section from a simple deposit/withdrawal ledger into a
full portfolio tracker inspired by [Alpha Tracker](https://alpha-tracker.app/): consolidated
multi-broker view, holdings with real P&L, allocation breakdown, performance over time,
and benchmark comparison. The analysis is fundamentally different from cashflow transactions —
this is about *what you own and how it performs*, not just money in/out.

## Main files

**Existing (to evolve):**
- `src/pages/Investments.tsx` — page shell, KPI cards, layout
- `src/components/investments/` — InvestmentAccountsManager, InvestmentsByAssetType,
  InvestmentsByPlatform, InvestmentsHistory, InvestmentsTable
- `src/hooks/useInvestments.tsx` — data hook (currently: deposits/withdrawals + manual accounts)
- `src/components/dashboard/InvestmentSummaryCard.tsx` — dashboard widget
- `src/lib/accountTypes.ts` — BROKERAGE/CRYPTO/RETIREMENT/REAL_ESTATE/OTHER_INVESTMENT
- `supabase/functions/process-investment-file/` — upload parsing
- `src/i18n/locales/{en,es}/investments.json`

**New (to create):**
- `src/components/investments/portfolio/` — PortfolioOverview, AllocationChart,
  HoldingsList, HoldingRow, PerformanceChart, BenchmarkComparison
- `src/components/investments/holdings/` — HoldingDetail, TransactionHistory per holding
- `src/components/investments/import/` — BrokerImportWizard, TickerResolver, ManualEntryForm
- `src/hooks/usePortfolio.tsx` — portfolio-level aggregations
- `src/hooks/useHoldings.tsx` — individual holdings CRUD + price lookups
- `src/lib/portfolioCalcs.ts` — TWR, IRR, P&L calculations
- New migrations for `holdings`, `portfolio_snapshots`, enriched transaction types

## Current state (2026-11-05)

The investments module tracks **money flow only**: deposits into and withdrawals from
investment platforms. The data model is:

```
investments: { date, amount, platform, asset_type, type(deposit|withdrawal), description }
investment_accounts: { platform, account_name, current_value (manual) }
```

**What exists:**
- Upload pipeline (`process-investment-file`) → AI-parsed deposits/withdrawals
- 4 KPI cards: this month invested, total invested, total value, # platforms
- Pie chart by platform, bar chart by asset type (both show net deposits, not market value)
- Cumulative area chart (money invested over time)
- Transaction history table (deposit/withdrawal list)
- Manual account value tracking (user types current value by hand)
- Account types: BROKERAGE, CRYPTO, RETIREMENT, REAL_ESTATE, OTHER_INVESTMENT
- Soft-hide + audit trail on investment rows (mirrors transactions)

**What's missing (the gap):**
- No concept of **holdings** (what assets you actually own, how many units)
- No **market prices** — "total value" is whatever the user manually typed
- No **P&L per position** (cost basis vs current value)
- No **asset allocation** by market value (only by deposits, which is misleading)
- No **performance metrics** (TWR, IRR, annualized return)
- No **benchmark comparison** (vs S&P 500, Merval, etc.)
- No **multi-currency** awareness (everything is treated as a single currency)
- No **dividend/fee tracking**
- Import only parses deposits/withdrawals, not actual buy/sell with ticker+quantity+price

## Architecture decision: Parallel model, not replace

The existing `investments` table (deposit/withdrawal ledger) stays as-is — it's the
"cashflow into investments" view that the dashboard's "Sent to Invest" KPI already uses.
The new portfolio tracker is a **parallel layer on top**:

```
investments (existing)     → money in/out tracking (feeds dashboard KPIs)
    ↓ links via platform + date range
holdings (NEW)             → what you own right now (ticker, units, cost basis)
investment_transactions    → buy/sell/dividend/fee (richer than deposit/withdrawal)
portfolio_snapshots (NEW)  → daily/monthly portfolio value for performance charts
```

This means the Investments PAGE gets a redesign with tabs:
- **Portfolio** (default) — the new stuff: what you own, allocation, performance
- **Activity** — enhanced transaction list (buy/sell/dividend, not just deposit/withdrawal)
- **Accounts** — platform/broker management (existing, enhanced)

---

## Phases

### Phase 1: Data Model + Holdings Foundation
**Goal:** New DB tables, holdings CRUD, basic portfolio view.

**DB migrations:**
```sql
-- holdings: what the user currently owns
CREATE TABLE holdings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  account_id uuid REFERENCES accounts(id),       -- links to BROKERAGE/CRYPTO account
  ticker text,                                     -- e.g. "AAPL", "BTC", "VWCE.DE", null for unlisted
  asset_name text NOT NULL,                        -- human label: "Apple Inc", "Bitcoin", "FCI Alpha"
  asset_class text NOT NULL DEFAULT 'other',       -- stocks, etf, bonds, crypto, real_estate, cash, fci, other
  quantity numeric NOT NULL DEFAULT 0,             -- units owned (can be fractional for crypto/ETFs)
  avg_cost_per_unit numeric NOT NULL DEFAULT 0,    -- weighted average purchase price
  cost_basis numeric GENERATED ALWAYS AS (quantity * avg_cost_per_unit) STORED,
  currency text NOT NULL DEFAULT 'USD',            -- currency of the cost/price
  current_price numeric,                           -- latest known price (manual or fetched)
  current_value numeric GENERATED ALWAYS AS (quantity * COALESCE(current_price, avg_cost_per_unit)) STORED,
  unrealized_pnl numeric GENERATED ALWAYS AS (quantity * (COALESCE(current_price, avg_cost_per_unit) - avg_cost_per_unit)) STORED,
  price_updated_at timestamptz,
  is_closed boolean NOT NULL DEFAULT false,        -- sold everything, keep for history
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- portfolio value snapshots for performance charts
CREATE TABLE portfolio_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  snapshot_date date NOT NULL,
  total_value numeric NOT NULL,
  total_cost_basis numeric NOT NULL,
  deposits_cumulative numeric NOT NULL DEFAULT 0,  -- total money put in up to this date
  withdrawals_cumulative numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  breakdown jsonb,                                  -- { by_class: {...}, by_platform: {...} }
  UNIQUE(user_id, snapshot_date, currency)
);
```

**Frontend:**
- `useHoldings.tsx` — CRUD for holdings table
- `src/components/investments/portfolio/HoldingsList.tsx` — sortable table of holdings
  (name, ticker, qty, avg cost, current price, P&L $, P&L %, weight %)
- `src/components/investments/portfolio/AllocationChart.tsx` — donut chart by asset class
  (using market value, not deposits)
- Manual "Add Holding" dialog (ticker, name, quantity, avg cost, current price)
- Manual "Update Price" inline on each holding row
- Investments page restructured with Portfolio / Activity / Accounts tabs

**RPC:**
- `get_portfolio_summary(p_user_id)` → total value, total cost, total P&L, P&L %,
  allocation by class, allocation by platform, top holdings

### Phase 2: Enhanced Transactions + Import
**Goal:** Richer transaction types, smarter import that detects buy/sell.

**DB changes:**
- New `investment_tx_type` enum: `BUY, SELL, DIVIDEND, FEE, DEPOSIT, WITHDRAWAL, TRANSFER, SPLIT, MERGER`
- Either add columns to `investments` or create `investment_transactions` table with:
  `holding_id`, `tx_type`, `ticker`, `quantity`, `price_per_unit`, `total_amount`,
  `fee`, `currency`, `exchange_rate`, `notes`
- On BUY: auto-update holding's quantity and recalculate avg_cost_per_unit
- On SELL: reduce quantity, realize P&L, log realized gain/loss
- On DIVIDEND: record as income, optionally link to holding

**Import enhancement:**
- `process-investment-file` AI prompt updated to detect: ticker, quantity, price per unit,
  fees, transaction type (buy/sell/dividend) — not just deposit/withdrawal
- New broker-specific parsers (CSV templates): Degiro, Interactive Brokers, Binance,
  IOL (InvertirOnline), Balanz, Cocos, Revolut
- Preview step shows parsed holdings impact ("+10 AAPL @ $185" instead of just "$1,850 deposit")

**Frontend:**
- Activity tab: richer transaction cards showing ticker, qty, price, type badge
  (BUY green, SELL red, DIVIDEND purple, FEE orange)
- When adding a BUY/SELL manually: auto-creates/updates the holding
- Realized P&L column on SELL transactions

### Phase 3: Performance Analytics + Charts
**Goal:** Portfolio performance over time, benchmarks, returns calculation.

**Backend:**
- Nightly/on-demand snapshot function: calculates total portfolio value, saves to
  `portfolio_snapshots` — runs as edge function on a cron or triggered after any
  holding change
- `get_portfolio_performance(p_user_id, p_from, p_to)` RPC: returns time series of
  portfolio value, cost basis, and P&L for charting
- TWR (Time-Weighted Return) calculation: handles deposits/withdrawals correctly
  so performance isn't distorted by cash flows

**Frontend:**
- `PerformanceChart.tsx` — line chart: portfolio value vs cost basis over time
  (area between = unrealized P&L, green when positive, red when negative)
- Period selector: 1M, 3M, 6M, YTD, 1Y, ALL
- Return metrics row: total return $, total return %, annualized return
- `BenchmarkComparison.tsx` (Phase 3b, optional): overlay S&P 500 / Merval normalized
  to same starting point (requires price API, could be manual/static initially)

### Phase 4: Multi-Currency + Dollar Tracking
**Goal:** Track everything in USD (like Alpha Tracker), handle ARS→USD conversion.

This phase is particularly relevant for Argentine users who invest across currencies:
- Holdings can be in different currencies (USD, ARS, EUR)
- Portfolio summary converts everything to a chosen display currency
- Exchange rate at transaction date is stored (for accurate cost basis)
- "MEP dollar" rate support for ARS conversions
- P&L shown both in original currency and in USD

### Phase 5: Polish + Advanced Features
- Dividend calendar (upcoming ex-dates, payment schedule)
- Fee analysis (total fees paid, fee % of portfolio)
- Tax lot tracking (FIFO/LIFO for realized gains)
- Portfolio rebalancing suggestions (target allocation vs actual)
- Export to CSV/PDF for tax reporting
- Price alerts (notify when a holding crosses a threshold)

---

## Decisions made
- **Parallel model:** New `holdings` table alongside existing `investments` (deposits/withdrawals).
  Don't replace — both serve different purposes. The deposit/withdrawal ledger feeds the
  dashboard "Sent to Invest" KPI; holdings track what you actually own.
- **Manual-first for prices:** Start with manual price entry on holdings. Automatic price
  fetching (via API) is Phase 3+ and optional — many Argentine assets (FCIs, local bonds)
  don't have clean APIs. Manual update is always available as fallback.
- **Generated columns for computed values:** `cost_basis`, `current_value`, `unrealized_pnl`
  are `GENERATED ALWAYS AS ... STORED` — computed by Postgres, always consistent, no
  application-level calculation drift.
- **Tab-based page layout:** Portfolio (default) / Activity / Accounts — mirrors how
  Alpha Tracker separates "what you own" from "transaction history" from "account setup".
- **Investment accounts link to `accounts` table:** The existing `accounts` table already has
  BROKERAGE/CRYPTO/RETIREMENT/REAL_ESTATE types. Holdings reference `account_id` from there,
  not the old standalone `investment_accounts` table (which will be deprecated).
- **`investment_accounts` table deprecated:** It was a stopgap for manual "current value"
  tracking. Holdings with actual quantities + prices replaces this entirely. Migration path:
  convert each `investment_accounts` row into a single holding per account.

## Progress

### Phase 1 — DONE
- Migration: `holdings`, `portfolio_snapshots`, `get_portfolio_summary` RPC
- `useHoldings` hook with CRUD + summary
- Portfolio tab: KPIs, allocation charts (by asset class & account), sortable holdings table
- AddHoldingDialog, UpdatePricePopover
- ActivityTab wrapping existing deposit/withdrawal components
- Tab navigation (portfolio/activity/accounts) via NAV_SECTIONS
- Full i18n (en + es)

### Phase 2 — DONE
- Migration: `investment_transactions` with BUY/SELL/DIVIDEND/FEE types
- DB trigger: `process_investment_transaction()` auto-updates holdings on buy/sell
- `useInvestmentTransactions` hook
- RecordTransactionDialog with holding picker
- TransactionsList component (enhanced activity view with type badges, realized P&L)
- Enhanced ActivityTab with unified timeline + record button

### Phase 3 — DONE
- Migration: `get_portfolio_performance` RPC + `take_portfolio_snapshot` function
- `usePortfolioPerformance` hook with period selector (1M/3M/6M/YTD/1Y/ALL)
- PerformanceChart: dual-area chart (portfolio value vs cost basis), period toggle,
  annualized return, manual snapshot button
- Integrated into PortfolioTab

### Enhancements — DONE
- HoldingDetailDialog: click any holding to see KPIs, position details, quick actions
  (record transaction, update price, edit, close position), per-holding transaction history,
  notes display. Close position has AlertDialog confirmation.
- EditHoldingDialog: edit name, ticker, asset class, account, quantity, avg cost, notes
- AddHoldingDialog: account selector linking holdings to investment accounts
- AllocationChart: distinct titles for by-class vs by-account charts
- HoldingsList: search/filter by name or ticker (appears at 5+ holdings), count badge
- InvestmentSummaryCard (dashboard): shows portfolio value + P&L from holdings when available,
  falls back to deposit/withdrawal totals when no holdings exist
- Auto-snapshot: portfolio snapshot auto-taken after recording transactions or updating prices

### Phase 4: Multi-Currency — DONE
- Migration: `portfolio_rate_overrides` table (user-specific rates with rate_type: official/mep/blue/custom),
  `preferred_rate_type` column on `user_preferences`,
  `get_portfolio_summary_multicurrency` RPC (converts holdings to display currency using user overrides → global rates → fallback)
- `usePortfolioRates` hook: merges user rate overrides with automatic frankfurter.app rates,
  convert() utility with override → auto fallback chain
- `useHoldings` updated: auto-detects multi-currency portfolios, calls multicurrency RPC
  when holdings span currencies, exposes `isMultiCurrency`, `displayCurrency`, `currencies`
- `ExchangeRatesDialog`: manage custom exchange rates (from/to/rate/type), supports MEP/Blue/Custom types
- `PortfolioTab`: shows display currency badge + unconverted holdings warning when multi-currency,
  "Exchange Rates" management button
- `PortfolioKpis`: passes display currency to `formatCurrency` for correct symbol display
- `HoldingsList`: currency badge on holdings in different currency than display (mobile + desktop)
- `HoldingDetailDialog`: shows native currency values + converted "≈" values when holding is
  in a different currency, currency label in details grid
- `EditHoldingDialog`: added currency selector (USD/EUR/ARS/GBP/BRL)
- `AddHoldingDialog`: added BRL to currency options
- Full i18n (en + es) for all multicurrency keys

### Phase 5: Polish — DONE
- Migration: `target_allocations` table, `get_investment_insights` RPC
  (dividends/fees/realized P&L aggregation with monthly breakdown)
- `useInvestmentInsights` hook: calls RPC, returns totals + monthly series
- `useTargetAllocations` hook: CRUD for target allocation percentages per asset class
- `InsightsCards`: KPI cards for total dividends, total fees (as % of volume),
  realized P&L — auto-hidden when no transactions exist
- `RebalancingCard`: set target % per asset class, visual actual-vs-target bars,
  deviation badges (overweight/underweight), inline editing mode
- `ExportButton`: CSV export for holdings, transactions, or both — with proper
  escaping and BOM for Excel compatibility
- Integrated into PortfolioTab: export button in toolbar, insights cards after
  allocation charts, rebalancing card before holdings list
- Full i18n (en + es) for insights, rebalancing, and export keys

### Smart Import — DONE (2026-11-06)
- See `docs/epics/smart-import.md` for full details
- Migration: `import_id` on `investment_transactions`, enhanced trigger auto-creates holdings
- Edge function: format detection (Balanz/Cocos CSV + PDF), rich AI extraction,
  smart confirm with dedup, position snapshots, exchange rate capture
- UI: rich preview dialog (type badges, ticker/qty/price, holdings impact, exchange rates toggle)
- Hook: smartImportData confirm path, invalidates all portfolio queries

### Smart Import Row Editing — DONE (2026-11-06)
- Inline editing in smart import preview: tap pencil icon to expand transaction row
  into editable form (type, ticker, asset class, currency, quantity, price, fee)
- Remove button (trash icon) on each transaction and position row
- Callbacks in `useMonthlyInvestmentUpload`: `updateTransaction`, `removeTransaction`, `removePosition`
- Wired through `InvestmentTabsView` → `InvestmentPreviewDialog`
- Mobile-friendly: edit/remove buttons always visible on touch, hover-reveal on desktop
- Full i18n (en + es)

### Dividend Calendar — DONE (2026-11-06)
- Migration: `get_dividend_calendar` RPC (per-holding breakdown, quarterly aggregation,
  monthly chart data, trailing 12-month total, dividend yield calculation)
- `useDividendCalendar` hook
- `DividendCalendar` component: KPI row (total received, monthly avg, projected annual,
  dividend yield), monthly bar chart (last 12 months), per-holding breakdown with
  proportional bars, quarterly summary grid, show more/less for 5+ holdings
- Integrated into PortfolioTab after InsightsCards
- Auto-hidden when no dividend transactions exist
- Full i18n (en + es)

### Tax Lot Tracking (FIFO/LIFO) — DONE (2026-11-06)
- Migration: `tax_lots` table, `tax_lot_disposals` table, `cost_method` on `user_preferences`
- Enhanced `process_investment_transaction()` trigger: average cost for `cost_method='average'`,
  defers to lot-based for FIFO/LIFO
- New `process_tax_lots()` AFTER INSERT trigger: creates lots on BUY, consumes in FIFO/LIFO
  order on SELL, records disposals with per-lot realized P&L
- `useTaxLots` hook: `useTaxLots(holdingId)` returns open/closed lots, `useTaxLotDisposals(sellTransactionId)`
- `TaxLotsSection` component: shows open lots per holding (acquired date, qty remaining/original,
  cost per unit, remaining % bar) — integrated into HoldingDetailDialog
- `CostMethodSelector` component: FIFO/LIFO/Average dropdown in PortfolioTab toolbar,
  persists to `user_preferences.cost_method`
- `CostMethod` type exported from `useUserPreferences`
- Full i18n (en + es)

### Portfolio Dashboard Enhancements — DONE (2026-11-06)
- Migration: `get_portfolio_highlights` RPC (win rate, info stats, YTD baseline)
- `usePortfolioHighlights` hook: server-side RPC + client-side computations
  (best/worst position, currency exposure, yield on cost/current)
- `PortfolioHighlights` component: 5-card row (YTD return, best/worst position,
  win rate, dividends collected) — inspired by Alpha Tracker's "Posiciones Destacadas"
- `CurrencyExposureCard`: currency breakdown with progress bars + yield metrics —
  auto-shown when holdings span multiple currencies
- `PortfolioInfoSection`: info cards (assets traded, first/last operation, total movements)
- PortfolioTab reorganized: KPIs → highlights → allocation + currency exposure → insights →
  dividends → performance → rebalancing → info → holdings list
- Full i18n (en + es)

## Next step
- All planned phases complete. Remaining Phase 5 ideas (not planned): price alerts (requires external API, costs money)
