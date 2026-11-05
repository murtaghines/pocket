import { useTranslation } from "react-i18next";
import { useInvestments } from "@/hooks/useInvestments";
import { useLocalization } from "@/hooks/useLocalization";
import { Loader2 } from "lucide-react";
import { InvestmentsByPlatform } from "./InvestmentsByPlatform";
import { InvestmentsByAssetType } from "./InvestmentsByAssetType";
import { InvestmentsHistory } from "./InvestmentsHistory";
import { InvestmentsTable } from "./InvestmentsTable";

export function ActivityTab() {
  const { t: tc } = useTranslation("common");
  const {
    investments,
    isLoading,
    hasData,
    byPlatform,
    byAssetType,
    monthlyHistory,
  } = useInvestments();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{tc("noData")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[16px]">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
        <InvestmentsByPlatform data={byPlatform} />
        <InvestmentsByAssetType data={byAssetType} />
      </div>

      {monthlyHistory.length > 0 && <InvestmentsHistory data={monthlyHistory} />}

      <InvestmentsTable investments={investments} />
    </div>
  );
}
