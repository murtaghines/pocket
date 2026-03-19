import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Transaction, Category } from "@/lib/mockData";
import { Search, Plus, Minus, List, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocalization } from "@/hooks/useLocalization";
import { useCategoryTranslations } from "@/hooks/useCategoryTranslations";
import { CategoryIcon } from "@/components/ui/category-icon";
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, TRANSFER_CATEGORIES } from "@/lib/categoryTranslations";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedMovements, setSelectedMovements] = useState<string[]>([]);
  const { formatCurrency } = useLocalization();
  const { getCategoryLabel, getCategoryIcon, getCategoryColor } = useCategoryTranslations();

  const movementOptions: { value: MovementType; label: string }[] = [
    { value: 'income', label: t('stats.income') },
    { value: 'expense', label: t('stats.expenses') },
    { value: 'transfer', label: t('transactions.transfer', { defaultValue: 'Transfer' }) },
    { value: 'investment', label: t('investments.title') },
  ];

  const movementLabels: Record<MovementType, string> = {
    income: t('stats.income'),
    expense: t('stats.expenses'),
    transfer: t('transactions.transfer', { defaultValue: 'Transfer' }),
    investment: t('investments.title'),
  };

  const allCategories = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES, ...TRANSFER_CATEGORIES];
  
  const availableCategories = selectedMovements.length === 0 || selectedMovements.length === movementOptions.length
    ? allCategories
    : selectedMovements.flatMap(m => categoriesByMovement[m as MovementType] || []);

  const allMovementsSelected = selectedMovements.length === movementOptions.length;
  const allCategoriesSelected = selectedCategories.length === availableCategories.length;

  const toggleMovement = (value: string) => {
    setSelectedMovements(prev => {
      const next = prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value];
      // Reset categories that are no longer available
      if (next.length > 0 && next.length < movementOptions.length) {
        const newAvailable = next.flatMap(m => categoriesByMovement[m as MovementType] || []);
        setSelectedCategories(prev => prev.filter(c => newAvailable.includes(c)));
      }
      return next;
    });
  };

  const toggleCategory = (value: string) => {
    setSelectedCategories(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const toggleAllMovements = () => {
    if (allMovementsSelected) {
      setSelectedMovements([]);
    } else {
      setSelectedMovements(movementOptions.map(o => o.value));
    }
  };

  const toggleAllCategories = () => {
    if (allCategoriesSelected) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories([...availableCategories]);
    }
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategories.length === 0 || allCategoriesSelected || selectedCategories.includes(t.category);
    const movementType = getMovementType(t);
    const matchesMovement = selectedMovements.length === 0 || allMovementsSelected || selectedMovements.includes(movementType);
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

  const movementFilterLabel = selectedMovements.length === 0 || allMovementsSelected
    ? tc('viewAll')
    : selectedMovements.map(m => movementLabels[m as MovementType]).join(', ');

  const categoryFilterLabel = selectedCategories.length === 0 || allCategoriesSelected
    ? tc('viewAll')
    : selectedCategories.map(c => getCategoryLabel(c)).join(', ');

  return (
    <Card variant="bento" className="animate-slide-up border-0 shadow-none bg-transparent" style={{ animationDelay: '400ms' }}>
      <CardHeader className="pb-2 pt-0 px-0">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <List className="w-4 h-4 text-primary" />
          </div>
          {t('transactions.title')}
        </CardTitle>
        <div className="flex flex-col md:flex-row md:items-end gap-2 mt-2">
            {/* Movement multi-select */}
            <div className="flex flex-col gap-1 flex-1">
              <span className="text-xs font-medium text-muted-foreground">{t('transactions.movement', { defaultValue: 'Movement' })}</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between rounded-xl h-9 text-sm font-normal">
                    <span className="truncate">{movementFilterLabel}</span>
                    <ChevronDown className="w-3.5 h-3.5 opacity-50 flex-shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2 rounded-xl" align="start">
                  <div className="flex flex-col gap-0.5">
                    <label className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted cursor-pointer">
                      <Checkbox
                        checked={allMovementsSelected || selectedMovements.length === 0}
                        onCheckedChange={toggleAllMovements}
                      />
                      <span className="text-sm">{tc('viewAll')}</span>
                    </label>
                    {movementOptions.map(opt => (
                      <label key={opt.value} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted cursor-pointer">
                        <Checkbox
                          checked={selectedMovements.includes(opt.value)}
                          onCheckedChange={() => toggleMovement(opt.value)}
                        />
                        <span className="text-sm">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Category multi-select */}
            <div className="flex flex-col gap-1 flex-1">
              <span className="text-xs font-medium text-muted-foreground">{t('transactions.category')}</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between rounded-xl h-9 text-sm font-normal">
                    <span className="truncate">{categoryFilterLabel}</span>
                    <ChevronDown className="w-3.5 h-3.5 opacity-50 flex-shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2 rounded-xl max-h-64 overflow-y-auto" align="start">
                  <div className="flex flex-col gap-0.5">
                    <label className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted cursor-pointer">
                      <Checkbox
                        checked={allCategoriesSelected || selectedCategories.length === 0}
                        onCheckedChange={toggleAllCategories}
                      />
                      <span className="text-sm">{tc('viewAll')}</span>
                    </label>
                    {availableCategories.map(cat => (
                      <label key={cat} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted cursor-pointer">
                        <Checkbox
                          checked={selectedCategories.includes(cat)}
                          onCheckedChange={() => toggleCategory(cat)}
                        />
                        <CategoryIcon 
                          iconName={getCategoryIcon(cat)} 
                          colorVar={getCategoryColor(cat)} 
                          size="sm"
                          showBackground={false}
                        />
                        <span className="text-sm">{getCategoryLabel(cat)}</span>
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={tc('search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-xl h-9"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="rounded-2xl border border-border/50 overflow-hidden">
          <Table className="table-fixed w-full">
             <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="hidden sm:table-cell whitespace-nowrap w-[50px]">{t('transactions.month', { defaultValue: 'Month' })}</TableHead>
                <TableHead className="hidden sm:table-cell whitespace-nowrap w-[82px]">{t('transactions.date')}</TableHead>
                <TableHead className="hidden md:table-cell whitespace-nowrap w-[110px]">{t('transactions.movement', { defaultValue: 'Movement' })}</TableHead>
                <TableHead>{t('transactions.description')}</TableHead>
                <TableHead className="hidden md:table-cell whitespace-nowrap w-[170px]">{t('transactions.category')}</TableHead>
                <TableHead className="hidden lg:table-cell whitespace-nowrap w-[120px]">Account</TableHead>
                <TableHead className="text-right whitespace-nowrap w-[95px]">{t('transactions.amount')}</TableHead>
                <TableHead className="text-right hidden lg:table-cell whitespace-nowrap w-[80px]">{t('transactions.balance', { defaultValue: 'Balance' })}</TableHead>
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
                      <TableCell className="text-xs text-muted-foreground hidden sm:table-cell whitespace-nowrap">
                        <div className="leading-tight">
                          <div className="font-medium">{formatMonth(transaction.date).month}</div>
                          <div className="opacity-70">{formatMonth(transaction.date).year}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-muted-foreground hidden sm:table-cell whitespace-nowrap">
                        {formatTransactionDate(transaction.date)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge 
                          className={cn("font-normal rounded-full gap-1", movementBadgeColors[movementType])}
                        >
                          {movementType === 'income' ? <Plus className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                          {movementLabels[movementType]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="break-words line-clamp-2">{transaction.description.replace(/^value\s+date:\s*\d{1,2}\s+\w{3,4}\s+\d{4}\s*/i, '').trim()}</span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-2 min-w-0">
                          <CategoryIcon 
                            iconName={getCategoryIcon(transaction.category)} 
                            colorVar={getCategoryColor(transaction.category)} 
                            size="sm"
                          />
                          <span
                            className="text-sm text-muted-foreground truncate"
                            title={getCategoryLabel(transaction.category)}
                          >
                            {getCategoryLabel(transaction.category)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-sm text-muted-foreground truncate block">{transaction.account}</span>
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
        <p className="text-sm text-muted-foreground mt-3">
          {filteredTransactions.length} / {transactions.length}
        </p>
      </CardContent>
    </Card>
  );
}