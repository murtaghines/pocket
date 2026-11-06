import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  AlertCircle,
  ShoppingCart,
  TrendingDown,
  Coins,
  Receipt,
  ArrowDownToLine,
  ArrowUpFromLine,
  Layers,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  Check,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { SheetPanel, SHEET_BUTTON } from "../SheetPanel";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SmartImportTransaction {
  type: "buy" | "sell" | "dividend" | "fee" | "deposit" | "withdrawal";
  ticker: string | null;
  asset_name: string;
  asset_class: string;
  quantity: number;
  price_per_unit: number;
  fee: number;
  currency: string;
  date: string;
  description: string;
  exchange_rates?: {
    usd_mep?: number;
    usd_ccl?: number;
    usd_official?: number;
  } | null;
  platform?: string | null;
}

export interface SmartImportExchangeRate {
  from: string;
  to: string;
  rate: number;
  rate_type: "mep" | "ccl" | "official" | "custom";
  date: string;
}

export interface SmartImportPosition {
  ticker: string | null;
  asset_name: string;
  asset_class: string;
  quantity: number;
  current_price: number;
  current_value: number;
  currency: string;
}

export interface SmartImportPreview {
  transactions: SmartImportTransaction[];
  exchangeRates: SmartImportExchangeRate[];
  positions: SmartImportPosition[];
}

export interface SmartImportStats {
  totalTransactions: number;
  buys: number;
  sells: number;
  dividends: number;
  fees: number;
  deposits: number;
  withdrawals: number;
  exchangeRates: number;
  positions: number;
  broker: string | null;
  format: string;
}

interface InvestmentPreviewDialogProps {
  isOpen: boolean;
  previewData: SmartImportPreview | null;
  stats: SmartImportStats | null;
  isConfirming?: boolean;
  saveExchangeRates: boolean;
  onSaveExchangeRatesChange: (save: boolean) => void;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  onUpdateTransaction?: (index: number, updated: SmartImportTransaction) => void;
  onRemoveTransaction?: (index: number) => void;
  onRemovePosition?: (index: number) => void;
}

// ─── Type badge config ──────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  string,
  { label: string; icon: typeof ShoppingCart; className: string }
> = {
  buy: {
    label: "transactions.buy",
    icon: ShoppingCart,
    className: "bg-success/15 text-success",
  },
  sell: {
    label: "transactions.sell",
    icon: TrendingDown,
    className: "bg-destructive/15 text-destructive",
  },
  dividend: {
    label: "transactions.dividend",
    icon: Coins,
    className: "bg-primary/15 text-primary",
  },
  fee: {
    label: "transactions.fee",
    icon: Receipt,
    className: "bg-muted text-muted-foreground",
  },
  deposit: {
    label: "transactions.deposit",
    icon: ArrowDownToLine,
    className: "bg-success/15 text-success",
  },
  withdrawal: {
    label: "transactions.withdrawal",
    icon: ArrowUpFromLine,
    className: "bg-destructive/15 text-destructive",
  },
};

function TypeBadge({ type }: { type: string }) {
  const { t } = useTranslation("investments");
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.buy;
  const Icon = config.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0",
        config.className,
      )}
    >
      <Icon className="w-3 h-3" />
      {t(config.label)}
    </span>
  );
}

// ─── Number formatting ──────────────────────────────────────────────────────

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: currency === "ARS" ? "ARS" : currency === "EUR" ? "EUR" : "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatQty(qty: number): string {
  if (qty === 0) return "-";
  if (Number.isInteger(qty)) return qty.toLocaleString("es-AR");
  return qty.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

// ─── Component ──────────────────────────────────────────────────────────────

export function InvestmentPreviewDialog({
  isOpen,
  previewData,
  stats,
  isConfirming = false,
  saveExchangeRates,
  onSaveExchangeRatesChange,
  onConfirm,
  onCancel,
  onUpdateTransaction,
  onRemoveTransaction,
  onRemovePosition,
}: InvestmentPreviewDialogProps) {
  const { t } = useTranslation("investments");
  const { t: tc } = useTranslation("common");
  const [showAllTx, setShowAllTx] = useState(false);

  const transactions = previewData?.transactions || [];
  const exchangeRates = previewData?.exchangeRates || [];
  const positions = previewData?.positions || [];
  const isEmpty =
    transactions.length === 0 && positions.length === 0;

  const totalItems = transactions.length + positions.length;

  const handleConfirm = async () => {
    try {
      await onConfirm();
    } catch (error) {
      console.error("Error confirming smart import:", error);
    }
  };

  const footer = (
    <>
      <Button
        className={cn(SHEET_BUTTON, "w-full")}
        onClick={handleConfirm}
        disabled={isConfirming || isEmpty}
      >
        {isConfirming ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {t("smartImport.confirming")}
          </>
        ) : (
          t("smartImport.confirmAndImport", { count: totalItems })
        )}
      </Button>
      <Button
        variant="ghost"
        className="w-full h-10 rounded-full text-sm text-muted-foreground"
        onClick={onCancel}
        disabled={isConfirming}
      >
        {tc("cancel")}
      </Button>
    </>
  );

  // Show first N transactions, expand to all
  const TX_PREVIEW_LIMIT = 10;
  const visibleTx = showAllTx
    ? transactions
    : transactions.slice(0, TX_PREVIEW_LIMIT);

  return (
    <SheetPanel
      open={isOpen}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
      title={t("smartImport.title")}
      footer={footer}
    >
      <>
        {!isEmpty ? (
          <>
            {/* Broker badge */}
            {stats?.broker && (
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  {stats.broker}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {stats.format?.replace(/_/g, " ")}
                </span>
              </div>
            )}

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-2">
              {stats && stats.buys > 0 && (
                <SummaryCard
                  label={t("transactions.buy")}
                  count={stats.buys}
                  className="text-success"
                />
              )}
              {stats && stats.sells > 0 && (
                <SummaryCard
                  label={t("transactions.sell")}
                  count={stats.sells}
                  className="text-destructive"
                />
              )}
              {stats && stats.dividends > 0 && (
                <SummaryCard
                  label={t("transactions.dividend")}
                  count={stats.dividends}
                  className="text-primary"
                />
              )}
              {stats && stats.fees > 0 && (
                <SummaryCard
                  label={t("transactions.fee")}
                  count={stats.fees}
                  className="text-muted-foreground"
                />
              )}
              {stats && stats.deposits > 0 && (
                <SummaryCard
                  label={t("transactions.deposit")}
                  count={stats.deposits}
                  className="text-success"
                />
              )}
              {stats && stats.withdrawals > 0 && (
                <SummaryCard
                  label={t("transactions.withdrawal")}
                  count={stats.withdrawals}
                  className="text-destructive"
                />
              )}
              {positions.length > 0 && (
                <SummaryCard
                  label={t("smartImport.positions")}
                  count={positions.length}
                  className="text-primary"
                />
              )}
            </div>

            {/* Transactions list */}
            {transactions.length > 0 && (
              <div className="space-y-1">
                <h3 className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide">
                  {t("transactions.title")} ({transactions.length})
                </h3>
                <div className="space-y-1.5">
                  {visibleTx.map((tx, idx) => {
                    const realIdx = showAllTx ? idx : idx;
                    return (
                      <TransactionRow
                        key={realIdx}
                        tx={tx}
                        index={realIdx}
                        onUpdate={onUpdateTransaction}
                        onRemove={onRemoveTransaction}
                      />
                    );
                  })}
                </div>
                {transactions.length > TX_PREVIEW_LIMIT && (
                  <button
                    onClick={() => setShowAllTx(!showAllTx)}
                    className="flex items-center gap-1 text-[12px] text-primary font-medium mx-auto mt-2"
                  >
                    {showAllTx ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5" />
                        {t("smartImport.showLess")}
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3.5 h-3.5" />
                        {t("smartImport.showAll", {
                          count: transactions.length,
                        })}
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Positions list (snapshot imports) */}
            {positions.length > 0 && (
              <div className="space-y-1">
                <h3 className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  {t("smartImport.positionsTitle")}
                </h3>
                <div className="space-y-1.5">
                  {positions.map((pos, idx) => (
                    <PositionRow
                      key={idx}
                      pos={pos}
                      index={idx}
                      onRemove={onRemovePosition}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Exchange rates */}
            {exchangeRates.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5" />
                    {t("smartImport.exchangeRatesTitle")}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">
                      {t("smartImport.saveRates")}
                    </span>
                    <Switch
                      checked={saveExchangeRates}
                      onCheckedChange={onSaveExchangeRatesChange}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {exchangeRates.map((rate, idx) => (
                    <ExchangeRateCard key={idx} rate={rate} />
                  ))}
                </div>
              </div>
            )}

            {/* Holdings impact summary */}
            <HoldingsImpact transactions={transactions} positions={positions} />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <AlertCircle className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm">{t("smartImport.noDataFound")}</p>
          </div>
        )}
      </>
    </SheetPanel>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function SummaryCard({
  label,
  count,
  className,
}: {
  label: string;
  count: number;
  className: string;
}) {
  return (
    <div className="rounded-xl bg-muted p-3 text-center">
      <div
        className={cn(
          "text-[11px] font-medium uppercase tracking-wide",
          className,
        )}
      >
        {label}
      </div>
      <div className={cn("text-xl font-bold tabular-nums mt-1", className)}>
        {count}
      </div>
    </div>
  );
}

const TX_TYPES = ["buy", "sell", "dividend", "fee", "deposit", "withdrawal"] as const;
const ASSET_CLASSES = ["stocks", "etf", "bonds", "fci", "crypto", "cash", "other"] as const;

function TransactionRow({
  tx,
  index,
  onUpdate,
  onRemove,
}: {
  tx: SmartImportTransaction;
  index: number;
  onUpdate?: (index: number, updated: SmartImportTransaction) => void;
  onRemove?: (index: number) => void;
}) {
  const { t } = useTranslation("investments");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(tx);

  const total =
    tx.quantity > 0 && tx.price_per_unit > 0
      ? tx.quantity * tx.price_per_unit
      : tx.price_per_unit;

  const commitEdit = () => {
    if (onUpdate) onUpdate(index, draft);
    setEditing(false);
  };

  const startEdit = () => {
    setDraft(tx);
    setEditing(true);
  };

  if (editing) {
    return (
      <div className="rounded-xl bg-muted p-3 space-y-2 ring-1 ring-primary/30">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            {t("smartImport.editRow")}
          </span>
          <button
            onClick={commitEdit}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary"
          >
            <Check className="w-3.5 h-3.5" />
            {t("smartImport.done")}
          </button>
        </div>
        {/* Type + Ticker */}
        <div className="grid grid-cols-2 gap-2">
          <Select
            value={draft.type}
            onValueChange={(v) => setDraft({ ...draft, type: v as SmartImportTransaction["type"] })}
          >
            <SelectTrigger className="h-8 text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TX_TYPES.map((t_) => (
                <SelectItem key={t_} value={t_}>
                  {t(`transactions.${t_}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={draft.ticker || ""}
            onChange={(e) => setDraft({ ...draft, ticker: e.target.value || null })}
            placeholder={t("smartImport.tickerPlaceholder")}
            className="h-8 text-[12px]"
          />
        </div>
        {/* Asset class + Currency */}
        <div className="grid grid-cols-2 gap-2">
          <Select
            value={draft.asset_class}
            onValueChange={(v) => setDraft({ ...draft, asset_class: v })}
          >
            <SelectTrigger className="h-8 text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ASSET_CLASSES.map((ac) => (
                <SelectItem key={ac} value={ac}>
                  {t(`byAssetType.types.${ac}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={draft.currency}
            onChange={(e) => setDraft({ ...draft, currency: e.target.value.toUpperCase() })}
            placeholder="USD"
            className="h-8 text-[12px] uppercase"
            maxLength={3}
          />
        </div>
        {/* Qty + Price + Fee */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[10px] text-muted-foreground">{t("transactions.quantity")}</label>
            <Input
              type="number"
              inputMode="decimal"
              value={draft.quantity || ""}
              onChange={(e) => setDraft({ ...draft, quantity: parseFloat(e.target.value) || 0 })}
              className="h-8 text-[12px] tabular-nums"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">{t("transactions.pricePerUnit")}</label>
            <Input
              type="number"
              inputMode="decimal"
              value={draft.price_per_unit || ""}
              onChange={(e) => setDraft({ ...draft, price_per_unit: parseFloat(e.target.value) || 0 })}
              className="h-8 text-[12px] tabular-nums"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">{t("transactions.feeLabel")}</label>
            <Input
              type="number"
              inputMode="decimal"
              value={draft.fee || ""}
              onChange={(e) => setDraft({ ...draft, fee: parseFloat(e.target.value) || 0 })}
              className="h-8 text-[12px] tabular-nums"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-muted p-3 space-y-1.5 group">
      {/* Row 1: type badge + ticker + actions + amount */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <TypeBadge type={tx.type} />
          {tx.ticker && (
            <span className="text-sm font-semibold text-foreground truncate">
              {tx.ticker}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {onUpdate && (
            <button
              onClick={startEdit}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-background/60 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
              aria-label={t("smartImport.editRow")}
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          {onRemove && (
            <button
              onClick={() => onRemove(index)}
              className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
              aria-label={t("smartImport.removeRow")}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="text-sm font-semibold tabular-nums text-foreground">
            {formatAmount(total, tx.currency)}
          </span>
        </div>
      </div>
      {/* Row 2: details */}
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span className="tabular-nums">
          {format(new Date(tx.date), "MMM dd")}
        </span>
        {tx.quantity > 0 && (
          <span className="tabular-nums">
            {formatQty(tx.quantity)} × {formatAmount(tx.price_per_unit, tx.currency)}
          </span>
        )}
        {tx.fee > 0 && (
          <span className="tabular-nums">
            fee {formatAmount(tx.fee, tx.currency)}
          </span>
        )}
      </div>
      {/* Row 3: description (if no ticker, show asset_name) */}
      {!tx.ticker && tx.asset_name && (
        <p className="text-[11px] text-muted-foreground truncate">
          {tx.asset_name}
        </p>
      )}
    </div>
  );
}

function PositionRow({
  pos,
  index,
  onRemove,
}: {
  pos: SmartImportPosition;
  index: number;
  onRemove?: (index: number) => void;
}) {
  const { t } = useTranslation("investments");
  return (
    <div className="rounded-xl bg-muted p-3 flex items-center justify-between gap-2 group">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {pos.ticker && (
            <span className="text-sm font-semibold text-foreground">
              {pos.ticker}
            </span>
          )}
          <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
            {pos.asset_class}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
          {pos.asset_name}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {onRemove && (
          <button
            onClick={() => onRemove(index)}
            className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
            aria-label={t("smartImport.removeRow")}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
        <div className="text-right">
          <div className="text-sm font-semibold tabular-nums text-foreground">
            {formatAmount(pos.current_value, pos.currency)}
          </div>
          <div className="text-[11px] text-muted-foreground tabular-nums">
            {formatQty(pos.quantity)} × {formatAmount(pos.current_price, pos.currency)}
          </div>
        </div>
      </div>
    </div>
  );
}

function ExchangeRateCard({ rate }: { rate: SmartImportExchangeRate }) {
  const { t } = useTranslation("investments");
  const typeLabel: Record<string, string> = {
    mep: "MEP",
    ccl: "CCL",
    official: t("multicurrency.rateOfficial"),
    custom: t("multicurrency.rateCustom"),
  };

  return (
    <div className="rounded-xl bg-muted p-2.5">
      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
        {rate.from}/{rate.to} {typeLabel[rate.rate_type] || rate.rate_type}
      </div>
      <div className="text-sm font-bold tabular-nums text-foreground mt-0.5">
        {rate.rate.toLocaleString("es-AR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </div>
    </div>
  );
}

function HoldingsImpact({
  transactions,
  positions,
}: {
  transactions: SmartImportTransaction[];
  positions: SmartImportPosition[];
}) {
  const { t } = useTranslation("investments");

  // Collect unique tickers from buy/sell/dividend transactions
  const txTickers = new Map<string, { types: Set<string>; total: number }>();
  for (const tx of transactions) {
    if (!tx.ticker) continue;
    if (!["buy", "sell", "dividend"].includes(tx.type)) continue;
    const existing = txTickers.get(tx.ticker) || {
      types: new Set<string>(),
      total: 0,
    };
    existing.types.add(tx.type);
    if (tx.type === "buy") existing.total += tx.quantity;
    if (tx.type === "sell") existing.total -= tx.quantity;
    txTickers.set(tx.ticker, existing);
  }

  const positionTickers = positions
    .filter((p) => p.ticker)
    .map((p) => p.ticker!);

  if (txTickers.size === 0 && positionTickers.length === 0) return null;

  return (
    <div className="space-y-1">
      <h3 className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide">
        {t("smartImport.holdingsImpact")}
      </h3>
      <div className="space-y-1">
        {Array.from(txTickers.entries()).map(([ticker, info]) => {
          const hasBuy = info.types.has("buy");
          const hasSell = info.types.has("sell");
          const hasDividend = info.types.has("dividend");
          return (
            <div
              key={ticker}
              className="flex items-center gap-2 text-[12px] px-2 py-1"
            >
              <span className="font-semibold text-foreground">{ticker}</span>
              {hasBuy && (
                <span className="text-success">
                  +{formatQty(info.total > 0 ? info.total : 0)}
                </span>
              )}
              {hasSell && <span className="text-destructive">{t("transactions.sell").toLowerCase()}</span>}
              {hasDividend && <span className="text-primary">{t("transactions.dividend").toLowerCase()}</span>}
            </div>
          );
        })}
        {positionTickers.map((ticker) => (
          <div
            key={`pos-${ticker}`}
            className="flex items-center gap-2 text-[12px] px-2 py-1"
          >
            <span className="font-semibold text-foreground">{ticker}</span>
            <span className="text-primary text-[11px]">
              {t("smartImport.positionSnapshot")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
