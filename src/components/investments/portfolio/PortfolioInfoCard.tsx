import { useTranslation } from "react-i18next";
import { useLocalization } from "@/hooks/useLocalization";
import type { PortfolioInfo } from "@/hooks/usePortfolioHighlights";
import type { InvestmentInsights } from "@/hooks/useInvestmentInsights";

interface PortfolioInfoCardProps {
  info: PortfolioInfo;
  insights: InvestmentInsights;
  displayCurrency?: string;
}

function formatDate(iso: string | null, lang: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString(lang, { day: "numeric", month: "short", year: "numeric" });
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-sm font-semibold tabular-nums text-foreground truncate">
        {value}
      </span>
    </div>
  );
}

export function PortfolioInfoCard({
  info,
  insights,
  displayCurrency,
}: PortfolioInfoCardProps) {
  const { t, i18n } = useTranslation("investments");
  const { formatCurrency } = useLocalization();

  return (
    <div className="rounded-xl bg-card shadow-section overflow-hidden h-full flex flex-col">
      <div className="px-5 pt-4 pb-2 shrink-0">
        <h3 className="text-sm font-semibold text-foreground">
          {t("highlights.information")}
        </h3>
      </div>
      <div className="flex-1 min-h-0 px-5 pb-4 grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 content-center">
        <StatCell
          label={t("highlights.assetsTraded")}
          value={t("highlights.assetsCount", { count: info.assetsTraded })}
        />
        <StatCell
          label={t("highlights.totalMovements")}
          value={t("highlights.movementsCount", { count: info.totalMovements })}
        />
        <StatCell
          label={t("highlights.firstOperation")}
          value={formatDate(info.firstOperation, i18n.language)}
        />
        <StatCell
          label={t("highlights.lastOperation")}
          value={formatDate(info.lastOperation, i18n.language)}
        />
        {insights.totalFees > 0 && (
          <StatCell
            label={t("insights.totalFees")}
            value={formatCurrency(insights.totalFees, displayCurrency)}
          />
        )}
        {(insights.totalBuyVolume > 0 || insights.totalSellVolume > 0) && (
          <StatCell
            label={t("highlights.buyVolume")}
            value={formatCurrency(insights.totalBuyVolume, displayCurrency)}
          />
        )}
      </div>
    </div>
  );
}
