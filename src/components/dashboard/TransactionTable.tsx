import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Transaction, categoryLabels, Category } from "@/lib/mockData";
import { Search, ArrowUpRight, ArrowDownRight, ArrowLeftRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface TransactionTableProps {
  transactions: Transaction[];
}

const categoryBadgeColors: Record<Category, string> = {
  food: 'bg-category-food/20 text-category-food border-category-food/30',
  transport: 'bg-category-transport/20 text-category-transport border-category-transport/30',
  housing: 'bg-category-housing/20 text-category-housing border-category-housing/30',
  subscriptions: 'bg-category-subscriptions/20 text-category-subscriptions border-category-subscriptions/30',
  leisure: 'bg-category-leisure/20 text-category-leisure border-category-leisure/30',
  health: 'bg-category-health/20 text-category-health border-category-health/30',
  education: 'bg-category-education/20 text-category-education border-category-education/30',
  travel: 'bg-category-travel/20 text-category-travel border-category-travel/30',
  other: 'bg-category-other/20 text-category-other border-category-other/30',
  income: 'bg-success/20 text-success border-success/30',
  transfer: 'bg-muted text-muted-foreground border-muted-foreground/30',
  investment: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
};

type MovementType = 'income' | 'expense' | 'transfer' | 'investment';

const movementLabels: Record<MovementType, string> = {
  income: 'Ingreso',
  expense: 'Gasto',
  transfer: 'Transferencia',
  investment: 'Inversión',
};

const movementBadgeColors: Record<MovementType, string> = {
  income: 'bg-success/20 text-success border-success/30',
  expense: 'bg-destructive/20 text-destructive border-destructive/30',
  transfer: 'bg-muted text-muted-foreground border-muted-foreground/30',
  investment: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
};

const getMovementType = (transaction: Transaction): MovementType => {
  if (transaction.type === 'income') return 'income';
  if (transaction.category === 'investment') return 'investment';
  if (transaction.type === 'transfer' || transaction.category === 'transfer') return 'transfer';
  return 'expense';
};

export function TransactionTable({ transactions }: TransactionTableProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [bankFilter, setBankFilter] = useState<string>("all");

  const uniqueBanks = [...new Set(transactions.map(t => t.bank))];
  const categories = Object.keys(categoryLabels) as Category[];

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || t.category === categoryFilter;
    const matchesBank = bankFilter === "all" || t.bank === bankFilter;
    return matchesSearch && matchesCategory && matchesBank;
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  };

  const formatMonth = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('es-ES', { 
      style: 'currency', 
      currency: 'EUR',
      signDisplay: 'never'
    });
  };

  return (
    <Card className="animate-slide-up" style={{ animationDelay: '400ms' }}>
      <CardHeader>
        <CardTitle className="text-lg">Transacciones</CardTitle>
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar transacciones..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>
                  {categoryLabels[cat]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={bankFilter} onValueChange={setBankFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Banco" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los bancos</SelectItem>
              {uniqueBanks.map(bank => (
                <SelectItem key={bank} value={bank}>
                  {bank}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[80px]">Mes</TableHead>
                <TableHead className="w-[90px]">Fecha</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="hidden lg:table-cell">Movimiento</TableHead>
                <TableHead className="hidden md:table-cell">Categoría</TableHead>
                <TableHead className="hidden sm:table-cell">Cuenta</TableHead>
                <TableHead className="text-right">Importe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No se encontraron transacciones
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((transaction) => {
                  const movementType = getMovementType(transaction);
                  return (
                    <TableRow 
                      key={transaction.id}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <TableCell className="text-xs text-muted-foreground uppercase">
                        {formatMonth(transaction.date)}
                      </TableCell>
                      <TableCell className="font-medium text-muted-foreground">
                        {formatDate(transaction.date)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "p-1.5 rounded-full flex-shrink-0",
                            movementType === 'income' ? "bg-success/20"
                              : movementType === 'investment' ? "bg-blue-500/20"
                              : movementType === 'transfer' ? "bg-muted"
                              : "bg-destructive/20"
                          )}>
                            {movementType === 'income' ? (
                              <ArrowDownRight className="w-3 h-3 text-success" />
                            ) : movementType === 'investment' ? (
                              <Minus className="w-3 h-3 text-blue-500" />
                            ) : movementType === 'transfer' ? (
                              <Minus className="w-3 h-3 text-muted-foreground" />
                            ) : (
                              <ArrowUpRight className="w-3 h-3 text-destructive" />
                            )}
                          </div>
                          <span className="truncate">{transaction.description}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "font-normal",
                            movementBadgeColors[movementType]
                          )}
                        >
                          {movementLabels[movementType]}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {movementType === 'transfer' ? (
                          <span className="text-muted-foreground text-sm">—</span>
                        ) : (
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "font-normal",
                              categoryBadgeColors[transaction.category]
                            )}
                          >
                            {categoryLabels[transaction.category]}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        <div className="text-sm">
                          <div>{transaction.bank}</div>
                          <div className="text-xs opacity-70">{transaction.account}</div>
                        </div>
                      </TableCell>
                      <TableCell className={cn(
                        "text-right font-semibold tabular-nums",
                        movementType === 'income' ? "text-success"
                          : movementType === 'investment' ? "text-blue-500"
                          : movementType === 'transfer' ? "text-muted-foreground"
                          : "text-destructive"
                      )}>
                        {movementType === 'income' ? '+' : '-'}
                        {formatAmount(Math.abs(transaction.amount))}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          Mostrando {filteredTransactions.length} de {transactions.length} transacciones
        </p>
      </CardContent>
    </Card>
  );
}
