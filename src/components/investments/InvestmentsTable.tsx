import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowUpCircle, ArrowDownCircle } from "lucide-react";

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

const ASSET_LABELS: Record<string, string> = {
  'stocks': 'Acciones',
  'etf': 'ETFs',
  'bonds': 'Bonos',
  'commodities': 'Materias Primas',
  'crypto': 'Cripto',
  'savings': 'Ahorro',
};

export function InvestmentsTable({ investments }: InvestmentsTableProps) {
  const formatCurrency = (amount: number) =>
    Math.abs(amount).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });

  // Show last 50 transactions
  const displayedInvestments = investments.slice(0, 50);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de Movimientos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Fecha</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Plataforma</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Monto</TableHead>
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
                        {inv.type === 'deposit' ? '+' : '-'}{formatCurrency(inv.amount)}
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
            Mostrando los últimos 50 movimientos de {investments.length} totales
          </p>
        )}
      </CardContent>
    </Card>
  );
}