import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface FABOption {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}

interface MobileUploadFABProps {
  options: FABOption[];
}

export function MobileUploadFAB({ options }: MobileUploadFABProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener("pointerdown", close, { once: true });
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  if (options.length === 0) return null;

  return (
    <>
      {/* Backdrop overlay — dims & blurs everything behind the FAB pills */}
      <div
        className={cn(
          "fixed inset-0 z-[29] bg-black/40 backdrop-blur-[2px] transition-opacity duration-200 md:hidden",
          open ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onPointerDown={() => setOpen(false)}
      />

      <div className="fixed bottom-6 right-5 z-30 flex flex-col items-end gap-3 md:hidden safe-area-bottom">
        {/* Option pills */}
        {options.map((opt, i) => (
          <button
            key={i}
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => {
              setOpen(false);
              opt.onClick();
            }}
            className={cn(
              "flex items-center gap-2.5 rounded-full bg-primary/10 pl-4 pr-5 py-2.5 shadow-lg text-[13px] font-medium text-foreground transition-all duration-200",
              open
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-3 pointer-events-none",
            )}
            style={{ transitionDelay: open ? `${(options.length - 1 - i) * 40}ms` : "0ms" }}
          >
            {opt.icon}
            {opt.label}
          </button>
        ))}

        {/* FAB button */}
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg transition-transform duration-200",
            open && "rotate-45",
          )}
          aria-label={open ? "Close" : "Add"}
        >
          <Plus className="w-6 h-6" strokeWidth={2.5} />
        </button>
      </div>
    </>
  );
}
