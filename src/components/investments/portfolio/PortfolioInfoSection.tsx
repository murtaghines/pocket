import { useTranslation } from "react-i18next";
import { useLocalization } from "@/hooks/useLocalization";
import {
  Layers,
  CalendarDays,
  CalendarCheck,
  Activity,
} from "lucide-react";
import type { PortfolioInfo } from "@/hooks/usePortfolioHighlights";

interface PortfolioInfoSectionProps {
  info: PortfolioInfo;
}

export function PortfolioInfoSection({ info }: PortfolioInfoSectionProps) {
  const { t } = useTranslation("investments");
  const { formatDate } = useLocalization();

  if (info.totalMovements === 0) return null;

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-muted-foreground mb-2">
        {t("highlights.information")}
      </p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-[16px]">
        <InfoCard
          label={t("highlights.assetsTraded")}
          value={
            info.assetsTraded > 0
              ? t("highlights.assetsCount", { count: info.assetsTraded })
              : "—"
          }
          icon={<Layers className="w-[15px] h-[15px]" />}
        />
        <InfoCard
          label={t("highlights.firstOperation")}
          value={info.firstOperation ? formatDate(info.firstOperation) : "—"}
          icon={<CalendarDays className="w-[15px] h-[15px]" />}
        />
        <InfoCard
          label={t("highlights.lastOperation")}
          value={info.lastOperation ? formatDate(info.lastOperation) : "—"}
          icon={<CalendarCheck className="w-[15px] h-[15px]" />}
        />
        <InfoCard
          label={t("highlights.totalMovements")}
          value={
            info.totalMovements > 0
              ? t("highlights.movementsCount", { count: info.totalMovements })
              : "—"
          }
          icon={<Activity className="w-[15px] h-[15px]" />}
        />
      </div>
    </div>
  );
}

function InfoCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl p-[18px_18px_16px] bg-card border border-border shadow-section">
      <div className="flex items-center justify-between mb-[14px]">
        <span className="text-[11px] font-semibold uppercase tracking-[.04em] text-muted-foreground">
          {label}
        </span>
        <div className="flex items-center justify-center w-[30px] h-[30px] rounded-[9px] shrink-0 bg-primary/10 text-primary">
          {icon}
        </div>
      </div>
      <div className="text-[15px] md:text-[20px] font-semibold tracking-[-0.02em] tabular-nums leading-none truncate text-foreground">
        {value}
      </div>
    </div>
  );
}
