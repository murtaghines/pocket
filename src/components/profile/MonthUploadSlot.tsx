import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
  TableFooter,
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Import } from "@/hooks/useImports";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { MonthReviewModal } from "./MonthReviewModal";
import { AccountSelectDialog } from "./AccountSelectDialog";
import { Period } from "@/hooks/usePeriods";

const ACCEPTED_EXTENSIONS = ['.xlsx', '.xls', '.csv', '.pdf'];
const ACCEPTED_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'application/pdf'
];

interface MonthUploadSlotProps {
  monthKey: string;
  monthLabel: string;
  monthDate: Date;
  imports: Import[];
  onAddFiles: (files: File[], targetMonth: Date, accountId?: string) => void;
  onProcessFiles: (targetMonth: Date) => Promise<void>;
  onDeleteImport: (importId: string) => void;
  isProcessing: boolean;
  hasPendingFiles: boolean;
  pendingFilesCount: number;
  isDeleting: boolean;
  period?: Period;
  onClosePeriod?: (periodId: string) => void;
  onReopenPeriod?: (periodId: string) => void;
  isClosingPeriod?: boolean;
  isReopeningPeriod?: boolean;
}

export function MonthUploadSlot({
  monthKey,
  monthLabel,
  monthDate,
  imports,
  onAddFiles,
  onProcessFiles,
  onDeleteImport,
  isProcessing,
  hasPendingFiles,
  pendingFilesCount,
  isDeleting,
  period,
  onClosePeriod,
  onReopenPeriod,
  isClosingPeriod,
  isReopeningPeriod,
}: MonthUploadSlotProps) {
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewImportId, setReviewImportId] = useState<string | undefined>(undefined);
  const [reviewTitle, setReviewTitle] = useState<string>("");
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showReopenDialog, setShowReopenDialog] = useState(false);
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();
  const { accounts } = useAccounts();
  const queryClient = useQueryClient();
  const cashAccounts = accounts.filter(a => a.account_role === 'CASH');

  const isClosed = period?.status === 'CLOSED';
  const totalTransactions = imports.reduce((sum, imp) => sum + (imp.transactions_count || 0), 0);

  // Unique account names
  const uniqueAccounts = [...new Set(imports.map(imp => {
    const acc = accounts.find(a => a.id === imp.account_id);
    return acc?.name;
  }).filter(Boolean))];

  useEffect(() => {
    if (isProcessing) {
      setProgress(0);
      const startTime = Date.now();
      const interval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        const newProgress = Math.min(92, 20 * Math.log(1 + elapsed * 0.5));
        setProgress(newProgress);
      }, 200);
      return () => clearInterval(interval);
    } else {
      if (progress > 0 && progress < 100) {
        setProgress(100);
        setTimeout(() => setProgress(0), 500);
      }
    }
  }, [isProcessing]);

  const getProcessingMessage = () => {
    if (progress < 25) return "Uploading and reading file...";
    if (progress < 55) return "Extracting transactions with AI...";
    if (progress < 80) return "Categorizing and deduplicating...";
    return "Saving to database...";
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const isValidFile = (file: File) => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    return ACCEPTED_TYPES.includes(file.type) || ACCEPTED_EXTENSIONS.includes(extension);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isClosed) {
      toast({ title: "Month closed", description: "Reopen this month before uploading files.", variant: "destructive" });
      return;
    }
    const droppedFiles = Array.from(e.dataTransfer.files).filter(isValidFile);
    if (droppedFiles.length === 0) {
      toast({ title: "Unsupported format", description: "Please upload Excel (.xlsx, .xls), CSV or PDF files.", variant: "destructive" });
      return;
    }
    setPendingFiles(droppedFiles);
    setShowAccountDialog(true);
  }, [toast, isClosed]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;
    if (isClosed) {
      toast({ title: "Month closed", description: "Reopen this month before uploading files.", variant: "destructive" });
      e.target.value = '';
      return;
    }
    const validFiles = Array.from(selectedFiles).filter(isValidFile);
    if (validFiles.length > 0) {
      setPendingFiles(validFiles);
      setShowAccountDialog(true);
    }
    e.target.value = '';
  };

  const handleAccountConfirm = (accountId: string) => {
    setShowAccountDialog(false);
    if (pendingFiles.length > 0) {
      onAddFiles(pendingFiles, monthDate, accountId);
      setPendingFiles([]);
    }
  };

  const getAccountName = (accountId: string | null) => {
    if (!accountId) return "—";
    return accounts.find(a => a.id === accountId)?.name || "—";
  };

  const handleAccountChange = async (importId: string, newAccountId: string) => {
    await supabase
      .from('imports')
      .update({ account_id: newAccountId })
      .eq('id', importId);
    await supabase
      .from('transactions')
      .update({ account_id: newAccountId })
      .eq('import_id', importId);
    queryClient.invalidateQueries({ queryKey: ['imports'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'NORMALIZED': return <CheckCircle2 className="w-3.5 h-3.5 text-success" />;
      case 'PARSED':
      case 'UPLOADED': return <Loader2 className="w-3.5 h-3.5 text-warning animate-spin" />;
      case 'FAILED': return <AlertCircle className="w-3.5 h-3.5 text-destructive" />;
      default: return <FileSpreadsheet className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  const openFileReview = (imp: Import) => {
    setReviewImportId(imp.id);
    setReviewTitle(imp.file_name);
    setShowReviewModal(true);
  };

  const openMonthReview = () => {
    setReviewImportId(undefined);
    setReviewTitle("");
    setShowReviewModal(true);
  };

  const isEmpty = imports.length === 0 && pendingFilesCount === 0;

  return (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      {/* Processing progress */}
      {isProcessing && (
        <div className="space-y-2 p-3 mb-2 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
            <span className="text-sm font-medium text-primary">Processing files...</span>
            <span className="text-xs text-muted-foreground ml-auto">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground">{getProcessingMessage()}</p>
        </div>
      )}

      {/* Month title */}
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-sm font-semibold text-foreground capitalize">{monthLabel}</h3>
        {isClosed && (
          <Badge variant="outline" className="text-[10px] gap-1 py-0 h-5 border-muted-foreground/30">
            <Lock className="w-2.5 h-2.5" /> Closed
          </Badge>
        )}
      </div>

      {/* Main Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="text-[11px] font-medium text-muted-foreground h-9">File</TableHead>
              <TableHead className="text-[11px] font-medium text-muted-foreground h-9 w-[60px] hidden md:table-cell">Type</TableHead>
              <TableHead className="text-[11px] font-medium text-muted-foreground h-9 w-[130px] hidden lg:table-cell">Uploaded</TableHead>
              <TableHead className="text-[11px] font-medium text-muted-foreground h-9 w-[90px] hidden md:table-cell">Transactions</TableHead>
              <TableHead className="text-[11px] font-medium text-muted-foreground h-9 w-[130px] hidden md:table-cell">Account</TableHead>
              <TableHead className="text-[11px] font-medium text-muted-foreground h-9 w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* File rows */}
            {imports.map((imp) => {
              const isStaleProcessing =
                (imp.status === "PARSED" || imp.status === "UPLOADED") &&
                Date.now() - new Date(imp.uploaded_at).getTime() > 5 * 60 * 1000;
              const status = isStaleProcessing ? "FAILED" : imp.status;
              const errorMessage = isStaleProcessing
                ? "Processing interrupted. Please re-upload."
                : imp.error_message;

              return (
                <TableRow key={imp.id} className="group">
                   {/* File name + status */}
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
                              <div className="pt-2 border-t">
                                <p className="text-xs text-muted-foreground">
                                  <strong>Tip:</strong> If it's a scanned PDF, try converting it to CSV or Excel.
                                </p>
                              </div>
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                      )}
                    </div>
                    {status === "FAILED" && errorMessage && (
                      <p className="text-xs text-destructive mt-0.5 ml-5 truncate max-w-[280px]">{errorMessage.slice(0, 60)}</p>
                    )}
                  </TableCell>

                  {/* File type */}
                  <TableCell className="py-2 hidden md:table-cell">
                    <Badge variant="outline" className="text-[10px] font-medium uppercase px-1.5 py-0">
                      {imp.file_name.split('.').pop() || '—'}
                    </Badge>
                  </TableCell>

                  {/* Date uploaded */}
                  <TableCell className="py-2 hidden lg:table-cell">
                    <span className="text-xs text-muted-foreground">
                      {new Date(imp.uploaded_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                      {' '}
                      <span className="text-muted-foreground/60">{new Date(imp.uploaded_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                    </span>
                  </TableCell>

                  {/* Transactions count */}
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
                      <Select value={imp.account_id || ''} onValueChange={(val) => handleAccountChange(imp.id, val)}>
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

                  {/* Actions: Edit + Delete */}
                  <TableCell className="py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {status === "NORMALIZED" && imp.transactions_count && imp.transactions_count > 0 && (
                        <Button
                          variant="secondary"
                          size="sm"
                          className={cn(
                            "h-7 px-2.5 text-xs border-0",
                            isClosed
                              ? "bg-success/10 text-success hover:bg-success/20"
                              : "bg-primary/10 text-primary hover:bg-primary/20"
                          )}
                          onClick={() => openFileReview(imp)}
                        >
                          {isClosed ? (
                            <><Eye className="w-3 h-3 mr-1" />View</>
                          ) : (
                            <><Pencil className="w-3 h-3 mr-1" />Edit</>
                          )}
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            disabled={isDeleting}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete file?</AlertDialogTitle>
                            <AlertDialogDescription>
                              All transactions associated with "{imp.file_name}" will be deleted. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDeleteImport(imp.id)} className="bg-destructive hover:bg-destructive/90">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}

            {/* Empty state - same as add new file row */}
            {isEmpty && !isClosed && (
              <TableRow className="hover:bg-muted/30">
                <TableCell colSpan={5} className="py-2">
                  <div className="relative">
                    <input type="file" accept=".xlsx,.xls,.csv,.pdf" multiple onChange={handleFileInput} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <div className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors cursor-pointer">
                      <Plus className="w-4 h-4" />
                      <span className="text-sm font-medium">Add new file</span>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {isEmpty && isClosed && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="py-4 md:py-6">
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">Month closed — no files uploaded</p>
                    <Button variant="outline" size="sm" onClick={() => setShowReopenDialog(true)} disabled={isReopeningPeriod}>
                      {isReopeningPeriod ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Unlock className="w-3.5 h-3.5 mr-1.5" />}
                      Reopen month
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {/* Add new file row */}
            {!isEmpty && !isClosed && (
              <TableRow className="hover:bg-muted/30 border-t border-dashed">
                <TableCell colSpan={5} className="py-2">
                  <div className="relative">
                    <input type="file" accept=".xlsx,.xls,.csv,.pdf" multiple onChange={handleFileInput} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={isProcessing} />
                    <div className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors cursor-pointer">
                      <Plus className="w-4 h-4" />
                      <span className="text-sm font-medium">Add new file</span>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>

          {/* Totals footer */}
          {!isEmpty && (
            <TableFooter>
              <TableRow className="bg-muted/30 hover:bg-muted/40 border-t">
                <TableCell colSpan={2} className="py-2">
                  <div className="flex items-center gap-3">
                    {/* Close/Reopen month on left */}
                    {period && !isClosed && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setShowCloseDialog(true)}
                        disabled={isClosingPeriod}
                      >
                        {isClosingPeriod ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Lock className="w-3.5 h-3.5 mr-1.5" />}
                        Close month
                      </Button>
                    )}
                    {period && isClosed && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setShowReopenDialog(true)}
                        disabled={isReopeningPeriod}
                      >
                        {isReopeningPeriod ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Unlock className="w-3.5 h-3.5 mr-1.5" />}
                        Reopen month
                      </Button>
                    )}
                    <span className="text-xs font-semibold text-foreground">{imports.length} file{imports.length !== 1 ? 's' : ''}</span>
                  </div>
                </TableCell>
                <TableCell className="py-2 hidden md:table-cell">
                  <span className="text-sm font-semibold text-foreground">{totalTransactions}</span>
                </TableCell>
                <TableCell className="py-2 hidden md:table-cell">
                  <span className="text-xs font-semibold text-foreground">
                    {uniqueAccounts.length} account{uniqueAccounts.length !== 1 ? 's' : ''}
                  </span>
                </TableCell>
                <TableCell className="py-2">
                  <div className="flex justify-end">
                    {totalTransactions > 0 && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className={cn(
                          "h-7 px-3 text-xs border-0 font-medium rounded-full",
                          isClosed
                            ? "bg-success/10 text-success hover:bg-success/20"
                            : "bg-primary/10 text-primary hover:bg-primary/20"
                        )}
                        onClick={() => openMonthReview()}
                        disabled={isProcessing}
                      >
                        {isClosed ? (
                          <><Eye className="w-3 h-3 mr-1" />View all</>
                        ) : (
                          <><Pencil className="w-3 h-3 mr-1" />Edit all</>
                        )}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      {/* Close Period Dialog */}
      <AlertDialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />Close month?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Transactions for {monthLabel} will be locked and you won't be able to edit categories. You can reopen the month if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (period && onClosePeriod) onClosePeriod(period.id); setShowCloseDialog(false); }}>
              <Lock className="w-4 h-4 mr-2" />Close month
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reopen Period Dialog */}
      <AlertDialog open={showReopenDialog} onOpenChange={setShowReopenDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Unlock className="w-5 h-5" />Reopen month?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will allow you to upload more files and edit transaction categories for {monthLabel}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (period && onReopenPeriod) onReopenPeriod(period.id); setShowReopenDialog(false); }}>
              <Unlock className="w-4 h-4 mr-2" />Reopen month
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Account Select Dialog */}
      <AccountSelectDialog
        open={showAccountDialog}
        onOpenChange={(open) => { setShowAccountDialog(open); if (!open) setPendingFiles([]); }}
        onConfirm={handleAccountConfirm}
        fileName={pendingFiles.length === 1 ? pendingFiles[0].name : undefined}
      />

      {/* Review Modal */}
      <MonthReviewModal
        open={showReviewModal}
        onOpenChange={setShowReviewModal}
        monthKey={monthKey}
        monthLabel={reviewTitle || monthLabel}
        isLocked={isClosed}
        importId={reviewImportId}
      />
    </div>
  );
}
