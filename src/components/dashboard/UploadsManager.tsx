import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { useUploads, Upload } from "@/hooks/useUploads";
import { FileText, Trash2, Loader2, ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalization } from "@/hooks/useLocalization";

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function UploadItem({ upload, onDelete, isDeleting, formatDate }: { 
  upload: Upload; 
  onDelete: (id: string) => void;
  isDeleting: boolean;
  formatDate: (d: string) => string;
}) {
  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-600",
    processing: "bg-blue-500/20 text-blue-600",
    completed: "bg-green-500/20 text-green-600",
    failed: "bg-red-500/20 text-red-600",
  };

  const statusLabels: Record<string, string> = {
    pending: "Pending",
    processing: "Processing",
    completed: "Completed",
    failed: "Failed",
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{upload.file_name}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatDate(upload.created_at)}</span>
            <span>•</span>
            <span>{formatFileSize(upload.file_size)}</span>
            {upload.transactions_count !== null && upload.transactions_count > 0 && (
              <>
                <span>•</span>
                <span>{upload.transactions_count} transactions</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Badge variant="secondary" className={statusColors[upload.status]}>
          {statusLabels[upload.status] || upload.status}
        </Badge>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete file?</AlertDialogTitle>
              <AlertDialogDescription>
                "{upload.file_name}" and all its associated transactions
                ({upload.transactions_count || 0}) will be deleted. This action cannot be undone.
                <br /><br />
                <strong>Note:</strong> After deletion, data integrity will be verified
                to detect duplicates and transfers between accounts.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDelete(upload.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function MonthGroup({ 
  monthKey, 
  label, 
  uploads, 
  onDelete, 
  isDeleting,
  formatDate,
}: { 
  monthKey: string;
  label: string;
  uploads: Upload[];
  onDelete: (id: string) => void;
  isDeleting: boolean;
  formatDate: (d: string) => string;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="space-y-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full text-left p-2 rounded-lg hover:bg-muted transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
        <span className="font-medium capitalize">{label}</span>
        <Badge variant="outline" className="ml-auto">
          {uploads.length} file{uploads.length !== 1 ? "s" : ""}
        </Badge>
      </button>

      {isExpanded && (
        <div className="space-y-2 pl-6">
          {uploads.map((upload) => (
            <UploadItem
              key={upload.id}
              upload={upload}
              onDelete={onDelete}
              isDeleting={isDeleting}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function UploadsManager() {
  const { uploads, uploadsByMonth, isLoading, deleteUpload, isDeleting } = useUploads();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { formatDate } = useLocalization();
  const [isCheckingIntegrity, setIsCheckingIntegrity] = useState(false);

  const runIntegrityCheck = async () => {
    if (!user) return;

    setIsCheckingIntegrity(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "check-data-integrity",
        { body: { userId: user.id } }
      );

      if (error) throw error;

      const stats = data.stats;
      let message = "Verification completed.";
      
      if (stats.duplicatesRemoved > 0 || stats.transfersLinked > 0) {
        message = `${stats.duplicatesRemoved} duplicates removed, ${stats.transfersLinked} transfers linked.`;
      }

      toast({
        title: "Integrity verified",
        description: message,
      });

      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Could not verify integrity",
        variant: "destructive",
      });
    } finally {
      setIsCheckingIntegrity(false);
    }
  };

  const sortedMonthKeys = Object.keys(uploadsByMonth).sort((a, b) => b.localeCompare(a));

  return (
    <Card className="">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Uploaded Files</CardTitle>
            <CardDescription>
              Manage your uploaded files and their transactions
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={runIntegrityCheck}
            disabled={isCheckingIntegrity || uploads.length === 0}
          >
            {isCheckingIntegrity ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Verify integrity
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : uploads.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>You haven't uploaded any files yet</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {sortedMonthKeys.map((monthKey) => (
                <MonthGroup
                  key={monthKey}
                  monthKey={monthKey}
                  label={uploadsByMonth[monthKey].label}
                  uploads={uploadsByMonth[monthKey].uploads}
                  onDelete={deleteUpload}
                  isDeleting={isDeleting}
                  formatDate={formatDate}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
