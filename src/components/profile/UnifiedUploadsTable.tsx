import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useLocalization } from "@/hooks/useLocalization";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Plus, FileSpreadsheet, CheckCircle2, Loader2, AlertCircle, Trash2,
  Lock, Unlock, Pencil, Eye, Info, ChevronDown, ChevronUp,
} from "lucide-react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Import, useImports } from "@/hooks/useImports";
import { useAccounts } from "@/hooks/useAccounts";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { MonthReviewModal } from "./MonthReviewModal";
import { AccountSelectDialog } from "./AccountSelectDialog";
import { usePeriods, Period } from "@/hooks/usePeriods";
import { useMonthlyFileUpload } from "@/hooks/useMonthlyFileUpload";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";

const DEFAULT_MONTHS = 3;
const INCREMENT = 3;
const VALID_EXTS = [".xlsx", ".xls", ".csv", ".pdf"];

export function UnifiedUploadsTable() {
  const { t } = useTranslation("profile");
  const { formatMonth, formatDate: formatDatePref } = useLocalization();
  const { imports, isLoading, deleteImport, isDeleting, toggleLockImport, isTogglingLock } = useImports("CASHFLOW");
  const { addFilesForMonth, isProcessingMonth, getPendingCountForMonth } = useMonthlyFileUpload();
  const { getPeriodByMonthKey } = usePeriods("CASHFLOW");
  const { accounts } = useAccounts();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const cashAccounts = accounts.filter((a) => a.account_role === "CASH");

  // Fetch mismatched transaction counts per import
  const { data: mismatchByImport = {} } = useQuery({
    queryKey: ["mismatch-counts", user?.id],
    queryFn: async () => {
      if (!user) return {};
      const { data, error } = await supabase
        .from("transactions")
        .select("id, import_id, amount, movement")
        .eq("user_id", user.id)
        .eq("domain", "CASHFLOW");
      if (error || !data) return {};
      const counts: Record<string, number> = {};
      for (const tx of data) {
        const isMismatch = (tx.amount > 0 && tx.movement === 'EXPENSE') || (tx.amount < 0 && tx.movement === 'INCOME');
        if (isMismatch && tx.import_id) {
          counts[tx.import_id] = (counts[tx.import_id] || 0) + 1;
        }
      }
      return counts;
    },
    enabled: !!user,
  });

  const [monthsToShow, setMonthsToShow] = useState(DEFAULT_MONTHS);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewImportId, setReviewImportId] = useState<string | undefined>();
  const [reviewMonthKey, setReviewMonthKey] = useState("");
  const [reviewTitle, setReviewTitle] = useState("");
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showReopenDialog, setShowReopenDialog] = useState(false);
  const [dialogPeriod, setDialogPeriod] = useState<Period | undefined>();
  const [dialogLabel, setDialogLabel] = useState("");
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingMonthDate, setPendingMonthDate] = useState<Date>(new Date());
  const [progress, setProgress] = useState(0);

  const monthSlots = useMemo(() => {
    const now = new Date();
    const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return Array.from({ length: monthsToShow }, (_, i) => {
      const d = new Date(last.getFullYear(), last.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return { key, label: formatMonth(d), date: d };
    });
  }, [monthsToShow, formatMonth]);

  const importsByMonth = useMemo(() => {
    const g: Record<string, Import[]> = {};
    imports.forEach((imp) => {
      const k = (imp.target_month || imp.uploaded_at.substring(0, 7)).substring(0, 7);
      (g[k] ??= []).push(imp);
    });
    return g;
  }, [imports]);

  // Global totals across ALL imports (not just visible months)
  const globalTotals = useMemo(() => {
    const monthsWithData = new Set<string>();
    const accountsWithData = new Set<string>();
    let totalTransactions = 0;
    imports.forEach((imp) => {
      const k = (imp.target_month || imp.uploaded_at.substring(0, 7)).substring(0, 7);
      monthsWithData.add(k);
      if (imp.account_id) accountsWithData.add(imp.account_id);
      totalTransactions += imp.transactions_count || 0;
    });
    return {
      months: monthsWithData.size,
      accounts: accountsWithData.size,
      files: imports.length,
      transactions: totalTransactions,
    };
  }, [imports]);

  // Progress animation
  const anyProcessing = monthSlots.some((s) => isProcessingMonth(s.key));
  useEffect(() => {
    if (anyProcessing) {
      setProgress(0);
      const start = Date.now();
      const iv = setInterval(() => setProgress(Math.min(92, 20 * Math.log(1 + (Date.now() - start) / 2000))), 200);
      return () => clearInterval(iv);
    } else if (progress > 0) {
      setProgress(100);
      const t = setTimeout(() => setProgress(0), 500);
      return () => clearTimeout(t);
    }
  }, [anyProcessing]);

  const statusIcon = (s: string) => {
    if (s === "NORMALIZED") return <CheckCircle2 className="w-3.5 h-3.5 text-success" />;
    if (s === "PARSED" || s === "UPLOADED") return <Loader2 className="w-3.5 h-3.5 text-warning animate-spin" />;
    if (s === "FAILED") return <AlertCircle className="w-3.5 h-3.5 text-destructive" />;
    return <FileSpreadsheet className="w-3.5 h-3.5 text-muted-foreground" />;
  };

  const acctName = (id: string | null) => (id && accounts.find((a) => a.id === id)?.name) || "—";

  const changeAcct = async (importId: string, newId: string) => {
    await supabase.from("imports").update({ account_id: newId }).eq("id", importId);
    await supabase.from("transactions").update({ account_id: newId }).eq("import_id", importId);
    queryClient.invalidateQueries({ queryKey: ["imports"] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
  };

  const onFileInput = (monthDate: Date, monthKey: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const period = getPeriodByMonthKey(monthKey, "CASHFLOW");
    if (period?.status === "CLOSED") {
      toast({ title: "Month closed", description: "Reopen this month first.", variant: "destructive" });
      e.target.value = "";
      return;
    }
    const valid = Array.from(e.target.files).filter((f) => VALID_EXTS.includes("." + f.name.split(".").pop()?.toLowerCase()));
    if (valid.length) { setPendingFiles(valid); setPendingMonthDate(monthDate); setShowAccountDialog(true); }
    e.target.value = "";
  };

  const onAcctConfirm = (accountId: string) => {
    setShowAccountDialog(false);
    if (pendingFiles.length) { addFilesForMonth(pendingFiles, pendingMonthDate, accountId); setPendingFiles([]); }
  };

  if (isLoading) {
    return <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />)}</div>;
  }

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
              <TableHead className="text-xs font-semibold text-muted-foreground h-10 w-[140px]">Month</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground h-10">File</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground h-10 w-[80px] hidden md:table-cell">Type</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground h-10 w-[160px] hidden lg:table-cell">Uploaded</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground h-10 w-[110px] hidden md:table-cell">Transactions</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground h-10 w-[150px] hidden md:table-cell">Account</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground h-10 w-[150px] text-center">Actions</TableHead>
            </TableRow>
            {/* Global totals row — pinned right after headers */}
            <TableRow className="bg-primary/5 hover:bg-primary/5 border-b-2 border-primary/20">
              <TableCell className="py-2.5 font-semibold text-xs text-foreground uppercase tracking-wide">
                Totals
              </TableCell>
              <TableCell className="py-2.5 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{globalTotals.files}</span> file{globalTotals.files !== 1 ? "s" : ""} across{" "}
                <span className="font-semibold text-foreground">{globalTotals.months}</span> month{globalTotals.months !== 1 ? "s" : ""}
              </TableCell>
              <TableCell className="py-2.5 hidden md:table-cell" />
              <TableCell className="py-2.5 hidden lg:table-cell" />
              <TableCell className="py-2.5 hidden md:table-cell">
                <span className="text-sm font-semibold text-foreground">{globalTotals.transactions}</span>
              </TableCell>
              <TableCell className="py-2.5 hidden md:table-cell">
                <span className="text-sm font-semibold text-foreground">{globalTotals.accounts}</span>{" "}
                <span className="text-xs text-muted-foreground">account{globalTotals.accounts !== 1 ? "s" : ""}</span>
              </TableCell>
              <TableCell className="py-2.5" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {monthSlots.map((slot) => {
              const mi = importsByMonth[slot.key] || [];
              const period = getPeriodByMonthKey(slot.key, "CASHFLOW");
              const closed = period?.status === "CLOSED";
              const totalTx = mi.reduce((s, i) => s + (i.transactions_count || 0), 0);
              const uniqAccts = [...new Set(mi.map((i) => acctName(i.account_id)).filter((n) => n !== "—"))];
              const empty = mi.length === 0;
              // Total rows for this month group (file rows + add-new-file row)
              const groupRowCount = empty ? 1 : mi.length + (closed ? 0 : 1);

              const monthCell = (
                <TableCell rowSpan={groupRowCount} className="py-3 align-middle border-r border-border/50 bg-muted/10 font-semibold text-sm text-foreground capitalize">
                  <div className="flex items-center gap-1.5">
                    <span>{slot.label}</span>
                    {closed && <Lock className="w-3 h-3 text-muted-foreground" />}
                  </div>
                </TableCell>
              );

              return (
                <React.Fragment key={slot.key}>
                  {/* File rows */}
                  {mi.map((imp, idx) => {
                    const stale = (imp.status === "PARSED" || imp.status === "UPLOADED") && Date.now() - new Date(imp.uploaded_at).getTime() > 300000;
                    const st = stale ? "FAILED" : imp.status;
                    const err = stale ? "Processing interrupted. Please re-upload." : imp.error_message;
                    return (
                      <TableRow key={imp.id} className="group" id={idx === 0 ? `upload-bank-${slot.key}` : undefined}>
                        {idx === 0 && monthCell}
                        <TableCell className="py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {statusIcon(st)}
                            <span className="text-sm text-foreground font-medium truncate max-w-[180px] md:max-w-[250px]">{imp.file_name}</span>
                            {(mismatchByImport[imp.id] || 0) > 0 && (
                              <HoverCard>
                                <HoverCardTrigger asChild>
                                  <div className="flex items-center gap-1 shrink-0 cursor-help">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                    <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">{mismatchByImport[imp.id]}</span>
                                  </div>
                                </HoverCardTrigger>
                                <HoverCardContent className="w-64" align="start">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /><h4 className="text-sm font-semibold">Sign-category mismatch</h4></div>
                                    <p className="text-xs text-muted-foreground">This file contains {mismatchByImport[imp.id]} transaction{mismatchByImport[imp.id] !== 1 ? 's' : ''} with sign-movement mismatches. Open Edit to review.</p>
                                  </div>
                                </HoverCardContent>
                              </HoverCard>
                            )}
                            {st === "FAILED" && err && (
                              <HoverCard>
                                <HoverCardTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive shrink-0"><Info className="w-3 h-3" /></Button>
                                </HoverCardTrigger>
                                <HoverCardContent className="w-80" align="start">
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4 text-destructive" /><h4 className="text-sm font-semibold">Processing error</h4></div>
                                    <p className="text-xs text-muted-foreground">{err}</p>
                                  </div>
                                </HoverCardContent>
                              </HoverCard>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-2 hidden md:table-cell">
                          <Badge variant="outline" className="text-[10px] font-medium uppercase px-1.5 py-0">{imp.file_name.split(".").pop() || "—"}</Badge>
                        </TableCell>
                        <TableCell className="py-2 hidden lg:table-cell">
                          <div className="flex flex-col leading-tight">
                            <span className="text-xs text-foreground">{formatDatePref(imp.uploaded_at)}</span>
                            <span className="text-[11px] text-muted-foreground">{new Date(imp.uploaded_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2 hidden md:table-cell">
                          {st === "NORMALIZED" && imp.transactions_count ? <span className="text-sm text-foreground">{imp.transactions_count}</span> : st === "FAILED" ? <span className="text-sm text-destructive">—</span> : <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
                        </TableCell>
                        <TableCell className="py-2 hidden md:table-cell">
                          {cashAccounts.length > 0 ? (
                            <Select value={imp.account_id || ""} onValueChange={(v) => changeAcct(imp.id, v)}>
                              <SelectTrigger className="h-7 w-full text-xs border-border bg-transparent hover:bg-muted/50 px-2 gap-1">
                                <span className="truncate text-foreground">{acctName(imp.account_id)}</span>
                              </SelectTrigger>
                              <SelectContent>{cashAccounts.map((a) => <SelectItem key={a.id} value={a.id} className="text-xs">{a.name}</SelectItem>)}</SelectContent>
                            </Select>
                          ) : <span className="text-xs text-muted-foreground">{acctName(imp.account_id)}</span>}
                        </TableCell>
                        <TableCell className="py-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {st === "NORMALIZED" && (imp.transactions_count ?? 0) > 0 && (
                              <Button variant="secondary" size="sm" className={cn("h-7 px-2.5 text-xs border-0", closed ? "bg-success/10 text-success hover:bg-success/20" : "bg-primary/10 text-primary hover:bg-primary/20")} onClick={() => { setReviewImportId(imp.id); setReviewMonthKey(slot.key); setReviewTitle(imp.file_name); setShowReviewModal(true); }}>
                                {closed ? <><Eye className="w-3 h-3 mr-1" />View</> : <><Pencil className="w-3 h-3 mr-1" />Edit</>}
                              </Button>
                            )}
                            {period && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground/60 hover:text-foreground transition-colors"
                                disabled={isClosing || isReopening}
                                title={closed ? "Reopen month" : "Close month"}
                                onClick={() => {
                                  setDialogPeriod(period);
                                  setDialogLabel(slot.label);
                                  if (closed) setShowReopenDialog(true);
                                  else setShowCloseDialog(true);
                                }}
                              >
                                {(isClosing || isReopening) ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : closed ? (
                                  <Unlock className="w-3.5 h-3.5" />
                                ) : (
                                  <Lock className="w-3.5 h-3.5" />
                                )}
                              </Button>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground/40 hover:text-destructive transition-colors" disabled={isDeleting}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete file?</AlertDialogTitle>
                                  <AlertDialogDescription>All transactions associated with "{imp.file_name}" will be deleted. This cannot be undone.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteImport(imp.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {/* Empty month — single row */}
                  {empty && (
                    <TableRow id={`upload-bank-${slot.key}`}>
                      {monthCell}
                      <TableCell colSpan={6} className="py-2">
                        {closed ? (
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground">Closed — no files</span>
                            {period && (
                              <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => { setDialogPeriod(period); setDialogLabel(slot.label); setShowReopenDialog(true); }} disabled={isReopening}>
                                <Unlock className="w-3 h-3 mr-1" />Reopen
                              </Button>
                            )}
                          </div>
                        ) : (
                          <div className="relative">
                            <input type="file" accept=".xlsx,.xls,.csv,.pdf" multiple onChange={onFileInput(slot.date, slot.key)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                            <div className="flex items-center gap-2 text-primary hover:text-primary/80 cursor-pointer"><Plus className="w-4 h-4" /><span className="text-sm font-medium">Add new file</span></div>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )}

                  {/* Add file row for non-empty open months */}
                  {!empty && !closed && (
                    <TableRow className="hover:bg-muted/30">
                      <TableCell colSpan={6} className="py-2">
                        <div className="relative">
                          <input type="file" accept=".xlsx,.xls,.csv,.pdf" multiple onChange={onFileInput(slot.date, slot.key)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                          <div className="flex items-center gap-2 text-primary hover:text-primary/80 cursor-pointer"><Plus className="w-4 h-4" /><span className="text-sm font-medium">Add new file</span></div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}

                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex gap-2 mt-3">
        {monthsToShow > DEFAULT_MONTHS && (
          <Button variant="outline" className="flex-1 text-foreground border-border" onClick={() => setMonthsToShow((p) => Math.max(DEFAULT_MONTHS, p - INCREMENT))}>
            <ChevronUp className="w-4 h-4 mr-2" />{t("uploads.showLess")}
          </Button>
        )}
        <Button variant="outline" className="flex-1 text-foreground border-border" onClick={() => setMonthsToShow((p) => p + INCREMENT)}>
          <ChevronDown className="w-4 h-4 mr-2" />{t("uploads.loadMore")}
        </Button>
      </div>

      {/* Dialogs */}
      <AlertDialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><Lock className="w-5 h-5" />Close month?</AlertDialogTitle>
            <AlertDialogDescription>Transactions for {dialogLabel} will be locked. You can reopen later if needed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (dialogPeriod) closePeriod(dialogPeriod.id); setShowCloseDialog(false); }}><Lock className="w-4 h-4 mr-2" />Close month</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showReopenDialog} onOpenChange={setShowReopenDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><Unlock className="w-5 h-5" />Reopen month?</AlertDialogTitle>
            <AlertDialogDescription>This will allow uploading files and editing categories for {dialogLabel}.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (dialogPeriod) reopenPeriod(dialogPeriod.id); setShowReopenDialog(false); }}><Unlock className="w-4 h-4 mr-2" />Reopen month</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AccountSelectDialog
        open={showAccountDialog}
        onOpenChange={(o) => { setShowAccountDialog(o); if (!o) setPendingFiles([]); }}
        onConfirm={onAcctConfirm}
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