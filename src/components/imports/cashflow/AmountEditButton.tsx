import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface AmountEditButtonProps {
  originalAmount: number;
  formatCurrency: (n: number) => string;
  onChangeAmount: (raw: string) => void;
  onApplySplit: (n: number) => void;
  disabled?: boolean;
}

export function AmountEditButton({
  originalAmount,
  formatCurrency,
  onChangeAmount,
  onApplySplit,
  disabled,
}: AmountEditButtonProps) {
  const [open, setOpen] = useState(false);
  const [rawValue, setRawValue] = useState("");

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setRawValue(String(Math.abs(originalAmount)).replace(".", ","));
    }
    setOpen(isOpen);
  };

  const handleApply = () => {
    if (rawValue.trim()) {
      onChangeAmount(rawValue);
    }
    setOpen(false);
  };

  const handleDivide = (n: number) => {
    onApplySplit(n);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="end">
        <div className="space-y-3">
          <Input
            type="text"
            inputMode="decimal"
            value={rawValue}
            onChange={(e) => setRawValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleApply(); }}
            placeholder="0,00"
            className="h-9 text-sm tabular-nums font-semibold"
            autoFocus
          />
          <div className="flex items-center gap-1.5">
            {[2, 3, 4].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => handleDivide(n)}
                className={cn(
                  "flex-1 rounded-md py-1.5 text-xs font-medium tabular-nums transition-colors",
                  "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                &divide; {n}
              </button>
            ))}
          </div>
          <Button size="sm" className="w-full h-8" onClick={handleApply}>
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
