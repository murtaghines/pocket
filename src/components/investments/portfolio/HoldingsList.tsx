import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Plus, ArrowUpDown, TrendingUp, TrendingDown, Pencil, Search } from "lucide-react";
import { useLocalization } from "@/hooks/useLocalization";
import type { Holding } from "@/hooks/useHoldings";
import { AddHoldingDialog } from "./AddHoldingDialog";
import { UpdatePricePopover } from "./UpdatePricePopover";
import { HoldingDetailDialog } from "./HoldingDetailDialog";
import { ASSET_CLASS_CONFIG, assetColorAlpha, assetColorDarken } from "./assetClassConfig";
import { cn } from "@/lib/utils";

type SortKey = "asset_name" | "current_value" | "unrealized_pnl" | "weight";

interface HoldingsListProps {
  holdings: Holding[];
  totalValue: number;
  displayCurrency?: string;
  bestHoldingId?: string | null;
  worstHoldingId?: string | null;
}

export function HoldingsList({ holdings, totalValue, displayCurrency, bestHoldingId, worstHoldingId }: HoldingsListProps) {
  const { t } = useTranslation("investments");
  const { formatCurrency } = useLocalization();
  const [sortKey, setSortKey] = useState<SortKey>("current_value");
  const [sortAsc, setSortAsc] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [priceHoldingId, setPriceHoldingId] = useState<string | null>(null);
  const [detailHolding, setDetailHolding] = useState<Holding | null>(null);
  const [search, setSearch] = useState("");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const filtered = search
    ? holdings.filter((h) => {
        const q = search.toLowerCase();
        return (
          h.asset_name.toLowerCase().includes(q) ||
          (h.ticker?.toLowerCase().includes(q) ?? false)
        );
      })
    : holdings;

  const sorted = [...filtered].sort((a, b) => {
    let va: number | string;
    let vb: number | string;
    switch (sortKey) {
      case "asset_name":
        va = a.asset_name.toLowerCase();
        vb = b.asset_name.toLowerCase();
        break;
      case "current_value":
        va = a.current_value;
        vb = b.current_value;
        break;
      case "unrealized_pnl":
        va = a.unrealized_pnl;
        vb = b.unrealized_pnl;
        break;
      case "weight":
        va = totalValue > 0 ? a.current_value / totalValue : 0;
        vb = totalValue > 0 ? b.current_value / totalValue : 0;
        break;
      default:
        va = a.current_value;
        vb = b.current_value;
    }
    const cmp = va < vb ? -1 : va > vb ? 1 : 0;
    return sortAsc ? cmp : -cmp;
  });

  const pnlPercent = (h: Holding) =>
    h.cost_basis > 0 ? (h.unrealized_pnl / h.cost_basis) * 100 : 0;

  const weight = (h: Holding) =>
    totalValue > 0 ? (h.current_value / totalValue) * 100 : 0;

  const SortHeader = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(k)}
      className="flex items-center gap-1 hover:text-foreground transition-colors"
    >
      {children}
      <ArrowUpDown className="w-3 h-3" />
    </button>
  );

  return (
    <div className="rounded-xl bg-card shadow-section overflow-hidden flex flex-col">
      <div className="flex flex-row items-center justify-between gap-3 px-6 pt-5 pb-3 shrink-0">
        <h3 className="text-base font-semibold flex items-center gap-2">
          {t("portfolio.holdings")}
          {holdings.length > 0 && (
            <Badge variant="secondary" className="text-xs tabular-nums">
              {holdings.length}
            </Badge>
          )}
        </h3>
        <div className="flex items-center gap-2">
          {holdings.length > 5 && (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("portfolio.asset")}
                className="h-8 w-[160px] pl-8 text-sm rounded-lg"
              />
            </div>
          )}
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t("portfolio.addHolding")}
          </Button>
        </div>
      </div>
      <div className="px-6 pb-5">
        {holdings.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground text-sm mb-4">
              {t("portfolio.noHoldings")}
            </p>
            <Button variant="outline" onClick={() => setAddOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t("portfolio.addFirst")}
            </Button>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="md:hidden flex flex-col gap-2">
              {sorted.map((h) => {
                const pnl = pnlPercent(h);
                const cfg = ASSET_CLASS_CONFIG[h.asset_class] ?? ASSET_CLASS_CONFIG.other;
                return (
                  <button
                    key={h.id}
                    onClick={() => setDetailHolding(h)}
                    className={cn(
                      "bg-background border border-border rounded-xl p-3 flex items-center gap-3 w-full text-left hover:border-primary/30 transition-colors",
                      h.id === bestHoldingId && "border-l-[3px] border-l-success",
                      h.id === worstHoldingId && "border-l-[3px] border-l-destructive",
                    )}
                  >
                    <div
                      className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-[14px] font-bold"
                      style={{
                        backgroundColor: assetColorAlpha(cfg, 0.15),
                        color: assetColorDarken(cfg),
                      }}
                    >
                      {(h.ticker ?? h.asset_name).slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground line-clamp-1">
                        {h.asset_name}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {h.ticker && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {h.ticker}
                          </Badge>
                        )}
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0"
                        >
                          {t(`byAssetType.types.${cfg.i18nKey}`)}
                        </Badge>
                        {displayCurrency && h.currency !== displayCurrency && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                            {h.currency}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold tabular-nums">
                        {formatCurrency(h.current_value)}
                      </div>
                      <div
                        className={`text-[11px] tabular-nums font-medium ${
                          h.unrealized_pnl > 0 ? "text-success" : h.unrealized_pnl < 0 ? "text-destructive" : "text-muted-foreground"
                        }`}
                      >
                        {h.unrealized_pnl > 0 ? "+" : ""}
                        {pnl.toFixed(1)}%
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <SortHeader k="asset_name">{t("portfolio.asset")}</SortHeader>
                    </TableHead>
                    <TableHead className="text-right">{t("portfolio.quantity")}</TableHead>
                    <TableHead className="text-right">{t("portfolio.avgCost")}</TableHead>
                    <TableHead className="text-right">{t("portfolio.price")}</TableHead>
                    <TableHead className="text-right">
                      <SortHeader k="current_value">{t("portfolio.value")}</SortHeader>
                    </TableHead>
                    <TableHead className="text-right">
                      <SortHeader k="unrealized_pnl">{t("portfolio.pnl")}</SortHeader>
                    </TableHead>
                    <TableHead className="text-right">
                      <SortHeader k="weight">{t("portfolio.weight")}</SortHeader>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((h) => {
                    const pnl = pnlPercent(h);
                    const cfg = ASSET_CLASS_CONFIG[h.asset_class] ?? ASSET_CLASS_CONFIG.other;
                    const isPositive = h.unrealized_pnl > 0;
                    const isZeroPnl = h.unrealized_pnl === 0;
                    return (
                      <TableRow
                        key={h.id}
                        className={cn(
                          "cursor-pointer",
                          h.id === bestHoldingId && "border-l-[3px] border-l-success",
                          h.id === worstHoldingId && "border-l-[3px] border-l-destructive",
                        )}
                        onClick={() => setDetailHolding(h)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div
                              className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold"
                              style={{
                                backgroundColor: assetColorAlpha(cfg, 0.15),
                                color: assetColorDarken(cfg),
                              }}
                            >
                              {(h.ticker ?? h.asset_name).slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{h.asset_name}</p>
                              <div className="flex items-center gap-1 mt-0.5">
                                {h.ticker && (
                                  <span className="text-[11px] text-muted-foreground font-mono">
                                    {h.ticker}
                                  </span>
                                )}
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] px-1.5 py-0"
                                >
                                  {t(`byAssetType.types.${cfg.i18nKey}`)}
                                </Badge>
                                {displayCurrency && h.currency !== displayCurrency && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                                    {h.currency}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {h.quantity.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {formatCurrency(h.avg_cost_per_unit)}
                        </TableCell>
                        <TableCell className="text-right">
                          <button
                            onClick={(e) => { e.stopPropagation(); setPriceHoldingId(h.id); }}
                            className="inline-flex items-center gap-1 tabular-nums hover:text-primary transition-colors group"
                          >
                            {h.current_price != null
                              ? formatCurrency(h.current_price)
                              : "—"}
                            <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          {formatCurrency(h.current_value)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {!isZeroPnl && (isPositive ? (
                              <TrendingUp className="w-3.5 h-3.5 text-success" />
                            ) : (
                              <TrendingDown className="w-3.5 h-3.5 text-destructive" />
                            ))}
                            <span
                              className={`tabular-nums font-medium text-sm ${
                                isZeroPnl ? "text-muted-foreground" : isPositive ? "text-success" : "text-destructive"
                              }`}
                            >
                              {isPositive ? "+" : ""}
                              {pnl.toFixed(1)}%
                            </span>
                          </div>
                          <p
                            className={`text-[11px] tabular-nums ${
                              isZeroPnl ? "text-muted-foreground" : isPositive ? "text-success" : "text-destructive"
                            }`}
                          >
                            {formatCurrency(h.unrealized_pnl)}
                          </p>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {weight(h).toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>

      <AddHoldingDialog open={addOpen} onOpenChange={setAddOpen} />
      {priceHoldingId && (
        <UpdatePricePopover
          holdingId={priceHoldingId}
          currentPrice={holdings.find((h) => h.id === priceHoldingId)?.current_price ?? null}
          onClose={() => setPriceHoldingId(null)}
        />
      )}
      {detailHolding && (
        <HoldingDetailDialog
          holding={detailHolding}
          open={!!detailHolding}
          onOpenChange={(open) => { if (!open) setDetailHolding(null); }}
        />
      )}
    </div>
  );
}
