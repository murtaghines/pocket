import { useState, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  ChevronDown, 
  ChevronRight, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  Trash2,
  Lock,
  Unlock,
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

// ── Main component ──

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
  const [isOpen, setIsOpen] = useState(false);
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
  const totalFiles = imports.length + pendingFilesCount;
  const totalTransactions = imports.reduce((sum, imp) => sum + (imp.transactions_count || 0), 0);

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
      setIsOpen(true);
    }
  };

  const getAccountName = (accountId: string | null) => {
    if (!accountId) return null;
    return accounts.find(a => a.id === accountId)?.name || null;
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
      case 'NORMALIZED': return <CheckCircle2 className="w-4 h-4 text-success" />;
      case 'PARSED':
      case 'UPLOADED': return <Loader2 className="w-4 h-4 text-warning animate-spin" />;
      case 'FAILED': return <AlertCircle className="w-4 h-4 text-destructive" />;
      default: return <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />;
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

  const isEmpty = totalFiles === 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card 
        className={cn("transition-all duration-200", isEmpty && "border-dashed", isOpen && "ring-1 ring-primary/20")}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              <div>
                <h3 className="font-medium capitalize">{monthLabel}</h3>
                {totalTransactions > 0 && (
                  <p className="text-xs text-muted-foreground">{totalTransactions} transactions</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isClosed && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Lock className="w-3 h-3" /> Closed
                </Badge>
              )}
              <Badge variant={isEmpty ? "outline" : "secondary"} className={cn(isEmpty && "text-muted-foreground border-dashed")}>
                {imports.length} file{imports.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4 space-y-3">
            {/* Processing progress */}
            {isProcessing && (
              <div className="space-y-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  <span className="text-sm font-medium text-primary">Processing files...</span>
                  <span className="text-xs text-muted-foreground ml-auto">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground">{getProcessingMessage()}</p>
              </div>
            )}

            {/* Files table */}
            {imports.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="text-xs font-medium h-8">File</TableHead>
                      <TableHead className="text-xs font-medium h-8">Account</TableHead>
                      <TableHead className="text-xs font-medium h-8 text-center w-[100px]">Transactions</TableHead>
                      <TableHead className="text-xs font-medium h-8 text-right w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {imports.map((imp) => {
                      const isStaleProcessing =
                        (imp.status === "PARSED" || imp.status === "UPLOADED") &&
                        Date.now() - new Date(imp.uploaded_at).getTime() > 5 * 60 * 1000;
                      const status = isStaleProcessing ? "FAILED" : imp.status;
                      const errorMessage = isStaleProcessing
                        ? "Processing interrupted. Please re-upload."
                        : imp.error_message;
                      const accountName = getAccountName(imp.account_id);

                      return (
                        <TableRow key={imp.id} className="group">
                          {/* File name + status */}
                          <TableCell className="py-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {getStatusIcon(status)}
                              <div className="min-w-0">
                                <p className="text-xs font-medium truncate max-w-[200px]">{imp.file_name}</p>
                                {status === "FAILED" && errorMessage && (
                                  <p className="text-xs text-destructive truncate max-w-[200px]">{errorMessage.slice(0, 50)}</p>
                                )}
                              </div>
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
                          </TableCell>

                          {/* Account selector */}
                          <TableCell className="py-2">
                            {cashAccounts.length > 0 ? (
                              <Select value={imp.account_id || ''} onValueChange={(val) => handleAccountChange(imp.id, val)}>
                                <SelectTrigger className="h-7 w-auto min-w-[100px] max-w-[150px] text-xs border-muted bg-muted/40 hover:bg-muted px-2 gap-1">
                                  <span className="truncate">{accountName || 'No account'}</span>
                                </SelectTrigger>
                                <SelectContent>
                                  {cashAccounts.map((a) => (
                                    <SelectItem key={a.id} value={a.id} className="text-xs">{a.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-xs text-muted-foreground">{accountName || '—'}</span>
                            )}
                          </TableCell>

                          {/* Transactions count */}
                          <TableCell className="py-2 text-center">
                            {status === "NORMALIZED" && imp.transactions_count ? (
                              <span className="text-xs font-medium">{imp.transactions_count}</span>
                            ) : status === "FAILED" ? (
                              <span className="text-xs text-destructive">—</span>
                            ) : (
                              <Loader2 className="w-3 h-3 animate-spin mx-auto text-muted-foreground" />
                            )}
                          </TableCell>

                          {/* Actions: Review + Delete */}
                          <TableCell className="py-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {status === "NORMALIZED" && imp.transactions_count && imp.transactions_count > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs text-primary hover:text-primary"
                                  onClick={() => openFileReview(imp)}
                                >
                                  <Eye className="w-3.5 h-3.5 mr-1" />
                                  Review
                                </Button>
                              )}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                    disabled={isDeleting}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
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
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Empty state */}
            {isEmpty && !isClosed && (
              <div className="relative border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                <input type="file" accept=".xlsx,.xls,.csv,.pdf" multiple onChange={handleFileInput} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Drag files or click to upload</p>
                <p className="text-xs text-muted-foreground mt-1">Excel, CSV or PDF</p>
              </div>
            )}

            {isEmpty && isClosed && (
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center space-y-3">
                <div className="opacity-50">
                  <Lock className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Month closed</p>
                  <p className="text-xs text-muted-foreground mt-1">Reopen to upload files</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowReopenDialog(true)} disabled={isReopeningPeriod}>
                  {isReopeningPeriod ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Unlock className="w-4 h-4 mr-2" />}
                  Reopen month
                </Button>
              </div>
            )}

            {/* Add more files button */}
            {!isEmpty && !isClosed && (
              <div className="relative">
                <input type="file" accept=".xlsx,.xls,.csv,.pdf" multiple onChange={handleFileInput} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={isProcessing} />
                <Button variant="outline" size="sm" className="w-full" disabled={isProcessing}>
                  <Upload className="w-4 h-4 mr-2" />
                  Add more files
                </Button>
              </div>
            )}

            {/* Month footer: Close/Reopen + Review all */}
            {!isEmpty && (
              <div className="flex items-center justify-between pt-3 border-t border-border/50">
                <div className="flex items-center gap-2">
                  {!isClosed && totalTransactions > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8"
                      onClick={() => openMonthReview()}
                      disabled={isProcessing}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1.5" />
                      Review all ({totalTransactions})
                    </Button>
                  )}
                  {isClosed && (
                    <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => openMonthReview()}>
                      <Eye className="w-3.5 h-3.5 mr-1.5" />
                      View transactions ({totalTransactions})
                    </Button>
                  )}
                </div>
                <div>
                  {period && !isClosed && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-8 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowCloseDialog(true)}
                      disabled={isClosingPeriod}
                    >
                      {isClosingPeriod ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      Close month
                    </Button>
                  )}
                  {period && isClosed && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-8 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowReopenDialog(true)}
                      disabled={isReopeningPeriod}
                    >
                      {isReopeningPeriod ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Unlock className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      Reopen month
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>

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
    </Collapsible>
  );
}
