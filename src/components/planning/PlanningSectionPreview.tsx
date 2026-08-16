import { Bell } from "lucide-react";

export interface PlanningSectionPreviewProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  previewItems: { label: string; amount: string; date: string }[];
  comingSoonNote: string;
}

/** Shared "coming soon" blurred-preview card, used by Planning's Planned/Budgets tabs. */
export function PlanningSectionPreview({
  icon,
  title,
  subtitle,
  previewItems,
  comingSoonNote,
}: PlanningSectionPreviewProps) {
  return (
    <section className="bg-card rounded-xl p-6 border border-border shadow-section">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <h2 className="text-base md:text-lg font-semibold text-foreground leading-tight">
            {title}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
      </div>

      <div className="border border-dashed border-border rounded-xl overflow-hidden">
        {/* Preview rows — blurred to hint at the future UI */}
        <div className="relative">
          <div className="divide-y divide-border/50 opacity-40 blur-[1px] select-none pointer-events-none">
            {previewItems.map((item) => (
              <div key={item.label} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.date}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold tabular-nums text-foreground">{item.amount}</span>
              </div>
            ))}
          </div>

          {/* Overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/80 backdrop-blur-[2px]">
            <div className="flex items-center gap-2 text-primary mb-2">
              <Bell className="w-4 h-4" />
              <span className="text-sm font-semibold">Coming soon</span>
            </div>
            <p className="text-xs text-muted-foreground text-center max-w-xs leading-relaxed px-4">
              {comingSoonNote}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
