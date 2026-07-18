import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertCircle } from "lucide-react";
import { format } from "date-fns";

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
  const totalAmount = investments.reduce((sum, i) => sum + i.amount, 0);

  const handleConfirm = async () => {
    try {
      await onConfirm();
    } catch (error) {
      console.error("Error confirming investments:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Investment Preview</DialogTitle>
          <DialogDescription>
            Review the investments parsed from your file before confirming
          </DialogDescription>
        </DialogHeader>

        {investments.length > 0 ? (
          <div className="flex-1 overflow-auto">
            <div className="px-6 pb-4 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-sm text-muted-foreground">Total Investments</div>
                  <div className="text-2xl font-bold">{investments.length}</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-sm text-muted-foreground">Deposits</div>
                  <div className="text-2xl font-bold text-green-600">{deposits}</div>
                </div>
                <div className="bg-red-50 p-3 rounded-lg">
                  <div className="text-sm text-muted-foreground">Withdrawals</div>
                  <div className="text-2xl font-bold text-red-600">{withdrawals}</div>
                </div>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {investments.map((inv, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-sm">
                          {format(new Date(inv.date), "MMM dd")}
                        </TableCell>
                        <TableCell className="text-sm">{inv.description}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{inv.platform}</TableCell>
                        <TableCell>
                          <span
                            className={`text-xs px-2 py-1 rounded-full font-medium ${
                              inv.type === "deposit"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {inv.type}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {inv.type === "deposit" ? "+" : "-"}€{inv.amount.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <AlertCircle className="w-12 h-12 mb-3 opacity-50" />
            <p>No investments found in this file</p>
          </div>
        )}

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={onCancel} disabled={isConfirming}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isConfirming || investments.length === 0}>
            {isConfirming ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Confirming...
              </>
            ) : (
              "Confirm & Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
