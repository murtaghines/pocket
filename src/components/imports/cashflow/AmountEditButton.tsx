import { useState } from "react";
import { Split as SplitIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
  const [splitN, setSplitN] = useState(2);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          title="Split between people"
        >
          <SplitIcon className="w-3.5 h-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="end">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <SplitIcon className="w-3 h-3" />
              Split between N people
            </label>
            <Input
              type="number"
              min={1}
              step={1}
              value={splitN}
              onChange={(e) => setSplitN(Math.max(1, parseInt(e.target.value) || 1))}
              className="h-8 mt-1"
            />
            <div className="text-xs text-muted-foreground mt-2">
              Original: <span className="tabular-nums">{formatCurrency(Math.abs(originalAmount))}</span>
            </div>
            <div className="text-sm font-medium">
              Your share:{" "}
              <span className="tabular-nums">
                {formatCurrency(Math.abs(originalAmount) / splitN)}
              </span>
            </div>
            <Button
              size="sm"
              className="w-full h-8 mt-2"
              onClick={() => {
                onApplySplit(splitN);
                setOpen(false);
              }}
            >
              Apply ÷ {splitN}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
