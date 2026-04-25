import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Sparkles } from "lucide-react";

interface ComingSoonProps {
  title: string;
  subtitle?: string;
}

/**
 * Generic placeholder for routes that exist in navigation
 * but are not yet implemented. Keeps the layout chrome consistent
 * with the rest of the dashboard surface.
 */
export default function ComingSoon({ title, subtitle }: ComingSoonProps) {
  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-12 flex flex-col items-center justify-center text-center min-h-[60vh]">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
          <Sparkles className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Coming soon</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-md">
          We're polishing this experience. It will land in an upcoming release.
        </p>
      </div>
    </DashboardLayout>
  );
}