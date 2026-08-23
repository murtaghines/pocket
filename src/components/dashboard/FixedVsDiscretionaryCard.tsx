import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocalization } from "@/hooks/useLocalization";
import { EmptyState } from "@/components/ui/empty-state";
import { getCategoryLabel, categoryColors } from "@/lib/categoryTranslations";
import type { CategoryAmount, EssentialSplit } from "@/lib/analytics";

interface FixedVsDiscretionaryCardProps {
  split: EssentialSplit;
}

/** Resolve a category slug to its brand `hsl(var(--category-*))` string (falls back to grey). */
function categoryDotColor(slug: string): string {
  const varName = categoryColors[slug];
  return varName ? `hsl(var(--${varName}))` : "hsl(var(--muted-foreground))";
}

type Bucket = "essential" | "discretionary";

/**
 * Splits the month's expenses into essential vs optional spending. The headline is a single
 * capsule bar showing the proportion; the per-category breakdown stays hidden until the user taps
 * one side, so the card reads clean at a glance. Essential = muted, optional = warning (yellow).
 */
export function FixedVsDiscretionaryCard({ split }: FixedVsDiscretionaryCardProps) {
  const { t } = useTranslation("dashboard");
  const { formatCurrency } = useLocalization();
  const [open, setOpen] = useState<Bucket | null>(null);

  const hasData = split.total > 0;
  const essentialPct = hasData ? Math.round((split.essential / split.total) * 100) : 0;
  const discretionaryPct = hasData ? 100 - essentialPct : 0;

  const toggle = (b: Bucket) => setOpen((cur) => (cur === b ? null : b));

  const openCategories =
    open === "essential" ? split.essentialCategories : open === "discretionary" ? split.discretionaryCategories : [];

  return (
    <div className="bg-card rounded-xl p-[20px_22px_18px] shadow-section">
      <div className="mb-4 min-w-0">
        <p className="text-[15px] font-heading font-semibold text-foreground">{t("insights.essential.title")}</p>
        {hasData && (
          <p className="text-[12px] text-muted-foreground mt-0.5">{t("insights.essential.tapHint")}</p>
        )}
      </div>

      {!hasData ? (
        <EmptyState height="h-[140px]" />
      ) : (
        <>
          {/* Capsule proportion bar — two tappable segments inside an outlined pill */}
          <div className="p-[3px] rounded-full bg-muted/40 ring-1 ring-border/70">
            <div className="flex h-8 rounded-full overflow-hidden">
              <BarSegment
                pct={essentialPct}
                onClick={() => toggle("essential")}
                active={open === "essential"}
                className="bg-muted-foreground/40 text-foreground"
                label={t("insights.essential.essential")}
              />
              <BarSegment
                pct={discretionaryPct}
                onClick={() => toggle("discretionary")}
                active={open === "discretionary"}
                className="bg-warning text-warning-foreground"
                label={t("insights.essential.discretionary")}
              />
            </div>
          </div>

          {/* Two summary toggles — dot + label + amount, tap to reveal that bucket's categories */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <BucketToggle
              label={t("insights.essential.essential")}
              amount={split.essential}
              pct={essentialPct}
              dotClass="bg-muted-foreground/40"
              open={open === "essential"}
              onClick={() => toggle("essential")}
              formatCurrency={formatCurrency}
            />
            <BucketToggle
              label={t("insights.essential.discretionary")}
              amount={split.discretionary}
              pct={discretionaryPct}
              dotClass="bg-warning"
              open={open === "discretionary"}
              onClick={() => toggle("discretionary")}
              formatCurrency={formatCurrency}
            />
          </div>

          {open && (
            <ul className="mt-3 space-y-1.5 border-t border-border/60 pt-3">
              {openCategories.map((c) => (
                <CategoryRow key={c.slug} category={c} formatCurrency={formatCurrency} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

interface BarSegmentProps {
  pct: number;
  onClick: () => void;
  active: boolean;
  className: string;
  label: string;
}

/** One coloured slice of the capsule bar; shows its % inline when wide enough to fit. */
function BarSegment({ pct, onClick, active, className, label }: BarSegmentProps) {
  if (pct <= 0) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={`${label} ${pct}%`}
      style={{ width: `${pct}%` }}
      className={`h-full flex items-center justify-center text-[11px] font-semibold tabular-nums transition-opacity hover:opacity-90 ${
        active ? "" : "opacity-95"
      } ${className}`}
    >
      {pct >= 12 && `${pct}%`}
    </button>
  );
}

interface BucketToggleProps {
  label: string;
  amount: number;
  pct: number;
  dotClass: string;
  open: boolean;
  onClick: () => void;
  formatCurrency: (n: number) => string;
}

/** Summary row for one bucket: a button that expands the category list below. */
function BucketToggle({ label, amount, pct, dotClass, open, onClick, formatCurrency }: BucketToggleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      className={`flex flex-col items-start rounded-xl border px-3 py-2 text-left transition-colors ${
        open ? "border-border bg-muted/40" : "border-transparent bg-muted/20 hover:bg-muted/40"
      }`}
    >
      <div className="flex w-full items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`} />
        <span className="text-[12px] font-medium text-foreground">{label}</span>
        <span className="text-[11px] text-muted-foreground tabular-nums">· {pct}%</span>
        <ChevronDown
          className={`ml-auto h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </div>
      <div className="text-[14px] md:text-[17px] font-semibold tabular-nums text-foreground mt-1">{formatCurrency(amount)}</div>
    </button>
  );
}

/** One category line inside an expanded bucket: colour dot + label + amount. */
function CategoryRow({
  category,
  formatCurrency,
}: {
  category: CategoryAmount;
  formatCurrency: (n: number) => string;
}) {
  return (
    <li className="flex items-center gap-2 text-[13px]">
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: categoryDotColor(category.slug) }}
      />
      <span className="text-muted-foreground truncate">{getCategoryLabel(category.slug)}</span>
      <span className="ml-auto text-foreground tabular-nums">{formatCurrency(category.amount)}</span>
    </li>
  );
}
