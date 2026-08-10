import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface PreviewInvestment {
  date: string;
  description: string;
  amount: number;
  type: "deposit" | "withdrawal";
  platform: string;
  asset_type: string | null;
}

interface InvestmentPreviewDialogProps {
  isOpen: boolean;
  investments: PreviewInvestment[];
  isConfirming?: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export function InvestmentPreviewDialog({
  isOpen,
  investments,
  isConfirming = false,
  onConfirm,
  onCancel,
}: InvestmentPreviewDialogProps) {
  const deposits = investments.filter((i) => i.type === "deposit").length;
  const withdrawals = investments.filter((i) => i.type === "withdrawal").length;

  const handleConfirm = async () => {
    try {
      await onConfirm();
    } catch (error) {
      console.error("Error confirming investments:", error);
    }
  };

  if (!isOpen) return null;

  const panel = (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col bg-background transition-transform duration-300 ease-out",
        isOpen ? "translate-y-0" : "translate-y-full",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border">
        <button
          type="button"
          onClick={onCancel}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-accent"
        >
          <X className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-foreground">
          Investment Preview
        </span>
        <div className="w-9" />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {investments.length > 0 ? (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-muted p-3 text-center">
                <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  Total
                </div>
                <div className="text-xl font-bold tabular-nums mt-1">
                  {investments.length}
                </div>
              </div>
              <div className="rounded-xl bg-muted p-3 text-center">
                <div className="text-[11px] font-medium text-success uppercase tracking-wide">
                  Deposits
                </div>
                <div className="text-xl font-bold tabular-nums text-success mt-1">
                  {deposits}
                </div>
              </div>
              <div className="rounded-xl bg-muted p-3 text-center">
                <div className="text-[11px] font-medium text-destructive uppercase tracking-wide">
                  Withdrawals
                </div>
                <div className="text-xl font-bold tabular-nums text-destructive mt-1">
                  {withdrawals}
                </div>
              </div>
            </div>

            {/* Transaction list */}
            <div className="space-y-1.5">
              {investments.map((inv, idx) => (
                <div
                  key={idx}
                  className="rounded-xl bg-muted p-3 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {inv.description}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        {format(new Date(inv.date), "MMM dd")}
                      </span>
                      {inv.platform && (
                        <span className="text-[11px] text-muted-foreground">
                          {inv.platform}
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "text-sm font-semibold tabular-nums shrink-0",
                      inv.type === "deposit" ? "text-success" : "text-destructive",
                    )}
                  >
                    {inv.type === "deposit" ? "+" : "-"}${inv.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <AlertCircle className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm">No investments found in this file</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 pb-6 pt-3 bg-background space-y-2">
        <Button
          className="w-full h-12 rounded-xl"
          onClick={handleConfirm}
          disabled={isConfirming || investments.length === 0}
        >
          {isConfirming ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Confirming...
            </>
          ) : (
            "Confirm & Save"
          )}
        </Button>
        <Button
          variant="ghost"
          className="w-full h-10 rounded-xl text-muted-foreground"
          onClick={onCancel}
          disabled={isConfirming}
        >
          Cancel
        </Button>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}
