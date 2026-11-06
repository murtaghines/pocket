import { useTranslation } from "react-i18next";
import { useLocalization } from "@/hooks/useLocalization";
import type { PortfolioInfo } from "@/hooks/usePortfolioHighlights";

interface PortfolioInfoSectionProps {
  info: PortfolioInfo;
}

export function PortfolioInfoSection({ info }: PortfolioInfoSectionProps) {
  const { t } = useTranslation("investments");
  const { formatDate } = useLocalization();

  if (info.totalMovements === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[12.5px] text-muted-foreground">
      {info.assetsTraded > 0 && (
        <span>
          {t("highlights.assetsTraded")}: <span className="font-medium text-foreground/80">{t("highlights.assetsCount", { count: info.assetsTraded })}</span>
        </span>
      )}
      {info.firstOperation && (
        <span>
          {t("highlights.firstOperation")}: <span className="font-medium text-foreground/80">{formatDate(info.firstOperation)}</span>
        </span>
      )}
      {info.lastOperation && (
        <span>
          {t("highlights.lastOperation")}: <span className="font-medium text-foreground/80">{formatDate(info.lastOperation)}</span>
        </span>
      )}
      {info.totalMovements > 0 && (
        <span>
          {t("highlights.totalMovements")}: <span className="font-medium text-foreground/80">{t("highlights.movementsCount", { count: info.totalMovements })}</span>
        </span>
      )}
    </div>
  );
}
