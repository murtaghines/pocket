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
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  CheckCircle2, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  ArrowRightLeft, 
  Loader2,
  FileCheck2,
  Lock
} from "lucide-react";
import { useLocalization } from "@/hooks/useLocalization";
import { useCategories } from "@/hooks/useCategories";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

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
}

interface MonthReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monthKey: string; // YYYY-MM
  monthLabel: string;
  isLocked?: boolean;
}

export function MonthReviewModal({
  open,
  onOpenChange,
  monthKey,
  monthLabel,
  isLocked = false,
}: MonthReviewModalProps) {
  const { t, formatCurrency, formatDate } = useLocalization();
  const { getCategoriesForType, categories } = useCategories("CASHFLOW");
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editedCategories, setEditedCategories] = useState<Record<string, string>>({});

  // Fetch transactions for this month
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["month-transactions", monthKey, user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // Calculate start and end dates for the month
      const [year, month] = monthKey.split("-").map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0); // Last day of month
      
      const { data, error } = await supabase
        .from("transactions")
        .select("id, date, description, description_norm, amount, type, movement, category, category_id, bank")
        .eq("user_id", user.id)
        .eq("domain", "CASHFLOW")
        .gte("date", startDate.toISOString().split("T")[0])
        .lte("date", endDate.toISOString().split("T")[0])
        .order("date", { ascending: false });

      if (error) throw error;
      return data as MonthTransaction[];
    },
    enabled: open && !!user,
  });

  // Update category mutation
  const updateCategory = useMutation({
    mutationFn: async ({ transactionId, categorySlug, categoryId }: { 
      transactionId: string; 
      categorySlug: string;
      categoryId: string | null;
    }) => {
      const { error } = await supabase
        .from("transactions")
        .update({ 
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
      console.error("Error updating category:", error);
      toast({
        title: t("common.error"),
        description: "No se pudo actualizar la categoría",
        variant: "destructive",
      });
    },
  });

  // Handle category change
  const handleCategoryChange = (transactionId: string, newCategorySlug: string) => {
    // Find the category to get its ID
    const category = categories.find(c => c.slug === newCategorySlug);
    
    setEditedCategories(prev => ({
      ...prev,
      [transactionId]: newCategorySlug,
    }));

    updateCategory.mutate({
      transactionId,
      categorySlug: newCategorySlug,
      categoryId: category?.id || null,
    });
  };

  // Get the type for display and category filtering
  const getTransactionType = (tx: MonthTransaction): "income" | "expense" | "transfer" => {
    if (tx.movement === "INCOME") return "income";
    if (tx.movement === "EXPENSE") return "expense";
    if (tx.movement === "TRANSFER") return "transfer";
    return tx.type as "income" | "expense" | "transfer";
  };

  const summary = useMemo(() => {
    const income = transactions
      .filter((t) => getTransactionType(t) === "income")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const expenses = transactions
      .filter((t) => getTransactionType(t) === "expense")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const transfers = transactions
      .filter((t) => getTransactionType(t) === "transfer").length;
    const edited = Object.keys(editedCategories).length;
    return { income, expenses, transfers, edited };
  }, [transactions, editedCategories]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "income":
        return <ArrowDownCircle className="w-4 h-4 text-success" />;
      case "expense":
        return <ArrowUpCircle className="w-4 h-4 text-destructive" />;
      case "transfer":
        return <ArrowRightLeft className="w-4 h-4 text-warning" />;
      default:
        return null;
    }
  };

  const translateCategory = (slug: string) => {
    const key = `category.${slug}`;
    const translated = t(key);
    return translated !== key ? translated : slug;
  };

  const handleConfirm = () => {
    toast({
      title: "✓ Mes revisado",
      description: `${transactions.length} transacciones confirmadas para ${monthLabel}`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-primary" />
            {t("preview.title")} - {monthLabel}
          </DialogTitle>
          <DialogDescription>
            {transactions.length} transacciones en este mes
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileCheck2 className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No hay transacciones para este mes</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Sube archivos y procésalos primero
            </p>
          </div>
        ) : (
          <>
            {/* Locked Banner */}
            {isLocked && (
              <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg border">
                <Lock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Este mes está cerrado. No puedes editar las categorías.
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
                  {summary.edited} {t("preview.edited")}
                </Badge>
              )}
            </div>

            {/* Transaction Table */}
            <ScrollArea className="flex-1 min-h-0 border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">{t("transactions.date")}</TableHead>
                    <TableHead>{t("transactions.description")}</TableHead>
                    <TableHead className="w-[80px]">{t("transactions.type")}</TableHead>
                    <TableHead className="w-[180px]">{t("transactions.category")}</TableHead>
                    <TableHead className="text-right w-[120px]">{t("transactions.amount")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => {
                    const txType = getTransactionType(tx);
                    const availableCategories = getCategoriesForType(txType);
                    const currentCategory = editedCategories[tx.id] || tx.category;
                    const isEdited = !!editedCategories[tx.id];
                    
                    return (
                      <TableRow 
                        key={tx.id}
                        className={cn(isEdited && "bg-primary/5")}
                      >
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(new Date(tx.date))}
                        </TableCell>
                        <TableCell className="font-medium truncate max-w-[200px]">
                          {tx.description_norm || tx.description}
                          {isEdited && (
                            <Badge variant="outline" className="ml-2 text-xs border-primary/30 text-primary">
                              {t("preview.edited")}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {getTypeIcon(txType)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {isLocked ? (
                            <Badge variant="outline" className="text-xs">
                              {translateCategory(currentCategory)}
                            </Badge>
                          ) : (
                            <Select
                              value={currentCategory}
                              onValueChange={(value) => handleCategoryChange(tx.id, value)}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue>
                                  {translateCategory(currentCategory)}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {availableCategories.length > 0 ? (
                                  availableCategories.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.slug || cat.name.toLowerCase()}>
                                      <div className="flex items-center gap-2">
                                        {cat.color && (
                                          <span 
                                            className="w-2 h-2 rounded-full" 
                                            style={{ backgroundColor: cat.color }}
                                          />
                                        )}
                                        {translateCategory(cat.slug || cat.name.toLowerCase())}
                                      </div>
                                    </SelectItem>
                                  ))
                                ) : (
                                  <>
                                    <SelectItem value="other">{translateCategory("other")}</SelectItem>
                                  </>
                                )}
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-medium",
                          txType === "income" ? "text-success" : txType === "expense" ? "text-destructive" : "text-warning"
                        )}>
                          {formatCurrency(tx.amount)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            {isLocked ? "Cerrar" : t("common.cancel")}
          </Button>
          {!isLocked && (
            <Button 
              variant="gradient" 
              onClick={handleConfirm}
              disabled={transactions.length === 0}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Listo ({transactions.length})
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
