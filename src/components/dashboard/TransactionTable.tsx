import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Transaction, Category } from "@/lib/mockData";
import { Search, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocalization } from "@/hooks/useLocalization";
import { getCategoryLabel } from "@/lib/categoryTranslations";

interface TransactionTableProps {
  transactions: Transaction[];
}

const categoryBadgeColors: Partial<Record<Category, string>> = {
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
  salary: 'bg-success/20 text-success border-success/30',
  refunds: 'bg-success/20 text-success border-success/30',
  sales: 'bg-success/20 text-success border-success/30',
  transfers_in: 'bg-success/20 text-success border-success/30',
  other_income: 'bg-success/20 text-success border-success/30',
  groceries: 'bg-category-food/20 text-category-food border-category-food/30',
  restaurants: 'bg-category-leisure/20 text-category-leisure border-category-leisure/30',
  shopping: 'bg-category-subscriptions/20 text-category-subscriptions border-category-subscriptions/30',
  own_transfer: 'bg-muted text-muted-foreground border-muted-foreground/30',
  to_investment: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
};

type MovementType = 'income' | 'expense' | 'transfer' | 'investment';

const categoriesByMovement: Record<MovementType, Category[]> = {
  income: ['income'],
  expense: ['housing', 'health', 'transport', 'subscriptions', 'food', 'other', 'leisure', 'travel'],
  transfer: [],
  investment: ['investment'],
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

const movementLabels: Record<MovementType, string> = {
  income: 'Income',
  expense: 'Expense',
  transfer: 'Transfer',
  investment: 'Investment',
};

export function TransactionTable({ transactions }: TransactionTableProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [movementFilter, setMovementFilter] = useState<string>("all");
  const { formatCurrency } = useLocalization();

  const availableCategories = movementFilter === "all" 
    ? Object.keys(categoryBadgeColors) as Category[]
    : categoriesByMovement[movementFilter as MovementType] || [];

  const handleMovementChange = (value: string) => {
    setMovementFilter(value);
    if (value !== "all") {
      const newCategories = categoriesByMovement[value as MovementType] || [];
      if (!newCategories.includes(categoryFilter as Category)) {
        setCategoryFilter("all");
      }
    }
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || t.category === categoryFilter;
    const movementType = getMovementType(t);
    const matchesMovement = movementFilter === "all" || movementType === movementFilter;
    return matchesSearch && matchesCategory && matchesMovement;
  });

  const formatTransactionDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
  };

  const formatMonth = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  return (
    <Card className="animate-slide-up" style={{ animationDelay: '400ms' }}>
      <CardHeader>
        <CardTitle className="text-lg">Transactions</CardTitle>
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Movements</span>
            <Select value={movementFilter} onValueChange={handleMovementChange}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
                <SelectItem value="investment">Investment</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Categories</span>
            <Select 
              value={categoryFilter} 
              onValueChange={setCategoryFilter}
              disabled={movementFilter === 'transfer' || availableCategories.length === 0}
            >
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {availableCategories.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {getCategoryLabel(cat)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 mt-5"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[80px]">Month</TableHead>
                <TableHead className="w-[90px]">Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="hidden lg:table-cell">Movement</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead className="hidden sm:table-cell">Account</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No transactions found
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
                        {formatTransactionDate(transaction.date)}
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
                          className={cn("font-normal", movementBadgeColors[movementType])}
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
                            className={cn("font-normal", categoryBadgeColors[transaction.category])}
                          >
                            {getCategoryLabel(transaction.category)}
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
                        {formatCurrency(Math.abs(transaction.amount))}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          Showing {filteredTransactions.length} of {transactions.length} transactions
        </p>
      </CardContent>
    </Card>
  );
}
