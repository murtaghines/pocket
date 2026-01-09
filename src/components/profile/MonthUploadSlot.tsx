import { useState, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Upload as UploadType } from "@/hooks/useUploads";
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
  uploads: UploadType[];
  onAddFiles: (files: File[], targetMonth: Date) => void;
  onProcessFiles: (targetMonth: Date) => Promise<void>;
  onDeleteUpload: (uploadId: string) => void;
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
  uploads,
  onAddFiles,
  onProcessFiles,
  onDeleteUpload,
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

  const totalFiles = uploads.length + pendingFilesCount;
  const totalTransactions = uploads.reduce((sum, u) => sum + (u.transactions_count || 0), 0);

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
        title: "Formato no soportado",
        description: "Por favor, sube archivos Excel (.xlsx, .xls), CSV o PDF.",
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
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-success';
      case 'processing': return 'text-warning';
      case 'error':
      case 'failed': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-success" />;
      case 'processing': return <Loader2 className="w-4 h-4 text-warning animate-spin" />;
      case 'error':
      case 'failed': return <AlertCircle className="w-4 h-4 text-destructive" />;
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
                    {totalTransactions} transacciones
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isProcessing && (
                <Badge variant="secondary" className="bg-warning/10 text-warning">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Procesando
                </Badge>
              )}
              <Badge 
                variant={isEmpty ? "outline" : "secondary"}
                className={cn(
                  isEmpty && "text-muted-foreground border-dashed"
                )}
              >
                {uploads.length} archivo{uploads.length !== 1 ? 's' : ''}
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
                  <span className="text-sm font-medium text-primary">Procesando archivos...</span>
                  <span className="text-xs text-muted-foreground ml-auto">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Extrayendo transacciones y categorizando automáticamente
                </p>
              </div>
            )}
            {/* Existing uploads */}
            {uploads.length > 0 && (
              <div className="space-y-2">
                {uploads.map((upload) => (
                  <div 
                    key={upload.id}
                    className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg text-sm"
                  >
                    {getStatusIcon(upload.status)}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-xs font-medium">{upload.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {upload.status === 'completed' && upload.transactions_count 
                          ? `${upload.transactions_count} transacciones`
                          : (upload.status === 'error' || upload.status === 'failed') && upload.error_message
                          ? upload.error_message
                          : `${formatDate(upload.created_at)} • ${formatFileSize(upload.file_size)}`
                        }
                      </p>
                    </div>
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
                          <AlertDialogTitle>¿Eliminar archivo?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Se eliminarán todas las transacciones asociadas a "{upload.file_name}". Esta acción no se puede deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onDeleteUpload(upload.id)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
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
                  Arrastra archivos o haz clic para subir
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
                    Agregar más archivos
                  </Button>
                </div>
                <Button 
                  variant="gradient" 
                  size="sm"
                  onClick={() => setShowReviewModal(true)}
                  disabled={isProcessing}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Revisar
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
                Ver transacciones
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
              ¿Cerrar el mes?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Las transacciones de {monthLabel} quedarán bloqueadas y no podrás editar las categorías. Podrás reabrir el mes si lo necesitas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (period && onClosePeriod) {
                  onClosePeriod(period.id);
                }
                setShowCloseDialog(false);
              }}
            >
              <Lock className="w-4 h-4 mr-2" />
              Cerrar mes
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
              ¿Reabrir el mes?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esto te permitirá subir más archivos y editar las categorías de las transacciones de {monthLabel}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (period && onReopenPeriod) {
                  onReopenPeriod(period.id);
                }
                setShowReopenDialog(false);
              }}
            >
              <Unlock className="w-4 h-4 mr-2" />
              Reabrir mes
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
