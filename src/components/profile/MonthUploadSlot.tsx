import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Trash2
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
  onProcessFiles: (targetMonth: Date) => void;
  onDeleteUpload: (uploadId: string) => void;
  isProcessing: boolean;
  hasPendingFiles: boolean;
  pendingFilesCount: number;
  isDeleting: boolean;
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
}: MonthUploadSlotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const totalFiles = uploads.length + pendingFilesCount;
  const totalTransactions = uploads.reduce((sum, u) => sum + (u.transactions_count || 0), 0);

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
      case 'error': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-success" />;
      case 'processing': return <Loader2 className="w-4 h-4 text-warning animate-spin" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-destructive" />;
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
              {hasPendingFiles && (
                <Badge variant="secondary" className="bg-warning/10 text-warning">
                  {pendingFilesCount} pendiente{pendingFilesCount > 1 ? 's' : ''}
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
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4 space-y-3">
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
                          : upload.status === 'error' && upload.error_message
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

            {/* Process button when there are pending files */}
            {hasPendingFiles && (
              <Button 
                onClick={() => onProcessFiles(monthDate)}
                disabled={isProcessing}
                className="w-full"
                variant="gradient"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Procesar {pendingFilesCount} archivo{pendingFilesCount > 1 ? 's' : ''} con IA
                  </>
                )}
              </Button>
            )}

            {/* Add more files button */}
            {!isEmpty && !hasPendingFiles && (
              <div className="relative">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.pdf"
                  multiple
                  onChange={handleFileInput}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Button variant="outline" size="sm" className="w-full">
                  <Upload className="w-4 h-4 mr-2" />
                  Agregar más archivos
                </Button>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
