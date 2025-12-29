import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, X, CheckCircle2, Loader2 } from "lucide-react";
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

export function UploadCard() {
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

    setTimeout(() => {
      setFiles(prev => prev.map(f => ({ ...f, status: 'completed' as const })));
      toast({
        title: "Procesamiento completado",
        description: `Se han procesado ${files.length} archivo(s) correctamente.`,
      });
    }, 2000);
  };

  if (files.length === 0) {
    return (
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
              isDragging 
                ? "border-primary bg-primary/10 scale-[1.02]" 
                : "border-border hover:border-primary/50 hover:bg-muted/50 group-hover:border-primary/50"
            )}
          >
            <input
              type="file"
              accept=".pdf"
              multiple
              onChange={handleFileInput}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className={cn(
              "p-3 rounded-full transition-colors",
              isDragging ? "bg-primary/20" : "bg-muted group-hover:bg-primary/10"
            )}>
              <Upload className={cn(
                "w-6 h-6 transition-colors",
                isDragging ? "text-primary" : "text-muted-foreground group-hover:text-primary"
              )} />
            </div>
            <div className="text-center">
              <p className="font-medium text-sm">
                {isDragging ? "Suelta aquí" : "Subir Extractos"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Arrastra PDFs o haz clic
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-slide-up" style={{ animationDelay: '300ms' }}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">{files.length} archivo(s)</p>
          <Button 
            size="sm"
            variant="gradient"
            onClick={simulateProcessing}
            disabled={files.some(f => f.status === 'processing')}
          >
            {files.some(f => f.status === 'processing') ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            Procesar
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
              ) : (
                <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              )}
              
              <span className="flex-1 truncate text-xs">{file.name}</span>

              <Select 
                value={file.bank} 
                onValueChange={(value) => updateFileBank(file.id, value)}
                disabled={file.status !== 'pending'}
              >
                <SelectTrigger className="w-[100px] h-7 text-xs">
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
                  className="h-6 w-6"
                  onClick={() => removeFile(file.id)}
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
