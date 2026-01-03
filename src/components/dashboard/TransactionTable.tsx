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

// Categories available for each movement type
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

export function TransactionTable({ transactions }: TransactionTableProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [movementFilter, setMovementFilter] = useState<string>("all");
  const { t, formatCurrency, formatDate, language } = useLocalization();

  // Category labels using translations
  const getCategoryLabel = (category: Category): string => {
    const categoryMap: Record<Category, string> = {
      food: t('category.food'),
      transport: t('category.transport'),
      housing: t('category.housing'),
      subscriptions: t('category.subscriptions'),
      leisure: t('category.leisure'),
      health: t('category.health'),
      education: t('category.education'),
      travel: t('category.travel'),
      other: t('category.other'),
      income: t('category.income'),
      transfer: t('category.transfer'),
      investment: t('category.investment'),
    };
    return categoryMap[category] || category;
  };

  // Movement labels using translations
  const getMovementLabel = (movement: MovementType): string => {
    const movementMap: Record<MovementType, string> = {
      income: t('transactions.income'),
      expense: t('transactions.expense'),
      transfer: t('transactions.transfer'),
      investment: t('transactions.investment'),
    };
    return movementMap[movement] || movement;
  };

  // Get available categories based on selected movement filter
  const availableCategories = movementFilter === "all" 
    ? Object.keys(categoryBadgeColors) as Category[]
    : categoriesByMovement[movementFilter as MovementType] || [];

  // Reset category filter when movement filter changes and category is no longer available
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
    return date.toLocaleDateString(language === 'en' ? 'en-US' : language === 'pt' ? 'pt-BR' : language === 'fr' ? 'fr-FR' : language === 'it' ? 'it-IT' : language === 'de' ? 'de-DE' : 'es-ES', { day: '2-digit', month: 'short' });
  };

  const formatMonth = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === 'en' ? 'en-US' : language === 'pt' ? 'pt-BR' : language === 'fr' ? 'fr-FR' : language === 'it' ? 'it-IT' : language === 'de' ? 'de-DE' : 'es-ES', { month: 'short', year: '2-digit' });
  };

  return (
    <Card className="animate-slide-up" style={{ animationDelay: '400ms' }}>
      <CardHeader>
        <CardTitle className="text-lg">{t('transactions.title')}</CardTitle>
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">{t('transactions.movements')}</span>
            <Select value={movementFilter} onValueChange={handleMovementChange}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder={t('transactions.all')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('transactions.all')}</SelectItem>
                <SelectItem value="income">{t('transactions.income')}</SelectItem>
                <SelectItem value="expense">{t('transactions.expense')}</SelectItem>
                <SelectItem value="transfer">{t('transactions.transfer')}</SelectItem>
                <SelectItem value="investment">{t('transactions.investment')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">{t('transactions.categories')}</span>
            <Select 
              value={categoryFilter} 
              onValueChange={setCategoryFilter}
              disabled={movementFilter === 'transfer' || availableCategories.length === 0}
            >
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder={t('transactions.all_f')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('transactions.all_f')}</SelectItem>
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
              placeholder={t('transactions.search')}
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
                <TableHead className="w-[80px]">{t('transactions.month')}</TableHead>
                <TableHead className="w-[90px]">{t('transactions.date')}</TableHead>
                <TableHead>{t('transactions.description')}</TableHead>
                <TableHead className="hidden lg:table-cell">{t('transactions.movement')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('transactions.category')}</TableHead>
                <TableHead className="hidden sm:table-cell">{t('transactions.account')}</TableHead>
                <TableHead className="text-right">{t('transactions.amount')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {t('transactions.no_results')}
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
                          className={cn(
                            "font-normal",
                            movementBadgeColors[movementType]
                          )}
                        >
                          {getMovementLabel(movementType)}
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
          {t('transactions.showing')} {filteredTransactions.length} {t('transactions.of')} {transactions.length} {t('transactions.title').toLowerCase()}
        </p>
      </CardContent>
    </Card>
  );
}
