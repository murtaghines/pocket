import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { useLocalization } from "@/hooks/useLocalization";

interface Investment {
  id: string;
  date: string;
  amount: number;
  platform: string;
  asset_type: string | null;
  description: string;
  type: 'deposit' | 'withdrawal';
}

interface InvestmentsTableProps {
  investments: Investment[];
}

export function InvestmentsTable({ investments }: InvestmentsTableProps) {
  const { t } = useTranslation('investments');
  const { formatCurrency, formatDate } = useLocalization();

  const ASSET_LABELS: Record<string, string> = {
    'stocks': t('byAssetType.types.stocks'),
    'etf': 'ETFs',
    'bonds': t('byAssetType.types.bonds'),
    'commodities': t('byAssetType.types.commodities'),
    'crypto': t('byAssetType.types.crypto'),
    'savings': t('byAssetType.types.cash'),
  };

  const displayedInvestments = investments.slice(0, 50);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('history.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Mobile: stacked cards */}
        <div className="md:hidden flex flex-col gap-2">
          {displayedInvestments.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">—</p>
          )}
          {displayedInvestments.map((inv) => (
            <div
              key={inv.id}
              className="bg-background border border-border rounded-xl p-3 flex items-center gap-3"
            >
              <div
                className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
                  inv.type === "deposit"
                    ? "bg-success/15 text-success"
                    : "bg-destructive/15 text-destructive"
                }`}
              >
                {inv.type === "deposit" ? (
                  <ArrowUpCircle className="w-4 h-4" />
                ) : (
                  <ArrowDownCircle className="w-4 h-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground line-clamp-1">
                  {inv.description}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {inv.platform}
                  </Badge>
                  {inv.asset_type && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {ASSET_LABELS[inv.asset_type] || inv.asset_type}
                    </Badge>
                  )}
                  <span className="text-[11px] text-muted-foreground">
                    {formatDate(inv.date)}
                  </span>
                </div>
              </div>
              <div
                className={`text-sm font-semibold whitespace-nowrap ${
                  inv.type === "deposit" ? "text-success" : "text-destructive"
                }`}
              >
                {inv.type === "deposit" ? "+" : "-"}
                {formatCurrency(Math.abs(inv.amount))}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop: table */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">{t('history.date')}</TableHead>
                <TableHead>{t('history.description')}</TableHead>
                <TableHead>{t('history.platform')}</TableHead>
                <TableHead>{t('history.type')}</TableHead>
                <TableHead className="text-right">{t('history.amount')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedInvestments.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">
                    {formatDate(inv.date)}
                  </TableCell>
                  <TableCell>{inv.description}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{inv.platform}</Badge>
                  </TableCell>
                  <TableCell>
                    {inv.asset_type ? (
                      <Badge variant="secondary">
                        {ASSET_LABELS[inv.asset_type] || inv.asset_type}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {inv.type === 'deposit' ? (
                        <ArrowUpCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <ArrowDownCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span className={inv.type === 'deposit' ? 'text-green-600' : 'text-red-600'}>
                        {inv.type === 'deposit' ? '+' : '-'}{formatCurrency(Math.abs(inv.amount))}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {investments.length > 50 && (
          <p className="text-sm text-muted-foreground text-center mt-4">
            {investments.length - 50}+
          </p>
        )}
      </CardContent>
    </Card>
  );
}
