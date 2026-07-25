import { useTranslation } from "react-i18next";
import { Scale } from "lucide-react";
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

/** How many categories to list per bucket before collapsing the rest into "+N more". */
const MAX_ROWS = 4;

/**
 * Splits the month's expenses into essential vs discretionary spending. Beyond the headline share,
 * it lists the actual categories composing each bucket (with their brand colors) so the user can see
 * exactly which spending is counted where. Essential = muted, discretionary = warning (yellow).
 */
export function FixedVsDiscretionaryCard({ split }: FixedVsDiscretionaryCardProps) {
  const { t } = useTranslation("dashboard");
  const { formatCurrency } = useLocalization();

  const hasData = split.total > 0;
  const essentialPct = hasData ? Math.round((split.essential / split.total) * 100) : 0;
  const discretionaryPct = hasData ? 100 - essentialPct : 0;

  return (
    <div className="bg-card rounded-2xl p-[20px_22px_18px] shadow-bento">
      <div className="flex items-start justify-between mb-4">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-foreground flex items-center gap-2">
            <Scale className="w-4 h-4 text-primary" strokeWidth={2} />
            {t("insights.essential.title")}
          </p>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {t("insights.essential.explainer")}
          </p>
        </div>
        {hasData && (
          <span className="text-[13px] font-semibold text-warning-foreground bg-warning/90 rounded-full px-2.5 py-1 whitespace-nowrap shrink-0">
            {t("insights.essential.discretionaryShare", { pct: split.discretionaryPct })}
          </span>
        )}
      </div>

      {!hasData ? (
        <EmptyState height="h-[140px]" />
      ) : (
        <>
          {/* Stacked proportion bar with the two percentages inline */}
          <div className="flex w-full h-2.5 rounded-full overflow-hidden bg-muted/40">
            <div
              className="h-full bg-muted-foreground/45"
              style={{ width: `${essentialPct}%` }}
              aria-label={t("insights.essential.essential")}
            />
            <div
              className="h-full bg-warning"
              style={{ width: `${discretionaryPct}%` }}
              aria-label={t("insights.essential.discretionary")}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-1">
            <BucketColumn
              label={t("insights.essential.essential")}
              caption={t("insights.essential.essentialHint")}
              amount={split.essential}
              pct={essentialPct}
              dotClass="bg-muted-foreground/45"
              categories={split.essentialCategories}
              formatCurrency={formatCurrency}
              moreLabel={t}
            />
            <BucketColumn
              label={t("insights.essential.discretionary")}
              caption={t("insights.essential.discretionaryHint")}
              amount={split.discretionary}
              pct={discretionaryPct}
              dotClass="bg-warning"
              categories={split.discretionaryCategories}
              formatCurrency={formatCurrency}
              moreLabel={t}
            />
          </div>
        </>
      )}
    </div>
  );
}

interface BucketColumnProps {
  label: string;
  caption: string;
  amount: number;
  pct: number;
  dotClass: string;
  categories: CategoryAmount[];
  formatCurrency: (n: number) => string;
  moreLabel: ReturnType<typeof useTranslation>["t"];
}

/** One side of the split: header amount + the categories that compose it, largest first. */
function BucketColumn({
  label,
  caption,
  amount,
  pct,
  dotClass,
  categories,
  formatCurrency,
  moreLabel: t,
}: BucketColumnProps) {
  const shown = categories.slice(0, MAX_ROWS);
  const rest = categories.slice(MAX_ROWS);
  const restAmount = rest.reduce((s, c) => s + c.amount, 0);

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`} />
        <span className="text-[12px] font-medium text-foreground">{label}</span>
        <span className="text-[11px] text-muted-foreground tabular-nums">· {pct}%</span>
      </div>
      <div className="text-[17px] font-semibold tabular-nums text-foreground mt-0.5">
        {formatCurrency(amount)}
      </div>
      <p className="text-[11px] text-muted-foreground mt-0.5 mb-2">{caption}</p>

      <ul className="space-y-1">
        {shown.map((c) => (
          <li key={c.slug} className="flex items-center gap-1.5 text-[12px]">
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: categoryDotColor(c.slug) }}
            />
            <span className="text-muted-foreground truncate">{getCategoryLabel(c.slug)}</span>
            <span className="ml-auto text-foreground tabular-nums">{formatCurrency(c.amount)}</span>
          </li>
        ))}
        {rest.length > 0 && (
          <li className="flex items-center gap-1.5 text-[12px]">
            <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-muted-foreground/30" />
            <span className="text-muted-foreground truncate">
              {t("insights.essential.moreCategories", { count: rest.length })}
            </span>
            <span className="ml-auto text-muted-foreground tabular-nums">
              {formatCurrency(restAmount)}
            </span>
          </li>
        )}
      </ul>
    </div>
  );
}
