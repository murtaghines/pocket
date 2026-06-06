import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Sparkles, CalendarClock, PiggyBank } from "lucide-react";

/**
 * Single Planning page that groups both upcoming sections
 * (Planned payments and Budgets) in one scrollable view.
 */
export default function Planning() {
  return (
    <DashboardLayout>
      {/* Mobile-only header — desktop renders title in the sticky top bar */}
      <div className="mb-6 md:hidden">
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground leading-tight">
          Planning
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Plan upcoming payments and set budgets per category
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <Section
          icon={<CalendarClock className="w-5 h-5" />}
          title="Planned payments"
          subtitle="Schedule and track upcoming expenses"
        />
        <Section
          icon={<PiggyBank className="w-5 h-5" />}
          title="Budgets"
          subtitle="Set spending limits per category"
        />
      </div>
    </DashboardLayout>
  );
}

function Section({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <section
      className="bg-card rounded-lg border border-border p-6"
      style={{ boxShadow: "var(--shadow-section)" }}
    >
      <div className="flex items-start gap-3 mb-4">
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

      <div className="flex flex-col items-center justify-center text-center py-10 border border-dashed border-border rounded-lg">
        <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
          <Sparkles className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">Coming soon</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          We're polishing this experience. It will land in an upcoming release.
        </p>
      </div>
    </section>
  );
}
