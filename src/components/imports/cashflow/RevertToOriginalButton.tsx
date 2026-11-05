import { RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
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
import { getFieldLabel, formatAuditValue } from "./helpers";

export interface RevertToOriginalButtonProps {
  original: Record<string, unknown>;
  fields: string[];
  current: Record<string, unknown>;
  formatCurrency: (n: number) => string;
  getCategoryLabel: (slug: string) => string;
  getMovementLabel: (m: string) => string;
  onConfirm: () => void;
}

export function RevertToOriginalButton({
  original,
  fields,
  current,
  formatCurrency,
  getCategoryLabel,
  getMovementLabel,
  onConfirm,
}: RevertToOriginalButtonProps) {
  const { t } = useTranslation("common");
  // Hide overlapping field labels (category + category_id collapse to "Category")
  const seen = new Set<string>();
  const uniqueFields = fields.filter((f) => {
    const label = getFieldLabel(f, t);
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
          title={t("imports.restoreTooltip")}
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-primary" />
            {t("imports.restoreTitle")}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {t("imports.restoreDescriptionTx")}
              </p>
              <div className="rounded-md border border-border bg-muted/30 p-3 space-y-1.5">
                {uniqueFields.map((f) => (
                  <div
                    key={f}
                    className="text-xs text-foreground flex items-baseline gap-1.5 flex-wrap"
                  >
                    <span className="text-muted-foreground font-medium">
                      {getFieldLabel(f, t)}:
                    </span>
                    <span className="line-through text-muted-foreground/70">
                      {formatAuditValue(f, current[f], formatCurrency, getCategoryLabel, getMovementLabel, t)}
                    </span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-medium text-primary">
                      {formatAuditValue(f, original[f], formatCurrency, getCategoryLabel, getMovementLabel, t)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            {t("imports.restoreOriginal")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
