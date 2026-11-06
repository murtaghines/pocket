import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingCart,
  TrendingDown,
  Coins,
  Receipt,
} from "lucide-react";
import { useLocalization } from "@/hooks/useLocalization";
import type { InvestmentTransaction } from "@/hooks/useInvestmentTransactions";

interface TransactionsListProps {
  transactions: InvestmentTransaction[];
}

const TYPE_CONFIG = {
  buy: {
    icon: ShoppingCart,
    color: "text-success",
    bg: "bg-success/15",
    badge: "bg-success text-white",
  },
  sell: {
    icon: TrendingDown,
    color: "text-destructive",
    bg: "bg-destructive/15",
    badge: "bg-destructive text-white",
  },
  dividend: {
    icon: Coins,
    color: "text-[hsl(270,60%,55%)]",
    bg: "bg-[hsl(270,60%,55%)]/15",
    badge: "bg-[hsl(270,60%,55%)] text-white",
  },
  fee: {
    icon: Receipt,
    color: "text-warning",
    bg: "bg-warning/15",
    badge: "bg-warning text-foreground",
  },
} as const;

export function TransactionsList({ transactions }: TransactionsListProps) {
  const { t } = useTranslation("investments");
  const { formatCurrency, formatDate } = useLocalization();

  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-sm text-muted-foreground text-center">
            {t("transactions.noTransactions")}
          </p>
        </CardContent>
      </Card>
    );
  }

  const displayed = transactions.slice(0, 50);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("transactions.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Mobile: stacked cards */}
        <div className="md:hidden flex flex-col gap-2">
          {displayed.map((tx) => {
            const cfg = TYPE_CONFIG[tx.type as keyof typeof TYPE_CONFIG];
            const Icon = cfg?.icon ?? ShoppingCart;
            const amount =
              tx.type === "sell" || tx.type === "fee"
                ? -tx.total_amount
                : tx.total_amount;
            return (
              <div
                key={tx.id}
                className="bg-background border border-border rounded-xl p-3 flex items-center gap-3"
              >
                <div
                  className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${cfg?.bg ?? "bg-muted"} ${cfg?.color ?? "text-muted-foreground"}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground line-clamp-1">
                    {tx.ticker && (
                      <span className="font-semibold">{tx.ticker} </span>
                    )}
                    {tx.asset_name ?? t(`transactions.${tx.type}`)}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <Badge
                      className={`text-[10px] px-1.5 py-0 font-semibold border-0 ${cfg?.badge ?? ""}`}
                    >
                      {t(`transactions.${tx.type}`)}
                    </Badge>
                    {tx.quantity > 0 && (tx.type === "buy" || tx.type === "sell") && (
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        {tx.quantity} × {formatCurrency(tx.price_per_unit)}
                      </span>
                    )}
                    <span className="text-[11px] text-muted-foreground">
                      {formatDate(tx.date)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`text-sm font-semibold tabular-nums whitespace-nowrap ${
                      amount > 0 ? "text-success" : amount < 0 ? "text-destructive" : "text-muted-foreground"
                    }`}
                  >
                    {formatCurrency(amount, undefined, true)}
                  </div>
                  {tx.realized_pnl != null && (
                    <div
                      className={`text-[11px] tabular-nums ${
                        tx.realized_pnl > 0
                          ? "text-success"
                          : tx.realized_pnl < 0
                            ? "text-destructive"
                            : "text-muted-foreground"
                      }`}
                    >
                      P&L {formatCurrency(tx.realized_pnl, undefined, true)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop: table */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">{t("transactions.date")}</TableHead>
                <TableHead>{t("transactions.type")}</TableHead>
                <TableHead>{t("portfolio.asset")}</TableHead>
                <TableHead className="text-right">{t("transactions.quantity")}</TableHead>
                <TableHead className="text-right">{t("transactions.pricePerUnit")}</TableHead>
                <TableHead className="text-right">{t("transactions.feeLabel")}</TableHead>
                <TableHead className="text-right">{t("transactions.totalAmount")}</TableHead>
                <TableHead className="text-right">{t("transactions.realizedPnl")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayed.map((tx) => {
                const cfg = TYPE_CONFIG[tx.type as keyof typeof TYPE_CONFIG];
                const amount =
                  tx.type === "sell" || tx.type === "fee"
                    ? -tx.total_amount
                    : tx.total_amount;
                return (
                  <TableRow key={tx.id}>
                    <TableCell className="font-medium tabular-nums">
                      {formatDate(tx.date)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`text-[11px] font-semibold border-0 ${cfg?.badge ?? ""}`}
                      >
                        {t(`transactions.${tx.type}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {tx.ticker && (
                          <span className="font-semibold text-sm">{tx.ticker}</span>
                        )}
                        {tx.asset_name && (
                          <span className="text-sm text-muted-foreground">
                            {tx.asset_name}
                          </span>
                        )}
                        {!tx.ticker && !tx.asset_name && (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {tx.quantity > 0 ? tx.quantity : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {tx.price_per_unit > 0 ? formatCurrency(tx.price_per_unit) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {tx.fee > 0 ? formatCurrency(tx.fee) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`tabular-nums font-medium ${
                          amount > 0
                            ? "text-success"
                            : amount < 0
                              ? "text-destructive"
                              : "text-muted-foreground"
                        }`}
                      >
                        {formatCurrency(amount, undefined, true)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {tx.realized_pnl != null ? (
                        <span
                          className={`tabular-nums font-medium ${
                            tx.realized_pnl > 0
                              ? "text-success"
                              : tx.realized_pnl < 0
                                ? "text-destructive"
                                : "text-muted-foreground"
                          }`}
                        >
                          {formatCurrency(tx.realized_pnl, undefined, true)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {transactions.length > 50 && (
          <p className="text-sm text-muted-foreground text-center mt-4">
            {transactions.length - 50}+
          </p>
        )}
      </CardContent>
    </Card>
  );
}
