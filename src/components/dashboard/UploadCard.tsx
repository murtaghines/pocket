import { useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, X, CheckCircle2, Loader2, AlertCircle, PiggyBank } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useFileUpload } from "@/hooks/useFileUpload";
import { TransactionPreviewModal } from "@/components/dashboard/TransactionPreviewModal";

const ACCEPTED_EXTENSIONS = ['.xlsx', '.xls', '.csv', '.pdf'];
const ACCEPTED_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'application/pdf'
];

interface UploadCardProps {
  isInvestment?: boolean;
}

export function UploadCard({ isInvestment = false }: UploadCardProps) {
  const { 
    files, 
    addFiles, 
    removeFile, 
    processFiles, 
    isProcessing, 
    hasPending,
    previewData,
    updatePreviewCategory,
    confirmPreviewTransactions,
    cancelPreview,
    isConfirming,
  } = useFileUpload(isInvestment);
  const { toast } = useToast();

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

    addFiles(droppedFiles);
  }, [toast, addFiles]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    const validFiles = Array.from(selectedFiles).filter(isValidFile);
    addFiles(validFiles);
    
    // Reset input
    e.target.value = '';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const Icon = isInvestment ? PiggyBank : Upload;
  const title = isInvestment ? "Subir Extractos de Inversión" : "Subir Extractos";
  const subtitle = "Excel, CSV o PDF";

  if (files.length === 0) {
    return (
      <>
        <Card 
          className="animate-slide-up h-full cursor-pointer group"
          style={{ animationDelay: '300ms' }}
        >
          <CardContent className="p-0 h-full">
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={cn(
                "relative h-full min-h-[180px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 transition-all duration-200",
                "border-border hover:border-primary/50 hover:bg-muted/50 group-hover:border-primary/50"
              )}
            >
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.pdf"
                multiple
                onChange={handleFileInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className={cn(
                "p-3 rounded-full transition-colors bg-muted group-hover:bg-primary/10",
                isInvestment && "group-hover:bg-purple-500/10"
              )}>
                <Icon className={cn(
                  "w-6 h-6 text-muted-foreground group-hover:text-primary",
                  isInvestment && "group-hover:text-purple-500"
                )} />
              </div>
              <div className="text-center">
                <p className="font-medium text-sm">{title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {subtitle}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview Modal - can be shown even with no files if previewData exists */}
        <TransactionPreviewModal
          open={!!previewData}
          onOpenChange={(open) => !open && cancelPreview()}
          previewData={previewData}
          onConfirm={confirmPreviewTransactions}
          onUpdateCategory={updatePreviewCategory}
          isConfirming={isConfirming}
        />
      </>
    );
  }

  return (
    <>
      <Card className="animate-slide-up" style={{ animationDelay: '300ms' }}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{files.length} archivo(s)</p>
            <Button 
              size="sm"
              variant="gradient"
              onClick={processFiles}
              disabled={isProcessing || !hasPending}
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {isProcessing ? "Procesando..." : "Procesar con IA"}
            </Button>
          </div>
          
          <div className="space-y-2 max-h-[120px] overflow-y-auto">
            {files.map((file) => (
              <div 
                key={file.id}
                className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg text-sm"
              >
                {file.status === 'processing' ? (
                  <Loader2 className="w-4 h-4 text-warning animate-spin flex-shrink-0" />
                ) : file.status === 'completed' ? (
                  <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                ) : file.status === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                ) : (
                  <FileSpreadsheet className="w-4 h-4 text-primary flex-shrink-0" />
                )}
                
                <div className="flex-1 min-w-0">
                  <p className="truncate text-xs font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {file.status === 'completed' && file.transactionsCount 
                      ? `${file.transactionsCount} ${isInvestment ? 'movimientos' : 'transacciones'}`
                      : file.status === 'error' && file.error
                      ? file.error
                      : formatFileSize(file.size)
                    }
                  </p>
                </div>

                {file.status === 'pending' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => removeFile(file.id)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          
          {/* Add more files button */}
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
        </CardContent>
      </Card>

      {/* Preview Modal */}
      <TransactionPreviewModal
        open={!!previewData}
        onOpenChange={(open) => !open && cancelPreview()}
        previewData={previewData}
        onConfirm={confirmPreviewTransactions}
        onUpdateCategory={updatePreviewCategory}
        isConfirming={isConfirming}
      />
    </>
  );
}
