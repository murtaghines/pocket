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
        <div className="overflow-x-auto">
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
