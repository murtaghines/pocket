import { cn } from "@/lib/utils";
import { ACCOUNT_COLOR_PALETTE } from "@/lib/accountColors";

interface AccountColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export function AccountColorPicker({ value, onChange }: AccountColorPickerProps) {
  return (
    <div className="space-y-2.5 rounded-xl bg-muted p-4">
      {[ACCOUNT_COLOR_PALETTE.blues, ACCOUNT_COLOR_PALETTE.yellows].map((row, i) => (
        <div key={i} className="flex flex-wrap gap-2">
          {row.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange(c)}
              className={cn(
                "h-8 w-8 rounded-full transition-transform hover:scale-110",
                value.toLowerCase() === c.toLowerCase() && "ring-2 ring-primary ring-offset-2",
              )}
              style={{ backgroundColor: c }}
              aria-label={c}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
