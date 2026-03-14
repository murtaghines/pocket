import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Transaction, Category } from "@/lib/mockData";
import { Search, ArrowUpRight, ArrowDownRight, Minus, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocalization } from "@/hooks/useLocalization";
import { useCategoryTranslations } from "@/hooks/useCategoryTranslations";
import { CategoryIcon } from "@/components/ui/category-icon";
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, TRANSFER_CATEGORIES } from "@/lib/categoryTranslations";

interface TransactionTableProps {
  transactions: Transaction[];
}

type MovementType = 'income' | 'expense' | 'transfer' | 'investment';

const movementBadgeColors: Record<MovementType, string> = {
  income: 'bg-success/10 text-success border-0',
  expense: 'bg-destructive/10 text-destructive border-0',
  transfer: 'bg-muted text-muted-foreground border-0',
  investment: 'bg-purple-100 text-purple-600 border-0',
};

const categoriesByMovement: Record<MovementType, string[]> = {
  income: INCOME_CATEGORIES,
  expense: EXPENSE_CATEGORIES,
  transfer: TRANSFER_CATEGORIES,
  investment: ['investment', 'to_investment'],
};

const getMovementType = (transaction: Transaction): MovementType => {
  if (transaction.movement === 'INCOME' || transaction.type === 'income') return 'income';
  if (transaction.movement === 'TRANSFER' || transaction.type === 'transfer') return 'transfer';
  if (transaction.category === 'investment' || transaction.category === 'to_investment') return 'investment';
  return 'expense';
};

export function TransactionTable({ transactions }: TransactionTableProps) {
  const { t } = useTranslation('dashboard');
  const { t: tc } = useTranslation('common');
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [movementFilter, setMovementFilter] = useState<string>("all");
  const { formatCurrency } = useLocalization();
  const { getCategoryLabel, getCategoryIcon, getCategoryColor } = useCategoryTranslations();

  const movementLabels: Record<MovementType, string> = {
    income: t('stats.income'),
    expense: t('stats.expenses'),
    transfer: t('transactions.transfer', { defaultValue: 'Transfer' }),
    investment: t('investments.title'),
  };

  const allCategories = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES, ...TRANSFER_CATEGORIES];
  
  const availableCategories = movementFilter === "all" 
    ? allCategories
    : categoriesByMovement[movementFilter as MovementType] || [];

  const handleMovementChange = (value: string) => {
    setMovementFilter(value);
    if (value !== "all") {
      const newCategories = categoriesByMovement[value as MovementType] || [];
      if (!newCategories.includes(categoryFilter)) {
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
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  const formatMonth = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return { month, year };
  };

  return (
    <Card variant="bento" className="animate-slide-up" style={{ animationDelay: '400ms' }}>
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <List className="w-4 h-4 text-primary" />
          </div>
          {t('transactions.title')}
        </CardTitle>
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">{t('transactions.movement', { defaultValue: 'Movements' })}</span>
            <Select value={movementFilter} onValueChange={handleMovementChange}>
              <SelectTrigger className="w-full sm:w-[160px] rounded-xl">
                <SelectValue placeholder={tc('viewAll')} />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">{tc('viewAll')}</SelectItem>
                <SelectItem value="income">{t('stats.income')}</SelectItem>
                <SelectItem value="expense">{t('stats.expenses')}</SelectItem>
                <SelectItem value="transfer">{t('transactions.transfer', { defaultValue: 'Transfer' })}</SelectItem>
                <SelectItem value="investment">{t('investments.title')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">{t('transactions.category')}</span>
            <Select 
              value={categoryFilter} 
              onValueChange={setCategoryFilter}
              disabled={availableCategories.length === 0}
            >
              <SelectTrigger className="w-full sm:w-[160px] rounded-xl">
                <SelectValue placeholder={tc('viewAll')} />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">{tc('viewAll')}</SelectItem>
                {availableCategories.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    <div className="flex items-center gap-2">
                      <CategoryIcon 
                        iconName={getCategoryIcon(cat)} 
                        colorVar={getCategoryColor(cat)} 
                        size="sm"
                        showBackground={false}
                      />
                      {getCategoryLabel(cat)}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="relative flex-1 flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">&nbsp;</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={tc('search')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 rounded-xl"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-2xl border border-border/50 overflow-hidden">
          <Table className="table-auto">
             <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="hidden sm:table-cell whitespace-nowrap">{t('transactions.month', { defaultValue: 'Month' })}</TableHead>
                <TableHead className="hidden sm:table-cell whitespace-nowrap">{t('transactions.date')}</TableHead>
                <TableHead>{t('transactions.description')}</TableHead>
                <TableHead className="hidden md:table-cell whitespace-nowrap">{t('transactions.movement', { defaultValue: 'Movement' })}</TableHead>
                <TableHead className="hidden md:table-cell whitespace-nowrap">{t('transactions.category')}</TableHead>
                <TableHead className="hidden lg:table-cell whitespace-nowrap">{t('transactions.bank', { defaultValue: 'Account' })}</TableHead>
                <TableHead className="text-right whitespace-nowrap">{t('transactions.amount')}</TableHead>
                <TableHead className="text-right hidden lg:table-cell whitespace-nowrap">{t('transactions.balance', { defaultValue: 'Balance' })}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
               {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {t('transactions.noTransactions')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((transaction) => {
                  const movementType = getMovementType(transaction);
                  return (
                    <TableRow 
                      key={transaction.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">
                        <div className="leading-tight">
                          <div className="font-medium">{formatMonth(transaction.date).month}</div>
                          <div className="opacity-70">{formatMonth(transaction.date).year}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-muted-foreground hidden sm:table-cell">
                        {formatTransactionDate(transaction.date)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "p-1.5 rounded-lg flex-shrink-0",
                            movementType === 'income' ? "bg-success/10"
                              : movementType === 'investment' ? "bg-purple-100"
                              : movementType === 'transfer' ? "bg-muted"
                              : "bg-destructive/10"
                          )}>
                            {movementType === 'income' ? (
                              <ArrowDownRight className="w-3 h-3 text-success" />
                            ) : movementType === 'investment' ? (
                              <Minus className="w-3 h-3 text-purple-600" />
                            ) : movementType === 'transfer' ? (
                              <Minus className="w-3 h-3 text-muted-foreground" />
                            ) : (
                              <ArrowUpRight className="w-3 h-3 text-destructive" />
                            )}
                          </div>
                          <span className="truncate">{transaction.description.replace(/^value\s+date:\s*\d{1,2}\s+\w{3,4}\s+\d{4}\s*/i, '').trim()}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge 
                          className={cn("font-normal rounded-full", movementBadgeColors[movementType])}
                        >
                          {movementLabels[movementType]}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <CategoryIcon 
                            iconName={getCategoryIcon(transaction.category)} 
                            colorVar={getCategoryColor(transaction.category)} 
                            size="sm"
                          />
                          <span className="text-sm">{getCategoryLabel(transaction.category)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        <div className="text-sm">
                          <div>{transaction.bank}</div>
                          <div className="text-xs opacity-70">{transaction.account}</div>
                        </div>
                      </TableCell>
                      <TableCell className={cn(
                        "text-right font-semibold tabular-nums",
                        movementType === 'income' ? "text-success"
                          : movementType === 'investment' ? "text-purple-600"
                          : movementType === 'transfer' ? "text-muted-foreground"
                          : "text-destructive"
                      )}>
                       {transaction.amount >= 0 ? '+' : ''}
                        {formatCurrency(transaction.amount)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground hidden lg:table-cell">
                        {transaction.runningBalance != null
                          ? formatCurrency(transaction.runningBalance)
                          : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          {filteredTransactions.length} / {transactions.length}
        </p>
      </CardContent>
    </Card>
  );
}
