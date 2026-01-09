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
import { getCategoryLabel, getMovementLabel } from "@/lib/categoryTranslations";
import { cn } from "@/lib/utils";

export type MovementType = "INCOME" | "EXPENSE" | "TRANSFER";

export interface PreviewTransaction {
  tempId: string;
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense" | "transfer"; // Legacy
  movement: MovementType;
  category: string;
  category_id?: string | null;
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
    investmentsDetected?: number;
  };
  uploadId: string;
  fileName: string;
}

interface TransactionPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previewData: PreviewData | null;
  onConfirm: () => Promise<void>;
  onUpdateTransaction: (tempId: string, updates: { movement?: MovementType; category?: string }) => void;
  isConfirming: boolean;
}

export function TransactionPreviewModal({
  open,
  onOpenChange,
  previewData,
  onConfirm,
  onUpdateTransaction,
  isConfirming,
}: TransactionPreviewModalProps) {
  const { formatCurrency, formatDate, language } = useLocalization();
  const { incomeCategories, expenseCategories, transferCategories } = useCategories("CASHFLOW");

  if (!previewData) return null;

  const { transactions, stats, fileName } = previewData;

  const summary = useMemo(() => {
    const income = transactions
      .filter((t) => t.movement === "INCOME")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const expenses = transactions
      .filter((t) => t.movement === "EXPENSE")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const transfers = transactions
      .filter((t) => t.movement === "TRANSFER")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const edited = transactions.filter((t) => t.isEdited).length;
    return { income, expenses, transfers, edited };
  }, [transactions]);

  const getMovementIcon = (movement: MovementType) => {
    switch (movement) {
      case "INCOME":
        return <ArrowDownCircle className="w-4 h-4 text-success" />;
      case "EXPENSE":
        return <ArrowUpCircle className="w-4 h-4 text-destructive" />;
      case "TRANSFER":
        return <ArrowRightLeft className="w-4 h-4 text-warning" />;
    }
  };

  const getCategoriesForMovement = (movement: MovementType) => {
    switch (movement) {
      case "INCOME":
        return incomeCategories;
      case "EXPENSE":
        return expenseCategories;
      case "TRANSFER":
        return transferCategories;
      default:
        return [];
    }
  };

  const translateCategory = (slug: string) => {
    return getCategoryLabel(slug, language);
  };

  const translateMovement = (movement: MovementType) => {
    return getMovementLabel(movement, language);
  };

  const handleMovementChange = (tempId: string, newMovement: MovementType) => {
    // When movement changes, reset category to default for that movement
    const defaultCategory = newMovement === "INCOME" ? "other_income" 
      : newMovement === "EXPENSE" ? "other_expense" 
      : "own_transfer";
    
    onUpdateTransaction(tempId, { movement: newMovement, category: defaultCategory });
  };

  const handleCategoryChange = (tempId: string, newCategory: string) => {
    onUpdateTransaction(tempId, { category: newCategory });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-success" />
            Vista previa de importación
          </DialogTitle>
          <DialogDescription>
            {fileName} - {transactions.length} transacciones listas para importar
          </DialogDescription>
        </DialogHeader>

        {/* Stats Summary */}
        <div className="flex gap-3 flex-wrap text-sm">
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
              <span className="text-warning font-medium">{formatCurrency(summary.transfers)}</span>
            </div>
          )}
          {stats.duplicatesIgnored > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
              <AlertTriangle className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {stats.duplicatesIgnored} duplicados ignorados
              </span>
            </div>
          )}
          {summary.edited > 0 && (
            <Badge variant="secondary">
              {summary.edited} editadas
            </Badge>
          )}
        </div>

        {/* Transaction Table */}
        <ScrollArea className="flex-1 min-h-0 border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[90px]">Fecha</TableHead>
                <TableHead className="min-w-[180px]">Descripción</TableHead>
                <TableHead className="w-[130px]">Movimiento</TableHead>
                <TableHead className="w-[180px]">Categoría</TableHead>
                <TableHead className="text-right w-[110px]">Importe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => {
                const availableCategories = getCategoriesForMovement(tx.movement);
                
                return (
                  <TableRow 
                    key={tx.tempId}
                    className={cn(tx.isEdited && "bg-warning/5")}
                  >
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(new Date(tx.date))}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate max-w-[200px]">
                          {tx.description}
                        </span>
                        {tx.isEdited && (
                          <Badge variant="outline" className="text-xs shrink-0">
                            editada
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={tx.movement}
                        onValueChange={(value) => handleMovementChange(tx.tempId, value as MovementType)}
                      >
                        <SelectTrigger className="h-8 text-xs w-full">
                          <div className="flex items-center gap-1.5">
                            {getMovementIcon(tx.movement)}
                            <SelectValue>
                              {translateMovement(tx.movement)}
                            </SelectValue>
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INCOME">
                            <div className="flex items-center gap-2">
                              <ArrowDownCircle className="w-4 h-4 text-success" />
                              {translateMovement("INCOME")}
                            </div>
                          </SelectItem>
                          <SelectItem value="EXPENSE">
                            <div className="flex items-center gap-2">
                              <ArrowUpCircle className="w-4 h-4 text-destructive" />
                              {translateMovement("EXPENSE")}
                            </div>
                          </SelectItem>
                          <SelectItem value="TRANSFER">
                            <div className="flex items-center gap-2">
                              <ArrowRightLeft className="w-4 h-4 text-warning" />
                              {translateMovement("TRANSFER")}
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={tx.category}
                        onValueChange={(value) => handleCategoryChange(tx.tempId, value)}
                      >
                        <SelectTrigger className="h-8 text-xs w-full">
                          <SelectValue>
                            {translateCategory(tx.category)}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {availableCategories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.slug || ""}>
                              {translateCategory(cat.slug || "")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className={cn(
                      "text-right font-medium tabular-nums",
                      tx.movement === "INCOME" ? "text-success" : 
                      tx.movement === "EXPENSE" ? "text-destructive" : 
                      "text-warning"
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
            Cancelar
          </Button>
          <Button 
            variant="gradient" 
            onClick={onConfirm}
            disabled={isConfirming || transactions.length === 0}
          >
            {isConfirming ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Confirmar ({transactions.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
