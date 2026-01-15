import { useState, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { 
  ChevronDown, 
  ChevronRight, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  X,
  Trash2,
  FileCheck2,
  Lock,
  Unlock,
  Eye,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Import } from "@/hooks/useImports";
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
  onAddFiles: (files: File[], targetMonth: Date) => void;
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
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showReopenDialog, setShowReopenDialog] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const isClosed = period?.status === 'CLOSED';

  const totalFiles = imports.length + pendingFilesCount;
  const totalTransactions = imports.reduce((sum, imp) => sum + (imp.transactions_count || 0), 0);

  // Animate progress bar during processing
  useEffect(() => {
    if (isProcessing) {
      setProgress(0);
      const interval = setInterval(() => {
        setProgress((prev) => {
          // Quick start, then slow down approaching 90%
          if (prev < 30) return prev + 3;
          if (prev < 60) return prev + 2;
          if (prev < 85) return prev + 0.5;
          if (prev < 95) return prev + 0.1;
          return prev;
        });
      }, 100);
      return () => clearInterval(interval);
    } else {
      // Complete the progress bar when done
      if (progress > 0 && progress < 100) {
        setProgress(100);
        setTimeout(() => setProgress(0), 500);
      }
    }
  }, [isProcessing]);

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

    const droppedFiles = Array.from(e.dataTransfer.files).filter(isValidFile);

    if (droppedFiles.length === 0) {
      toast({
        title: "Unsupported format",
        description: "Please upload Excel (.xlsx, .xls), CSV or PDF files.",
        variant: "destructive",
      });
      return;
    }

    onAddFiles(droppedFiles, monthDate);
    setIsOpen(true);
  }, [toast, onAddFiles, monthDate]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    const validFiles = Array.from(selectedFiles).filter(isValidFile);
    onAddFiles(validFiles, monthDate);
    setIsOpen(true);
    
    e.target.value = '';
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
    });
  };

  // Map import status to UI status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NORMALIZED': return 'text-success';
      case 'PARSED': 
      case 'UPLOADED': return 'text-warning';
      case 'FAILED': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
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

  const isEmpty = totalFiles === 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card 
        className={cn(
          "transition-all duration-200",
          isEmpty && "border-dashed",
          isOpen && "ring-1 ring-primary/20"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              {isOpen ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
              <div>
                <h3 className="font-medium capitalize">{monthLabel}</h3>
                {totalTransactions > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {totalTransactions} transactions
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge 
                variant={isEmpty ? "outline" : "secondary"}
                className={cn(
                  isEmpty && "text-muted-foreground border-dashed"
                )}
              >
                {imports.length} file{imports.length !== 1 ? 's' : ''}
              </Badge>
              {/* Lock/Unlock button in top right */}
              {period && !isEmpty && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isClosed) {
                      setShowReopenDialog(true);
                    } else {
                      setShowCloseDialog(true);
                    }
                  }}
                  disabled={isClosingPeriod || isReopeningPeriod}
                >
                  {isClosingPeriod || isReopeningPeriod ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isClosed ? (
                    <Lock className="w-4 h-4 text-primary" />
                  ) : (
                    <Unlock className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
              )}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4 space-y-3">
            {/* Processing progress bar */}
            {isProcessing && (
              <div className="space-y-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  <span className="text-sm font-medium text-primary">Processing files...</span>
                  <span className="text-xs text-muted-foreground ml-auto">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Extracting transactions and categorizing automatically
                </p>
              </div>
            )}
            {/* Existing imports */}
            {imports.length > 0 && (
              <div className="space-y-2">
                {imports.map((imp) => {
                  const isStaleProcessing =
                    (imp.status === "PARSED" || imp.status === "UPLOADED") &&
                    Date.now() - new Date(imp.uploaded_at).getTime() > 5 * 60 * 1000;

                  const status = isStaleProcessing ? "FAILED" : imp.status;
                  const errorMessage = isStaleProcessing
                    ? "Processing interrupted (connection or tab closed). Please re-upload the file."
                    : imp.error_message;

                  return (
                    <div
                      key={imp.id}
                      className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg text-sm"
                    >
                      {getStatusIcon(status)}
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-xs font-medium">{imp.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                        {status === "NORMALIZED" && imp.transactions_count
                            ? `${imp.transactions_count} transactions`
                            : status === "FAILED" && errorMessage
                              ? (
                                  <span className="text-destructive truncate">
                                    {errorMessage.slice(0, 40)}...
                                  </span>
                                )
                              : `${formatDate(imp.uploaded_at)} • ${formatFileSize(imp.file_size)}`}
                        </p>
                      </div>

                      {/* Error details hover card for FAILED imports */}
                      {status === "FAILED" && errorMessage && (
                        <HoverCard>
                          <HoverCardTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                            >
                              <Info className="w-3.5 h-3.5" />
                            </Button>
                          </HoverCardTrigger>
                          <HoverCardContent className="w-80" align="end">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-destructive" />
                                <h4 className="text-sm font-semibold">Processing error</h4>
                              </div>
                              <p className="text-xs text-muted-foreground">{errorMessage}</p>
                              <div className="pt-2 border-t">
                                <p className="text-xs text-muted-foreground">
                                  <strong>Tip:</strong> If it's a scanned PDF,
                                  try converting it to CSV or Excel before uploading.
                                </p>
                              </div>
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                      )}

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            disabled={isDeleting}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete file?</AlertDialogTitle>
                            <AlertDialogDescription>
                              All transactions associated with "{imp.file_name}" will be deleted.
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onDeleteImport(imp.id)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Empty state / Upload area */}
            {isEmpty && (
              <div 
                className="relative border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors"
              >
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.pdf"
                  multiple
                  onChange={handleFileInput}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Drag files or click to upload
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Excel, CSV o PDF
                </p>
              </div>
            )}


            {/* Add more files button - when OPEN */}
            {!isEmpty && !isClosed && (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv,.pdf"
                    multiple
                    onChange={handleFileInput}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isProcessing}
                  />
                  <Button variant="outline" size="sm" className="w-full" disabled={isProcessing}>
                    <Upload className="w-4 h-4 mr-2" />
                    Add more files
                  </Button>
                </div>
                <Button 
                  variant="gradient" 
                  size="sm"
                  onClick={() => setShowReviewModal(true)}
                  disabled={isProcessing}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Review
                </Button>
              </div>
            )}

            {/* When CLOSED - only view */}
            {!isEmpty && isClosed && (
              <Button 
                variant="outline" 
                size="sm"
                className="w-full"
                onClick={() => setShowReviewModal(true)}
              >
                <Eye className="w-4 h-4 mr-2" />
                View transactions
              </Button>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>

      {/* Close Period Dialog */}
      <AlertDialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Close month?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Transactions for {monthLabel} will be locked and you won't be able to edit categories. You can reopen the month if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (period && onClosePeriod) {
                  onClosePeriod(period.id);
                }
                setShowCloseDialog(false);
              }}
            >
              <Lock className="w-4 h-4 mr-2" />
              Close month
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reopen Period Dialog */}
      <AlertDialog open={showReopenDialog} onOpenChange={setShowReopenDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Unlock className="w-5 h-5" />
              Reopen month?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will allow you to upload more files and edit transaction categories for {monthLabel}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (period && onReopenPeriod) {
                  onReopenPeriod(period.id);
                }
                setShowReopenDialog(false);
              }}
            >
              <Unlock className="w-4 h-4 mr-2" />
              Reopen month
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Review Modal */}
      <MonthReviewModal
        open={showReviewModal}
        onOpenChange={setShowReviewModal}
        monthKey={monthKey}
        monthLabel={monthLabel}
        isLocked={isClosed}
      />
    </Collapsible>
  );
}
