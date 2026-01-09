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
import { CheckCircle2, AlertTriangle, ArrowDownCircle, ArrowUpCircle, ArrowRightLeft, Loader2 } from "lucide-react";
import { useLocalization } from "@/hooks/useLocalization";
import { useCategories } from "@/hooks/useCategories";
import { cn } from "@/lib/utils";

export interface PreviewTransaction {
  tempId: string;
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense" | "transfer";
  category: string;
  bank: string | null;
  hash_source: string;
  transaction_hash: string;
  isEdited?: boolean;
}

export interface PreviewData {
  transactions: PreviewTransaction[];
  stats: {
    totalParsed: number;
    duplicatesIgnored: number;
    transfersDetected: number;
  };
  uploadId: string;
  fileName: string;
}

interface TransactionPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previewData: PreviewData | null;
  onConfirm: () => Promise<void>;
  onUpdateCategory: (tempId: string, newCategory: string) => void;
  isConfirming: boolean;
}

export function TransactionPreviewModal({
  open,
  onOpenChange,
  previewData,
  onConfirm,
  onUpdateCategory,
  isConfirming,
}: TransactionPreviewModalProps) {
  const { t, formatCurrency, formatDate } = useLocalization();
  const { getCategoriesForType, categories } = useCategories("CASHFLOW");

  if (!previewData) return null;

  const { transactions, stats, fileName } = previewData;

  const summary = useMemo(() => {
    const income = transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const edited = transactions.filter((t) => t.isEdited).length;
    return { income, expenses, edited };
  }, [transactions]);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-success" />
            {t("preview.title")}
          </DialogTitle>
          <DialogDescription>
            {fileName} - {transactions.length} {t("preview.transactions_ready")}
          </DialogDescription>
        </DialogHeader>

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
          {stats.duplicatesIgnored > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
              <AlertTriangle className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {stats.duplicatesIgnored} {t("preview.duplicates_ignored")}
              </span>
            </div>
          )}
          {summary.edited > 0 && (
            <Badge variant="secondary">
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
                const availableCategories = getCategoriesForType(tx.type);
                
                return (
                  <TableRow 
                    key={tx.tempId}
                    className={cn(tx.isEdited && "bg-warning/5")}
                  >
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(new Date(tx.date))}
                    </TableCell>
                    <TableCell className="font-medium truncate max-w-[200px]">
                      {tx.description}
                      {tx.isEdited && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          {t("preview.edited")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {getTypeIcon(tx.type)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={tx.category}
                        onValueChange={(value) => onUpdateCategory(tx.tempId, value)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue>
                            {translateCategory(tx.category)}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {availableCategories.length > 0 ? (
                            availableCategories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.slug || cat.name.toLowerCase()}>
                                {translateCategory(cat.slug || cat.name.toLowerCase())}
                              </SelectItem>
                            ))
                          ) : (
                            // Fallback to common categories if DB categories not available
                            <>
                              <SelectItem value="food">{translateCategory("food")}</SelectItem>
                              <SelectItem value="transport">{translateCategory("transport")}</SelectItem>
                              <SelectItem value="housing">{translateCategory("housing")}</SelectItem>
                              <SelectItem value="subscriptions">{translateCategory("subscriptions")}</SelectItem>
                              <SelectItem value="leisure">{translateCategory("leisure")}</SelectItem>
                              <SelectItem value="health">{translateCategory("health")}</SelectItem>
                              <SelectItem value="education">{translateCategory("education")}</SelectItem>
                              <SelectItem value="travel">{translateCategory("travel")}</SelectItem>
                              <SelectItem value="income">{translateCategory("income")}</SelectItem>
                              <SelectItem value="transfer">{translateCategory("transfer")}</SelectItem>
                              <SelectItem value="investment">{translateCategory("investment")}</SelectItem>
                              <SelectItem value="other">{translateCategory("other")}</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className={cn(
                      "text-right font-medium",
                      tx.type === "income" ? "text-success" : tx.type === "expense" ? "text-destructive" : "text-warning"
                    )}>
                      {formatCurrency(tx.amount)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isConfirming}
          >
            {t("common.cancel")}
          </Button>
          <Button 
            variant="gradient" 
            onClick={onConfirm}
            disabled={isConfirming || transactions.length === 0}
          >
            {isConfirming ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t("preview.importing")}
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {t("preview.confirm")} ({transactions.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
