import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { FIELD_LABELS, formatAuditValue } from "./helpers";

export interface RevertToOriginalButtonProps {
  original: Record<string, unknown>;
  fields: string[];
  current: Record<string, unknown>;
  formatCurrency: (n: number) => string;
  getCategoryLabel: (slug: string) => string;
  onConfirm: () => void;
}

export function RevertToOriginalButton({
  original,
  fields,
  current,
  formatCurrency,
  getCategoryLabel,
  onConfirm,
}: RevertToOriginalButtonProps) {
  // Hide overlapping field labels (category + category_id collapse to "Category")
  const seen = new Set<string>();
  const uniqueFields = fields.filter((f) => {
    const label = FIELD_LABELS[f] || f;
    if (seen.has(label)) return false;
    seen.add(label);
    return true;
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 mx-auto text-primary hover:text-primary hover:bg-primary/10"
          title="Restore this row to its original imported values"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-primary" />
            Restore original values?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                This will discard all your manual edits and bring this transaction
                back to the values it had when it was first imported.
              </p>
              <div className="rounded-md border border-border bg-muted/30 p-3 space-y-1.5">
                {uniqueFields.map((f) => (
                  <div
                    key={f}
                    className="text-xs text-foreground flex items-baseline gap-1.5 flex-wrap"
                  >
                    <span className="text-muted-foreground font-medium">
                      {FIELD_LABELS[f] || f}:
                    </span>
                    <span className="line-through text-muted-foreground/70">
                      {formatAuditValue(f, current[f], formatCurrency, getCategoryLabel)}
                    </span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-medium text-primary">
                      {formatAuditValue(f, original[f], formatCurrency, getCategoryLabel)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Restore original
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

