import { useState, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useLocalization } from "@/hooks/useLocalization";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  FileSpreadsheet,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Trash2,
  Lock,
  Unlock,
  Pencil,
  Eye,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Import, useImports } from "@/hooks/useImports";
import { useAccounts } from "@/hooks/useAccounts";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MonthReviewModal } from "./MonthReviewModal";
import { AccountSelectDialog } from "./AccountSelectDialog";
import { usePeriods, Period } from "@/hooks/usePeriods";
import { useMonthlyFileUpload } from "@/hooks/useMonthlyFileUpload";
import { useTranslation } from "react-i18next";

const DEFAULT_MONTHS_TO_SHOW = 3;
const MONTHS_INCREMENT = 3;

export function UnifiedUploadsTable() {
  const { t } = useTranslation("profile");
  const { formatMonth, formatDate: formatDatePref } = useLocalization();
  const { imports, isLoading, deleteImport, isDeleting } = useImports("CASHFLOW");
  const {
    pendingFilesByMonth,
    addFilesForMonth,
    processFilesForMonth,
    isProcessingMonth,
    getPendingCountForMonth,
  } = useMonthlyFileUpload();
  const {
    periods,
    closePeriod,
    reopenPeriod,
    isClosing,
    isReopening,
    getPeriodByMonthKey,
  } = usePeriods("CASHFLOW");
  const { accounts } = useAccounts();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const cashAccounts = accounts.filter((a) => a.account_role === "CASH");

  const [monthsToShow, setMonthsToShow] = useState(DEFAULT_MONTHS_TO_SHOW);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewImportId, setReviewImportId] = useState<string | undefined>();
  const [reviewMonthKey, setReviewMonthKey] = useState("");
  const [reviewTitle, setReviewTitle] = useState("");
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showReopenDialog, setShowReopenDialog] = useState(false);
  const [dialogPeriod, setDialogPeriod] = useState<Period | undefined>();
  const [dialogMonthLabel, setDialogMonthLabel] = useState("");
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingMonthDate, setPendingMonthDate] = useState<Date>(new Date());
  const [processingMonthKey, setProcessingMonthKey] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // Build month slots
  const monthSlots = useMemo(() => {
    const slots: { key: string; label: string; date: Date }[] = [];
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    for (let i = 0; i < monthsToShow; i++) {
      const d = new Date(lastMonth.getFullYear(), lastMonth.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      slots.push({ key, label: formatMonth(d), date: d });
    }
    return slots;
  }, [monthsToShow, formatMonth]);

  // Group imports by month
  const importsByMonth = useMemo(() => {
    const grouped: Record<string, Import[]> = {};
    imports.forEach((imp) => {
      const key = (imp.target_month || imp.uploaded_at.substring(0, 7)).substring(0, 7);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(imp);
    });
    return grouped;
  }, [imports]);

  // Processing progress
  useEffect(() => {
    const anyProcessing = monthSlots.some((s) => isProcessingMonth(s.key));
    if (anyProcessing) {
      setProgress(0);
      const startTime = Date.now();
      const interval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        setProgress(Math.min(92, 20 * Math.log(1 + elapsed * 0.5)));
      }, 200);
      return () => clearInterval(interval);
    } else if (progress > 0 && progress < 100) {
      setProgress(100);
      setTimeout(() => setProgress(0), 500);
    }
  }, [monthSlots.map((s) => isProcessingMonth(s.key)).join(",")]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "NORMALIZED": return <CheckCircle2 className="w-3.5 h-3.5 text-success" />;
      case "PARSED":
      case "UPLOADED": return <Loader2 className="w-3.5 h-3.5 text-warning animate-spin" />;
      case "FAILED": return <AlertCircle className="w-3.5 h-3.5 text-destructive" />;
      default: return <FileSpreadsheet className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  const getAccountName = (accountId: string | null) => {
    if (!accountId) return "—";
    return accounts.find((a) => a.id === accountId)?.name || "—";
  };

  const handleAccountChange = async (importId: string, newAccountId: string) => {
    await supabase.from("imports").update({ account_id: newAccountId }).eq("id", importId);
    await supabase.from("transactions").update({ account_id: newAccountId }).eq("import_id", importId);
    queryClient.invalidateQueries({ queryKey: ["imports"] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
  };

  const handleFileInput = (monthDate: Date, monthKey: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;
    const period = getPeriodByMonthKey(monthKey, "CASHFLOW");
    if (period?.status === "CLOSED") {
      toast({ title: "Month closed", description: "Reopen this month before uploading files.", variant: "destructive" });
      e.target.value = "";
      return;
    }
    const validFiles = Array.from(selectedFiles).filter(isValidFile);
    if (validFiles.length > 0) {
      setPendingFiles(validFiles);
      setPendingMonthDate(monthDate);
      setShowAccountDialog(true);
    }
    e.target.value = "";
  };

  const isValidFile = (file: File) => {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    return [".xlsx", ".xls", ".csv", ".pdf"].includes(ext);
  };

  const handleAccountConfirm = (accountId: string) => {
    setShowAccountDialog(false);
    if (pendingFiles.length > 0) {
      addFilesForMonth(pendingFiles, pendingMonthDate, accountId);
      setPendingFiles([]);
    }
  };

  const openFileReview = (imp: Import, monthKey: string) => {
    setReviewImportId(imp.id);
    setReviewMonthKey(monthKey);
    setReviewTitle(imp.file_name);
    setShowReviewModal(true);
  };

  const openMonthReview = (monthKey: string, monthLabel: string) => {
    setReviewImportId(undefined);
    setReviewMonthKey(monthKey);
    setReviewTitle("");
    setShowReviewModal(true);
  };

  const handleCloseMonth = (period: Period, label: string) => {
    setDialogPeriod(period);
    setDialogMonthLabel(label);
    setShowCloseDialog(true);
  };

  const handleReopenMonth = (period: Period, label: string) => {
    setDialogPeriod(period);
    setDialogMonthLabel(label);
    setShowReopenDialog(true);
  };

  const canShowLess = monthsToShow > DEFAULT_MONTHS_TO_SHOW;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  // Processing banner
  const anyProcessing = monthSlots.some((s) => isProcessingMonth(s.key));

  return (
    <div>
      {anyProcessing && (
        <div className="space-y-2 p-3 mb-3 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
            <span className="text-sm font-medium text-primary">Processing files...</span>
            <span className="text-xs text-muted-foreground ml-auto">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="text-[11px] font-medium text-muted-foreground h-9 w-[120px]">Month</TableHead>
              <TableHead className="text-[11px] font-medium text-muted-foreground h-9">File</TableHead>
              <TableHead className="text-[11px] font-medium text-muted-foreground h-9 w-[60px] hidden md:table-cell">Type</TableHead>
              <TableHead className="text-[11px] font-medium text-muted-foreground h-9 w-[100px] hidden lg:table-cell">Date</TableHead>
              <TableHead className="text-[11px] font-medium text-muted-foreground h-9 w-[70px] hidden lg:table-cell">Time</TableHead>
              <TableHead className="text-[11px] font-medium text-muted-foreground h-9 w-[90px] hidden md:table-cell">Transactions</TableHead>
              <TableHead className="text-[11px] font-medium text-muted-foreground h-9 w-[130px] hidden md:table-cell">Account</TableHead>
              <TableHead className="text-[11px] font-medium text-muted-foreground h-9 w-[120px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {monthSlots.map((slot) => {
              const monthImports = importsByMonth[slot.key] || [];
              const period = getPeriodByMonthKey(slot.key, "CASHFLOW");
              const isClosed = period?.status === "CLOSED";
              const totalTx = monthImports.reduce((s, i) => s + (i.transactions_count || 0), 0);
              const uniqueAccts = [...new Set(monthImports.map((i) => accounts.find((a) => a.id === i.account_id)?.name).filter(Boolean))];
              const isEmpty = monthImports.length === 0;
              const rowCount = Math.max(1, monthImports.length);

              return (
                <React.Fragment key={slot.key}>
                  {/* File rows */}
                  {monthImports.map((imp, idx) => {
                    const isStale =
                      (imp.status === "PARSED" || imp.status === "UPLOADED") &&
                      Date.now() - new Date(imp.uploaded_at).getTime() > 5 * 60 * 1000;
                    const status = isStale ? "FAILED" : imp.status;
                    const errorMessage = isStale ? "Processing interrupted. Please re-upload." : imp.error_message;

                    return (
                      <TableRow key={imp.id} className="group" id={idx === 0 ? `upload-bank-${slot.key}` : undefined}>
                        {/* Month cell - only on first row, spans all file rows */}
                        {idx === 0 && (
                          <TableCell
                            rowSpan={rowCount + 1 /* +1 for add-file row */}
                            className="py-2 align-top font-semibold text-sm text-foreground capitalize border-r border-border/50 bg-muted/10"
                          >
                            <div className="flex items-center gap-1.5">
                              <span>{slot.label}</span>
                              {isClosed && <Lock className="w-3 h-3 text-muted-foreground" />}
                            </div>
                          </TableCell>
                        )}
                        {/* File name */}
                        <TableCell className="py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {getStatusIcon(status)}
                            <span className="text-sm text-foreground font-medium truncate max-w-[180px] md:max-w-[250px]">{imp.file_name}</span>
                            {status === "FAILED" && errorMessage && (
                              <HoverCard>
                                <HoverCardTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive hover:text-destructive shrink-0">
                                    <Info className="w-3 h-3" />
                                  </Button>
                                </HoverCardTrigger>
                                <HoverCardContent className="w-80" align="start">
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <AlertCircle className="w-4 h-4 text-destructive" />
                                      <h4 className="text-sm font-semibold">Processing error</h4>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{errorMessage}</p>
                                  </div>
                                </HoverCardContent>
                              </HoverCard>
                            )}
                          </div>
                        </TableCell>
                        {/* Type */}
                        <TableCell className="py-2 hidden md:table-cell">
                          <Badge variant="outline" className="text-[10px] font-medium uppercase px-1.5 py-0">
                            {imp.file_name.split(".").pop() || "—"}
                          </Badge>
                        </TableCell>
                        {/* Date */}
                        <TableCell className="py-2 hidden lg:table-cell">
                          <span className="text-xs text-foreground">{formatDatePref(imp.uploaded_at)}</span>
                        </TableCell>
                        {/* Time */}
                        <TableCell className="py-2 hidden lg:table-cell">
                          <span className="text-xs text-muted-foreground">
                            {new Date(imp.uploaded_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </TableCell>
                        {/* Transactions */}
                        <TableCell className="py-2 hidden md:table-cell">
                          {status === "NORMALIZED" && imp.transactions_count ? (
                            <span className="text-sm text-foreground">{imp.transactions_count}</span>
                          ) : status === "FAILED" ? (
                            <span className="text-sm text-destructive">—</span>
                          ) : (
                            <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                          )}
                        </TableCell>
                        {/* Account */}
                        <TableCell className="py-2 hidden md:table-cell">
                          {cashAccounts.length > 0 ? (
                            <Select value={imp.account_id || ""} onValueChange={(val) => handleAccountChange(imp.id, val)}>
                              <SelectTrigger className="h-7 w-full text-xs border-border bg-transparent hover:bg-muted/50 px-2 gap-1">
                                <span className="truncate text-foreground">{getAccountName(imp.account_id)}</span>
                              </SelectTrigger>
                              <SelectContent>
                                {cashAccounts.map((a) => (
                                  <SelectItem key={a.id} value={a.id} className="text-xs">{a.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-xs text-muted-foreground">{getAccountName(imp.account_id)}</span>
                          )}
                        </TableCell>
                        {/* Actions */}
                        <TableCell className="py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {status === "NORMALIZED" && imp.transactions_count && imp.transactions_count > 0 && (
                              <Button
                                variant="secondary"
                                size="sm"
                                className={cn(
                                  "h-7 px-2.5 text-xs border-0",
                                  isClosed ? "bg-success/10 text-success hover:bg-success/20" : "bg-primary/10 text-primary hover:bg-primary/20"
                                )}
                                onClick={() => openFileReview(imp, slot.key)}
                              >
                                {isClosed ? <><Eye className="w-3 h-3 mr-1" />View</> : <><Pencil className="w-3 h-3 mr-1" />Edit</>}
                              </Button>
                            )}
                            <AlertDialog>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground/40 hover:text-destructive transition-colors"
                                disabled={isDeleting}
                                onClick={() => {}}
                                asChild
                              >
                                <span />
                              </Button>
                            </AlertDialog>
                            <DeleteImportButton importId={imp.id} fileName={imp.file_name} onDelete={deleteImport} isDeleting={isDeleting} />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {/* Empty month row or Add file row */}
                  {isEmpty ? (
                    <TableRow id={`upload-bank-${slot.key}`}>
                      <TableCell className="py-2 align-top font-semibold text-sm text-foreground capitalize border-r border-border/50 bg-muted/10">
                        <div className="flex items-center gap-1.5">
                          <span>{slot.label}</span>
                          {isClosed && <Lock className="w-3 h-3 text-muted-foreground" />}
                        </div>
                      </TableCell>
                      <TableCell colSpan={7} className="py-2">
                        {isClosed ? (
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground">Closed — no files</span>
                            <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => period && handleReopenMonth(period, slot.label)} disabled={isReopening}>
                              <Unlock className="w-3 h-3 mr-1" />Reopen
                            </Button>
                          </div>
                        ) : (
                          <div className="relative">
                            <input type="file" accept=".xlsx,.xls,.csv,.pdf" multiple onChange={handleFileInput(slot.date, slot.key)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                            <div className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors cursor-pointer">
                              <Plus className="w-4 h-4" />
                              <span className="text-sm font-medium">Add new file</span>
                            </div>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    /* Add file row for non-empty months */
                    !isClosed && (
                      <TableRow className="hover:bg-muted/30 border-t border-dashed">
                        <TableCell colSpan={7} className="py-2">
                          <div className="relative">
                            <input type="file" accept=".xlsx,.xls,.csv,.pdf" multiple onChange={handleFileInput(slot.date, slot.key)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                            <div className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors cursor-pointer">
                              <Plus className="w-4 h-4" />
                              <span className="text-sm font-medium">Add new file</span>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  )}

                  {/* Subtotal row */}
                  {!isEmpty && (
                    <TableRow className="bg-muted/30 hover:bg-muted/40 border-t">
                      <TableCell className="py-2 border-r border-border/50 bg-muted/20" />
                      <TableCell className="py-2">
                        <div className="flex items-center gap-3">
                          {period && !isClosed && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-muted-foreground hover:text-foreground bg-muted-foreground/10 rounded-md px-3"
                              onClick={() => handleCloseMonth(period, slot.label)}
                              disabled={isClosing}
                            >
                              {isClosing ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Lock className="w-3.5 h-3.5 mr-1.5" />}
                              Close month
                            </Button>
                          )}
                          {period && isClosed && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-muted-foreground hover:text-foreground bg-muted-foreground/10 rounded-md px-3"
                              onClick={() => handleReopenMonth(period, slot.label)}
                              disabled={isReopening}
                            >
                              {isReopening ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Unlock className="w-3.5 h-3.5 mr-1.5" />}
                              Reopen month
                            </Button>
                          )}
                          <span className="text-xs font-semibold text-foreground">
                            {monthImports.length} file{monthImports.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2 hidden md:table-cell" />
                      <TableCell className="py-2 hidden lg:table-cell" />
                      <TableCell className="py-2 hidden lg:table-cell" />
                      <TableCell className="py-2 hidden md:table-cell">
                        <span className="text-sm font-semibold text-foreground">{totalTx}</span>
                      </TableCell>
                      <TableCell className="py-2 hidden md:table-cell">
                        <span className="text-sm font-semibold text-foreground">{uniqueAccts.length}</span>
                      </TableCell>
                      <TableCell className="py-2 text-right">
                        {totalTx > 0 && (
                          <Button
                            variant="secondary"
                            size="sm"
                            className={cn(
                              "h-7 px-3 text-xs border-0 font-medium rounded-full",
                              isClosed ? "bg-success/10 text-success hover:bg-success/20" : "bg-primary/10 text-primary hover:bg-primary/20"
                            )}
                            onClick={() => openMonthReview(slot.key, slot.label)}
                          >
                            {isClosed ? <><Eye className="w-3 h-3 mr-1" />View all</> : <><Pencil className="w-3 h-3 mr-1" />Edit all</>}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Load more / Show less */}
      <div className="flex gap-2 mt-3">
        {canShowLess && (
          <Button
            variant="outline"
            className="flex-1 text-foreground border-border"
            onClick={() => setMonthsToShow((p) => Math.max(DEFAULT_MONTHS_TO_SHOW, p - MONTHS_INCREMENT))}
          >
            <ChevronUp className="w-4 h-4 mr-2" />
            {t("uploads.showLess")}
          </Button>
        )}
        <Button
          variant="outline"
          className="flex-1 text-foreground border-border"
          onClick={() => setMonthsToShow((p) => p + MONTHS_INCREMENT)}
        >
          <ChevronDown className="w-4 h-4 mr-2" />
          {t("uploads.loadMore")}
        </Button>
      </div>

      {/* Dialogs */}
      <AlertDialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><Lock className="w-5 h-5" />Close month?</AlertDialogTitle>
            <AlertDialogDescription>
              Transactions for {dialogMonthLabel} will be locked and you won't be able to edit categories. You can reopen the month if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (dialogPeriod) closePeriod(dialogPeriod.id); setShowCloseDialog(false); }}>
              <Lock className="w-4 h-4 mr-2" />Close month
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showReopenDialog} onOpenChange={setShowReopenDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><Unlock className="w-5 h-5" />Reopen month?</AlertDialogTitle>
            <AlertDialogDescription>
              This will allow you to upload more files and edit transaction categories for {dialogMonthLabel}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (dialogPeriod) reopenPeriod(dialogPeriod.id); setShowReopenDialog(false); }}>
              <Unlock className="w-4 h-4 mr-2" />Reopen month
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AccountSelectDialog
        open={showAccountDialog}
        onOpenChange={(open) => { setShowAccountDialog(open); if (!open) setPendingFiles([]); }}
        onConfirm={handleAccountConfirm}
        fileName={pendingFiles.length === 1 ? pendingFiles[0].name : undefined}
      />

      <MonthReviewModal
        open={showReviewModal}
        onOpenChange={setShowReviewModal}
        monthKey={reviewMonthKey}
        monthLabel={reviewTitle || reviewMonthKey}
        isLocked={getPeriodByMonthKey(reviewMonthKey, "CASHFLOW")?.status === "CLOSED"}
        importId={reviewImportId}
      />
    </div>
  );
}

// Small delete button with confirmation
function DeleteImportButton({ importId, fileName, onDelete, isDeleting }: { importId: string; fileName: string; onDelete: (id: string) => void; isDeleting: boolean }) {
  return (
    <AlertDialog>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete file?</AlertDialogTitle>
          <AlertDialogDescription>
            All transactions associated with "{fileName}" will be deleted. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => onDelete(importId)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-muted-foreground/40 hover:text-destructive transition-colors"
        disabled={isDeleting}
        asChild
      >
        <AlertDialogAction className="bg-transparent hover:bg-transparent p-0 h-6 w-6">
          <Trash2 className="w-3.5 h-3.5" />
        </AlertDialogAction>
      </Button>
    </AlertDialog>
  );
}

import React from "react";