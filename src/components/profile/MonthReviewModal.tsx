import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  ArrowRightLeft, 
  Loader2,
  Pencil,
  Lock
} from "lucide-react";
import { useLocalization } from "@/hooks/useLocalization";
import { useCategories } from "@/hooks/useCategories";
import { useAccounts } from "@/hooks/useAccounts";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import { 
  INCOME_CATEGORIES, 
  EXPENSE_CATEGORIES, 
  TRANSFER_CATEGORIES,
  getCategoryLabel,
  getMovementLabel,
  normalizeCategory
} from "@/lib/categoryTranslations";

type MovementType = Database["public"]["Enums"]["movement_type"];

interface MonthTransaction {
  id: string;
  date: string;
  description: string;
  description_norm: string | null;
  amount: number;
  type: string;
  movement: MovementType | null;
  category: string;
  category_id: string | null;
  bank: string | null;
  account_id: string | null;
}

interface MonthReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monthKey: string; // YYYY-MM
  monthLabel: string;
  isLocked?: boolean;
  importId?: string; // Filter to a specific import
}

// Local edits state
interface TransactionEdits {
  movement?: MovementType;
  category?: string;
}

export function MonthReviewModal({
  open,
  onOpenChange,
  monthKey,
  monthLabel,
  isLocked = false,
  importId,
}: MonthReviewModalProps) {
  const { formatCurrency, formatDate } = useLocalization();
  const { categories } = useCategories("CASHFLOW");
  const { accounts } = useAccounts();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const getAccountNameById = (accountId: string | null) => {
    if (!accountId) return null;
    return accounts.find(a => a.id === accountId)?.name || null;
  };
  const [edits, setEdits] = useState<Record<string, TransactionEdits>>({});

  // Fetch transactions for this month (optionally filtered by import)
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["month-transactions", monthKey, user?.id, importId],
    queryFn: async () => {
      if (!user) return [];
      
      // Calculate start and end dates for the month
      const [year, month] = monthKey.split("-").map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0); // Last day of month
      
      let query = supabase
        .from("transactions")
        .select("id, date, description, description_norm, amount, type, movement, category, category_id, bank, account_id")
        .eq("user_id", user.id)
        .eq("domain", "CASHFLOW")
        .gte("date", startDate.toISOString().split("T")[0])
        .lte("date", endDate.toISOString().split("T")[0])
        .order("date", { ascending: false });

      if (importId) {
        query = query.eq("import_id", importId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as MonthTransaction[];
    },
    enabled: open && !!user,
  });

  // Update transaction mutation
  const updateTransaction = useMutation({
    mutationFn: async ({ 
      transactionId, 
      movement,
      categorySlug, 
      categoryId 
    }: { 
      transactionId: string; 
      movement: MovementType;
      categorySlug: string;
      categoryId: string | null;
    }) => {
      const { error } = await supabase
        .from("transactions")
        .update({ 
          movement,
          category: categorySlug,
          category_id: categoryId,
          category_source: "manual"
        })
        .eq("id", transactionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["month-transactions", monthKey] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (error) => {
      console.error("Error updating transaction:", error);
      toast({
        title: "Error",
        description: "Could not update the transaction",
        variant: "destructive",
      });
    },
  });

  // Get categories for a movement type
  const getCategoriesForMovement = (movement: MovementType): string[] => {
    switch (movement) {
      case "INCOME":
        return INCOME_CATEGORIES;
      case "EXPENSE":
        return EXPENSE_CATEGORIES;
      case "TRANSFER":
        return TRANSFER_CATEGORIES;
      default:
        return EXPENSE_CATEGORIES;
    }
  };

  // Get effective movement for a transaction (considering edits)
  const getEffectiveMovement = (tx: MonthTransaction): MovementType => {
    if (edits[tx.id]?.movement) {
      return edits[tx.id].movement!;
    }
    if (tx.movement) {
      return tx.movement;
    }
    // Infer from legacy type
    switch (tx.type?.toLowerCase()) {
      case "income":
        return "INCOME";
      case "transfer":
        return "TRANSFER";
      default:
        return "EXPENSE";
    }
  };

  // Get effective category for a transaction (normalized)
  const getEffectiveCategory = (tx: MonthTransaction): string => {
    if (edits[tx.id]?.category) {
      return edits[tx.id].category!;
    }
    // Normalize the category from DB to handle legacy values
    return normalizeCategory(tx.category || "other_expense");
  };

  // Handle movement change
  const handleMovementChange = (transactionId: string, newMovement: MovementType) => {
    const tx = transactions.find(t => t.id === transactionId);
    if (!tx) return;

    // Get default category for the new movement type
    const categoriesForMovement = getCategoriesForMovement(newMovement);
    const defaultCategory = categoriesForMovement[0];
    
    // Find category ID
    const category = categories.find(c => c.slug === defaultCategory);

    setEdits(prev => ({
      ...prev,
      [transactionId]: {
        ...prev[transactionId],
        movement: newMovement,
        category: defaultCategory,
      },
    }));

    updateTransaction.mutate({
      transactionId,
      movement: newMovement,
      categorySlug: defaultCategory,
      categoryId: category?.id || null,
    });
  };

  // Handle category change
  const handleCategoryChange = (transactionId: string, newCategorySlug: string) => {
    const tx = transactions.find(t => t.id === transactionId);
    if (!tx) return;

    const effectiveMovement = getEffectiveMovement(tx);
    const category = categories.find(c => c.slug === newCategorySlug);

    setEdits(prev => ({
      ...prev,
      [transactionId]: {
        ...prev[transactionId],
        category: newCategorySlug,
      },
    }));

    updateTransaction.mutate({
      transactionId,
      movement: effectiveMovement,
      categorySlug: newCategorySlug,
      categoryId: category?.id || null,
    });
  };

  // Translate movement label
  const translateMovement = (movement: MovementType): string => {
    return getMovementLabel(movement);
  };

  // Translate category label
  const translateCategory = (slug: string): string => {
    return getCategoryLabel(slug);
  };

  const summary = useMemo(() => {
    const income = transactions
      .filter((t) => getEffectiveMovement(t) === "INCOME")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const expenses = transactions
      .filter((t) => getEffectiveMovement(t) === "EXPENSE")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const transfers = transactions
      .filter((t) => getEffectiveMovement(t) === "TRANSFER").length;
    const edited = Object.keys(edits).length;
    return { income, expenses, transfers, edited };
  }, [transactions, edits]);

  const getMovementIcon = (movement: MovementType) => {
    switch (movement) {
      case "INCOME":
        return <ArrowDownCircle className="w-4 h-4 text-success" />;
      case "EXPENSE":
        return <ArrowUpCircle className="w-4 h-4 text-destructive" />;
      case "TRANSFER":
        return <ArrowRightLeft className="w-4 h-4 text-warning" />;
      default:
        return null;
    }
  };

  const getMovementColor = (movement: MovementType): string => {
    switch (movement) {
      case "INCOME":
        return "text-success";
      case "EXPENSE":
        return "text-destructive";
      case "TRANSFER":
        return "text-warning";
      default:
        return "";
    }
  };

  const handleConfirm = () => {
    toast({
      title: "✓ Month reviewed",
      description: `${transactions.length} transactions confirmed for ${monthLabel}`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col dashboard-theme bg-background text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5 text-primary" />
            Edit - {monthLabel}
          </DialogTitle>
          <DialogDescription>
            {transactions.length} transactions in this month
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Pencil className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No transactions for this month</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Upload and process files first
            </p>
          </div>
        ) : (
          <>
            {/* Locked Banner */}
            {isLocked && (
              <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg border">
                <Lock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  This month is closed. You cannot edit categories.
                </span>
              </div>
            )}

            {/* Stats Summary */}
            <div className="flex gap-4 flex-wrap text-sm">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-success/10 rounded-lg">
                <ArrowDownCircle className="w-4 h-4 text-success" />
                <span className="text-success font-medium">{formatCurrency(summary.income)}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-destructive/10 rounded-lg">
                <ArrowUpCircle className="w-4 h-4 text-destructive" />
                <span className="text-destructive font-medium">{formatCurrency(summary.expenses)}</span>
              </div>
              {summary.transfers > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-warning/10 rounded-lg">
                  <ArrowRightLeft className="w-4 h-4 text-warning" />
                  <span className="text-warning font-medium">{summary.transfers}</span>
                </div>
              )}
              {summary.edited > 0 && !isLocked && (
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  {summary.edited} edited
                </Badge>
              )}
            </div>

            {/* Transaction Table */}
            <div className="flex-1 min-h-0 border rounded-lg overflow-auto">
              <Table>
                <TableHeader>
                 <TableRow>
                     <TableHead className="w-[80px] hidden sm:table-cell">Date</TableHead>
                     <TableHead>Description</TableHead>
                     <TableHead className="w-[100px] hidden md:table-cell">Account</TableHead>
                     <TableHead className="w-[120px]">Movement</TableHead>
                     <TableHead className="w-[130px]">Category</TableHead>
                     <TableHead className="text-right w-[90px]">Amount</TableHead>
                   </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => {
                    const effectiveMovement = getEffectiveMovement(tx);
                    const effectiveCategory = getEffectiveCategory(tx);
                    const availableCategories = getCategoriesForMovement(effectiveMovement);
                    const isEdited = !!edits[tx.id];
                    
                    // Strip "value date: DD mon YYYY" prefix from description
                    const cleanDescription = (tx.description_norm || tx.description)
                      .replace(/^value\s+date:\s*\d{1,2}\s+\w{3,4}\s+\d{4}\s*/i, '')
                      .trim();
                    
                    return (
                      <TableRow 
                        key={tx.id}
                        className={cn(isEdited && "bg-primary/5")}
                      >
                        <TableCell className="text-muted-foreground text-xs hidden sm:table-cell">
                          {formatDate(new Date(tx.date))}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex flex-col gap-0.5">
                            <span className="truncate max-w-[250px] text-sm" title={cleanDescription}>
                              {cleanDescription}
                            </span>
                            <span className="text-xs text-muted-foreground sm:hidden">
                              {formatDate(new Date(tx.date))}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {isLocked ? (
                            <div className="flex items-center gap-1.5">
                              {getMovementIcon(effectiveMovement)}
                              <span className={cn("text-xs font-medium", getMovementColor(effectiveMovement))}>
                                {translateMovement(effectiveMovement)}
                              </span>
                            </div>
                          ) : (
                            <Select
                              value={effectiveMovement}
                              onValueChange={(value) => handleMovementChange(tx.id, value as MovementType)}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue>
                                  <div className="flex items-center gap-1.5">
                                    {getMovementIcon(effectiveMovement)}
                                    <span className={getMovementColor(effectiveMovement)}>
                                      {translateMovement(effectiveMovement)}
                                    </span>
                                  </div>
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="INCOME">
                                  <div className="flex items-center gap-2">
                                    <ArrowDownCircle className="w-4 h-4 text-success" />
                                    <span className="text-success">{translateMovement("INCOME")}</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="EXPENSE">
                                  <div className="flex items-center gap-2">
                                    <ArrowUpCircle className="w-4 h-4 text-destructive" />
                                    <span className="text-destructive">{translateMovement("EXPENSE")}</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="TRANSFER">
                                  <div className="flex items-center gap-2">
                                    <ArrowRightLeft className="w-4 h-4 text-warning" />
                                    <span className="text-warning">{translateMovement("TRANSFER")}</span>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell>
                          {isLocked ? (
                            <Badge variant="outline" className="text-xs">
                              {translateCategory(effectiveCategory)}
                            </Badge>
                          ) : (
                            <Select
                              value={effectiveCategory}
                              onValueChange={(value) => handleCategoryChange(tx.id, value)}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue>
                                  {translateCategory(effectiveCategory)}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {availableCategories.map((catSlug) => (
                                  <SelectItem key={catSlug} value={catSlug}>
                                    {translateCategory(catSlug)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-medium tabular-nums text-sm",
                          getMovementColor(effectiveMovement)
                        )}>
                          {formatCurrency(tx.amount)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={transactions.length === 0}>
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
