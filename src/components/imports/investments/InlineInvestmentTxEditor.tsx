import { useState, useMemo, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Loader2,
  FileSpreadsheet,
  Pencil,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocalization } from "@/hooks/useLocalization";
import { useInvestmentTransactions } from "@/hooks/useInvestmentTransactions";
import { useToast } from "@/hooks/use-toast";
import type { Import } from "@/hooks/useImports";
import type { Account } from "@/hooks/useAccounts";
import { getAccountDisplayName } from "@/lib/accountColors";
import { ProcessingPanel } from "./ProcessingPanel";
import { InvestmentTxEditDrawer } from "./InvestmentTxEditDrawer";
import type { InvestmentSummary, InvestmentAccountTab } from "./InvestmentDataToolbar";
import { TX_TYPE_CONFIG, getTxTypeMeta } from "./types";
import type { InvestmentTransaction, PendingFileInfo, PendingInvTxEdit, InvestmentTxSummary } from "./types";
import { toast as sonnerToast } from "sonner";

const TX_TYPES_LIST = Object.entries(TX_TYPE_CONFIG).map(([value, cfg]) => ({
  value,
  label: cfg.label,
}));

export interface InlineInvestmentTxEditorProps {
  monthKey: string;
  monthLabel: string;
  imports: Import[];
  investmentAccounts: Account[];
  deleteImport: (id: string) => void;
  isDeleting: boolean;
  isProcessing: boolean;
  pendingFiles?: PendingFileInfo[];
  filterImportIds?: Set<string>;
  onSummaryChange?: (data: { tabs: InvestmentAccountTab[]; globalSummary: InvestmentSummary }) => void;
}

export function InlineInvestmentTxEditor({
  monthKey,
  monthLabel,
  imports,
  investmentAccounts,
  deleteImport,
  isDeleting,
  isProcessing,
  pendingFiles,
  filterImportIds,
  onSummaryChange,
}: InlineInvestmentTxEditorProps) {
  const { toast } = useToast();
  const { formatCurrency, formatDate, formatWeekday } = useLocalization();
  const { t } = useTranslation("common");

  const [editingTx, setEditingTx] = useState<InvestmentTransaction | null>(null);
  const [editingQtyId, setEditingQtyId] = useState<string | null>(null);
  const [editingQtyValue, setEditingQtyValue] = useState("");
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState("");
  const [editingFeeId, setEditingFeeId] = useState<string | null>(null);
  const [editingFeeValue, setEditingFeeValue] = useState("");
  const [editingTickerId, setEditingTickerId] = useState<string | null>(null);
  const [editingTickerValue, setEditingTickerValue] = useState("");

  const { transactions, isLoading, updateTransaction } = useInvestmentTransactions({ monthKey });

  const displayedTransactions = useMemo(() => {
    if (!filterImportIds) return transactions;
    return transactions.filter((tx) => tx.import_id != null && filterImportIds.has(tx.import_id));
  }, [transactions, filterImportIds]);

  const dayGroups = useMemo(() => {
    const groups: { dateKey: string; rows: InvestmentTransaction[] }[] = [];
    for (const tx of displayedTransactions) {
      const last = groups[groups.length - 1];
      if (last && last.dateKey === tx.date) last.rows.push(tx);
      else groups.push({ dateKey: tx.date, rows: [tx] });
    }
    return groups;
  }, [displayedTransactions]);

  const summary = useMemo<InvestmentTxSummary>(() => {
    let buys = 0, sells = 0, dividends = 0, fees = 0;
    displayedTransactions.forEach((tx) => {
      if (tx.type === "buy") buys += tx.total_amount;
      else if (tx.type === "sell") sells += tx.total_amount;
      else if (tx.type === "dividend") dividends += tx.total_amount;
      else if (tx.type === "fee") fees += tx.total_amount;
    });
    return { count: displayedTransactions.length, buys, sells, dividends, fees, net: buys - sells + dividends - fees };
  }, [displayedTransactions]);

  const accountTabsData = useMemo<InvestmentAccountTab[]>(() => {
    const map = new Map<string, { id: string; name: string; color: string | null; txCount: number }>();
    for (const tx of transactions) {
      if (!tx.import_id) continue;
      const imp = imports.find((i) => i.id === tx.import_id);
      if (!imp?.account_id) continue;
      const existing = map.get(imp.account_id);
      if (existing) {
        existing.txCount++;
      } else {
        const acct = investmentAccounts.find((a) => a.id === imp.account_id);
        map.set(imp.account_id, {
          id: imp.account_id,
          name: acct ? getAccountDisplayName(acct) : imp.account_id,
          color: null,
          txCount: 1,
        });
      }
    }
    return Array.from(map.values());
  }, [transactions, imports, investmentAccounts]);

  const compatSummary = useMemo<InvestmentSummary>(() => ({
    count: summary.count,
    deposits: summary.buys,
    withdrawals: summary.sells,
    net: summary.net,
    hidden: 0,
  }), [summary]);

  const callbackRef = useRef(onSummaryChange);
  callbackRef.current = onSummaryChange;
  useEffect(() => {
    callbackRef.current?.({ tabs: accountTabsData, globalSummary: compatSummary });
  }, [accountTabsData, compatSummary]);

  const handleFieldSave = (tx: InvestmentTransaction, field: string, raw: string) => {
    const sanitized = raw.replace(/\s/g, "").replace(",", ".");
    const parsed = parseFloat(sanitized);
    if (Number.isNaN(parsed)) return;
    const current = (tx as unknown as Record<string, unknown>)[field];
    if (parsed === current) return;

    const payload: Record<string, unknown> = { [field]: parsed };
    if (field === "quantity" || field === "price_per_unit") {
      const qty = field === "quantity" ? parsed : tx.quantity;
      const price = field === "price_per_unit" ? parsed : tx.price_per_unit;
      payload.total_amount = qty * price;
    }
    updateTransaction.mutate({ id: tx.id, payload });
  };

  const handleTickerSave = (tx: InvestmentTransaction, newTicker: string) => {
    if (newTicker === (tx.ticker || "")) return;
    updateTransaction.mutate({ id: tx.id, payload: { ticker: newTicker } });
  };

  const handleTypeChange = (tx: InvestmentTransaction, newType: string) => {
    if (newType === tx.type) return;
    updateTransaction.mutate({ id: tx.id, payload: { type: newType } });
  };

  const handleDrawerSave = (tx: InvestmentTransaction, edits: PendingInvTxEdit) => {
    const payload: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(edits)) {
      payload[key] = val;
    }
    if (("quantity" in edits || "price_per_unit" in edits) && !("total_amount" in payload)) {
      const qty = edits.quantity ?? tx.quantity;
      const price = edits.price_per_unit ?? tx.price_per_unit;
      payload.total_amount = qty * price;
    }
    updateTransaction.mutate(
      { id: tx.id, payload },
      {
        onSuccess: () => toast({ title: t("imports.saved"), description: t("imports.movementUpdated") }),
        onError: (e: Error) => toast({ title: t("imports.couldNotSave"), description: e.message, variant: "destructive" }),
      },
    );
  };

  const totalAmountColor = (type: string, amount: number) => {
    if (amount === 0) return "text-muted-foreground";
    if (type === "buy" || type === "dividend" || type === "deposit") return "text-success";
    if (type === "sell" || type === "fee" || type === "withdrawal") return "text-destructive";
    return "text-foreground";
  };

  if (isLoading) {
    return (
      <div className="bg-card py-12 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {pendingFiles && pendingFiles.length > 0 && (
        <div className="px-6 py-3 border-b border-border">
          <ProcessingPanel files={pendingFiles} />
        </div>
      )}

      {displayedTransactions.length === 0 ? (
        <div className="bg-card py-12 px-6 text-center">
          <FileSpreadsheet className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {t("imports.noMovementsYet", { month: monthLabel })}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop grid */}
          <div className="bg-card flex-1 flex flex-col min-h-0">
            <div className="hidden md:block overflow-auto flex-1 min-h-0">
              {/* Sticky header */}
              <div
                className="sticky top-0 z-10 grid items-center bg-card border-b border-border"
                style={{
                  gridTemplateColumns: "34px 94px 70px 72px minmax(0,1fr) 70px 82px 56px 90px 54px 36px",
                  gap: 10,
                  padding: "11px 34px",
                }}
              >
                <span />
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
                  {t("imports.date")}
                </span>
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
                  {t("imports.fieldType")}
                </span>
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
                  {t("imports.ticker", "Ticker")}
                </span>
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
                  {t("imports.asset", "Asset")}
                </span>
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-muted-foreground text-right">
                  {t("imports.qty", "Qty")}
                </span>
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-muted-foreground text-right">
                  {t("imports.price", "Price")}
                </span>
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-muted-foreground text-right">
                  {t("imports.fee", "Fee")}
                </span>
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-muted-foreground text-right">
                  {t("imports.total", "Total")}
                </span>
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
                  {t("imports.currency", "Ccy")}
                </span>
                <span />
              </div>

              {/* Rows */}
              <div>
                {displayedTransactions.map((tx, idx) => {
                  const meta = getTxTypeMeta(tx.type);

                  return (
                    <div
                      key={tx.id}
                      className="grid items-center cursor-pointer transition-[background] duration-100"
                      style={{
                        gridTemplateColumns: "34px 94px 70px 72px minmax(0,1fr) 70px 82px 56px 90px 54px 36px",
                        gap: 10,
                        padding: "12px 34px",
                        borderBottom: "1px solid hsl(var(--border) / 0.5)",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "hsl(var(--muted) / 0.4)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}
                    >
                      {/* # */}
                      <span className="text-xs text-muted-foreground/60 tabular-nums text-center">
                        {idx + 1}
                      </span>

                      {/* Date */}
                      <span className="tabular-nums whitespace-nowrap text-xs font-medium text-foreground">
                        {formatDate(new Date(tx.date))}
                      </span>

                      {/* Type */}
                      <span className="flex items-center gap-1.5">
                        <span
                          className="w-[7px] h-[7px] rounded-full shrink-0"
                          style={{ backgroundColor: meta.dotColor }}
                        />
                        <div className="pk-select-wrap pk-select-wrap--sm flex-1 min-w-0 flex items-center">
                          <select
                            value={tx.type}
                            onChange={(e) => handleTypeChange(tx, e.target.value)}
                            className="h-auto w-full border-0 bg-transparent text-xs font-semibold cursor-pointer leading-none"
                            style={{ color: meta.dotColor, paddingBlock: 0 }}
                          >
                            {TX_TYPES_LIST.map((t) => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                        </div>
                      </span>

                      {/* Ticker */}
                      <span
                        className="min-w-0"
                        onDoubleClick={() => {
                          setEditingTickerId(tx.id);
                          setEditingTickerValue(tx.ticker || "");
                        }}
                      >
                        {editingTickerId === tx.id ? (
                          <Input
                            value={editingTickerValue}
                            onChange={(e) => setEditingTickerValue(e.target.value.toUpperCase())}
                            onBlur={() => {
                              handleTickerSave(tx, editingTickerValue);
                              setEditingTickerId(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                              if (e.key === "Escape") setEditingTickerId(null);
                            }}
                            className="h-6 text-[12px] px-1 py-0 border-primary/40 w-full uppercase"
                            autoFocus
                          />
                        ) : (
                          <span className="text-xs font-semibold text-foreground uppercase truncate block">
                            {tx.ticker || "—"}
                          </span>
                        )}
                      </span>

                      {/* Asset name */}
                      <span className="text-xs text-foreground truncate" title={tx.asset_name || ""}>
                        {tx.asset_name || "—"}
                      </span>

                      {/* Qty */}
                      <span
                        className="tabular-nums whitespace-nowrap text-right text-xs font-medium text-foreground"
                        onDoubleClick={() => {
                          setEditingQtyId(tx.id);
                          setEditingQtyValue(String(tx.quantity).replace(".", ","));
                        }}
                      >
                        {editingQtyId === tx.id ? (
                          <Input
                            value={editingQtyValue}
                            onChange={(e) => setEditingQtyValue(e.target.value)}
                            onBlur={() => {
                              handleFieldSave(tx, "quantity", editingQtyValue);
                              setEditingQtyId(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                              if (e.key === "Escape") setEditingQtyId(null);
                            }}
                            inputMode="decimal"
                            className="h-6 text-[12px] px-1 py-0 text-right tabular-nums border-primary/40 w-16 ml-auto"
                            autoFocus
                          />
                        ) : (
                          <span>{tx.quantity}</span>
                        )}
                      </span>

                      {/* Price */}
                      <span
                        className="tabular-nums whitespace-nowrap text-right text-xs font-medium text-foreground"
                        onDoubleClick={() => {
                          setEditingPriceId(tx.id);
                          setEditingPriceValue(String(tx.price_per_unit).replace(".", ","));
                        }}
                      >
                        {editingPriceId === tx.id ? (
                          <Input
                            value={editingPriceValue}
                            onChange={(e) => setEditingPriceValue(e.target.value)}
                            onBlur={() => {
                              handleFieldSave(tx, "price_per_unit", editingPriceValue);
                              setEditingPriceId(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                              if (e.key === "Escape") setEditingPriceId(null);
                            }}
                            inputMode="decimal"
                            className="h-6 text-[12px] px-1 py-0 text-right tabular-nums border-primary/40 w-20 ml-auto"
                            autoFocus
                          />
                        ) : (
                          <span>{formatCurrency(tx.price_per_unit, tx.currency, true)}</span>
                        )}
                      </span>

                      {/* Fee */}
                      <span
                        className="tabular-nums whitespace-nowrap text-right text-xs text-muted-foreground"
                        onDoubleClick={() => {
                          setEditingFeeId(tx.id);
                          setEditingFeeValue(String(tx.fee).replace(".", ","));
                        }}
                      >
                        {editingFeeId === tx.id ? (
                          <Input
                            value={editingFeeValue}
                            onChange={(e) => setEditingFeeValue(e.target.value)}
                            onBlur={() => {
                              handleFieldSave(tx, "fee", editingFeeValue);
                              setEditingFeeId(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                              if (e.key === "Escape") setEditingFeeId(null);
                            }}
                            inputMode="decimal"
                            className="h-6 text-[12px] px-1 py-0 text-right tabular-nums border-primary/40 w-14 ml-auto"
                            autoFocus
                          />
                        ) : (
                          <span>{tx.fee > 0 ? formatCurrency(tx.fee, tx.currency, true) : "—"}</span>
                        )}
                      </span>

                      {/* Total */}
                      <span className={cn("tabular-nums whitespace-nowrap text-right text-xs font-semibold", totalAmountColor(tx.type, tx.total_amount))}>
                        {formatCurrency(tx.total_amount, tx.currency, true)}
                      </span>

                      {/* Currency */}
                      <span className="text-[11px] font-medium text-muted-foreground uppercase">
                        {tx.currency}
                      </span>

                      {/* Kebab */}
                      <span className="flex items-center justify-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex items-center justify-center cursor-pointer text-muted-foreground/50"
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="12" cy="19" r="1.6" /></svg>
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={() => setEditingTx(tx)}
                              className="gap-2 text-[13px]"
                            >
                              <Pencil className="w-4 h-4" />
                              {t("imports.editTransaction")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {tx.ticker && (
                              <DropdownMenuItem
                                onClick={() => {
                                  navigator.clipboard.writeText(tx.ticker || "");
                                  sonnerToast("Copied");
                                }}
                                className="gap-2 text-[13px]"
                              >
                                <Copy className="w-4 h-4" />
                                {t("imports.copyTicker", "Copy ticker")}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => {
                                navigator.clipboard.writeText(formatCurrency(tx.total_amount, tx.currency, true));
                                sonnerToast("Copied");
                              }}
                              className="gap-2 text-[13px]"
                            >
                              <Copy className="w-4 h-4" />
                              {t("imports.copyAmount")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mobile: day-grouped cards */}
            <div className="md:hidden">
              {dayGroups.map((group) => (
                <div key={group.dateKey}>
                  <div className="flex items-baseline gap-1.5 bg-muted/40 px-3 py-1.5">
                    <span className="text-[13px] font-semibold tabular-nums text-foreground">
                      {group.dateKey.slice(8, 10)}
                    </span>
                    <span className="text-[11px] font-medium text-muted-foreground capitalize">
                      {formatWeekday(group.dateKey)}
                    </span>
                  </div>

                  <div className="divide-y divide-border/40">
                    {group.rows.map((tx) => {
                      const meta = getTxTypeMeta(tx.type);
                      const TypeIcon = meta.icon;

                      return (
                        <div
                          key={tx.id}
                          className="relative flex items-center gap-2.5 px-3 py-2.5 bg-card select-none"
                          onClick={() => setEditingTx(tx)}
                        >
                          <div
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                              tx.type === "buy" || tx.type === "dividend" ? "bg-success/15 text-success"
                                : tx.type === "sell" || tx.type === "fee" ? "bg-destructive/15 text-destructive"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            <TypeIcon className="h-3.5 w-3.5" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] text-foreground">
                              <span className="font-semibold uppercase">{tx.ticker || "—"}</span>
                              {tx.asset_name && (
                                <>
                                  <span className="text-muted-foreground/50 mx-1">&middot;</span>
                                  <span className="text-[12px] text-muted-foreground">{tx.asset_name}</span>
                                </>
                              )}
                            </p>
                            <div className="mt-0.5 flex items-center gap-1.5">
                              <span
                                className="inline-flex items-center gap-1 text-[10.5px] font-semibold"
                                style={{ color: meta.dotColor }}
                              >
                                <span className="w-[5px] h-[5px] rounded-full" style={{ backgroundColor: meta.dotColor }} />
                                {meta.label}
                              </span>
                              {tx.quantity > 0 && (
                                <span className="text-[11px] text-muted-foreground tabular-nums">
                                  {tx.quantity} × {formatCurrency(tx.price_per_unit, tx.currency, true)}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-col items-end gap-0.5">
                            <span className={cn("text-[13px] font-semibold tabular-nums", totalAmountColor(tx.type, tx.total_amount))}>
                              {formatCurrency(tx.total_amount, tx.currency, true)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Processing panel at the bottom */}
            {pendingFiles && pendingFiles.length > 0 && (
              <div className="bg-card px-6 py-6 flex items-start justify-center border-t border-border">
                <div className="w-full max-w-xl">
                  <ProcessingPanel files={pendingFiles} />
                </div>
              </div>
            )}
          </div>

          <InvestmentTxEditDrawer
            tx={editingTx}
            open={!!editingTx}
            onOpenChange={(open) => { if (!open) setEditingTx(null); }}
            formatCurrency={formatCurrency}
            onSave={(tx, edits) => {
              handleDrawerSave(tx, edits);
              setEditingTx(null);
            }}
          />
        </>
      )}
    </div>
  );
}
