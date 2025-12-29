import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { banks } from "@/lib/mockData";
import { useToast } from "@/hooks/use-toast";

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  bank?: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
}

export function UploadSection() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  }, []);

  const processFile = (file: File): UploadedFile => ({
    id: Math.random().toString(36).substr(2, 9),
    name: file.name,
    size: file.size,
    status: 'pending',
  });

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      file => file.type === 'application/pdf'
    );

    if (droppedFiles.length === 0) {
      toast({
        title: "Formato no soportado",
        description: "Por favor, sube archivos PDF únicamente.",
        variant: "destructive",
      });
      return;
    }

    const newFiles = droppedFiles.map(processFile);
    setFiles(prev => [...prev, ...newFiles]);
  }, [toast]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    const pdfFiles = Array.from(selectedFiles).filter(
      file => file.type === 'application/pdf'
    );

    if (pdfFiles.length !== selectedFiles.length) {
      toast({
        title: "Algunos archivos ignorados",
        description: "Solo se procesarán los archivos PDF.",
        variant: "destructive",
      });
    }

    const newFiles = pdfFiles.map(processFile);
    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const updateFileBank = (id: string, bank: string) => {
    setFiles(prev => prev.map(f => 
      f.id === id ? { ...f, bank } : f
    ));
  };

  const simulateProcessing = () => {
    if (files.some(f => !f.bank)) {
      toast({
        title: "Banco requerido",
        description: "Asigna un banco a todos los archivos antes de procesar.",
        variant: "destructive",
      });
      return;
    }

    setFiles(prev => prev.map(f => ({ ...f, status: 'processing' as const })));

    // Simulate processing
    setTimeout(() => {
      setFiles(prev => prev.map(f => ({ ...f, status: 'completed' as const })));
      toast({
        title: "Procesamiento completado",
        description: `Se han procesado ${files.length} archivo(s) correctamente.`,
      });
    }, 2000);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <Card className="animate-slide-up" style={{ animationDelay: '100ms' }}>
      <CardHeader>
        <CardTitle className="text-lg">Subir Extractos</CardTitle>
        <CardDescription>
          Arrastra tus extractos bancarios en PDF o haz clic para seleccionar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={cn(
            "relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200",
            isDragging 
              ? "border-primary bg-primary/10 scale-[1.02]" 
              : "border-border hover:border-primary/50 hover:bg-muted/50"
          )}
        >
          <input
            type="file"
            accept=".pdf"
            multiple
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center gap-3">
            <div className={cn(
              "p-4 rounded-full transition-colors",
              isDragging ? "bg-primary/20" : "bg-muted"
            )}>
              <Upload className={cn(
                "w-8 h-8 transition-colors",
                isDragging ? "text-primary" : "text-muted-foreground"
              )} />
            </div>
            <div>
              <p className="font-medium text-foreground">
                {isDragging ? "Suelta los archivos aquí" : "Arrastra tus PDFs aquí"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                o haz clic para seleccionar
              </p>
            </div>
          </div>
        </div>

        {files.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">
              {files.length} archivo(s) seleccionado(s)
            </p>
            
            {files.map((file) => (
              <div 
                key={file.id}
                className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border"
              >
                <div className={cn(
                  "p-2 rounded-lg",
                  file.status === 'completed' && "bg-success/20",
                  file.status === 'processing' && "bg-warning/20",
                  file.status === 'error' && "bg-destructive/20",
                  file.status === 'pending' && "bg-muted",
                )}>
                  {file.status === 'processing' ? (
                    <Loader2 className="w-5 h-5 text-warning animate-spin" />
                  ) : file.status === 'completed' ? (
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  ) : file.status === 'error' ? (
                    <AlertCircle className="w-5 h-5 text-destructive" />
                  ) : (
                    <FileText className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                </div>

                <Select 
                  value={file.bank} 
                  onValueChange={(value) => updateFileBank(file.id, value)}
                  disabled={file.status !== 'pending'}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Banco" />
                  </SelectTrigger>
                  <SelectContent>
                    {banks.map(bank => (
                      <SelectItem key={bank.id} value={bank.id}>
                        {bank.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {file.status === 'pending' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(file.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}

            <Button 
              className="w-full"
              variant="gradient"
              onClick={simulateProcessing}
              disabled={files.some(f => f.status === 'processing')}
            >
              {files.some(f => f.status === 'processing') ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Procesar {files.length} archivo(s)
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
