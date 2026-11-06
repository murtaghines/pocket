import { useTranslation } from "react-i18next";
import { useLocalization } from "@/hooks/useLocalization";
import type { PortfolioHighlights as Highlights } from "@/hooks/usePortfolioHighlights";
import type { InvestmentInsights } from "@/hooks/useInvestmentInsights";

interface PortfolioHighlightsProps {
  highlights: Highlights;
  insights: InvestmentInsights;
  displayCurrency?: string;
}

const DIVIDEND_COLOR = "hsl(270,60%,55%)";

export function PortfolioHighlights({
  highlights,
  insights,
  displayCurrency,
}: PortfolioHighlightsProps) {
  const { t } = useTranslation("investments");
  const { formatCurrency } = useLocalization();

  const { bestPosition, worstPosition, winRate } = highlights;

  const ytdUp = highlights.ytdReturnPct == null || highlights.ytdReturnPct >= 0;
  const ytdColor = highlights.ytdReturnPct == null
    ? { dot: "bg-muted-foreground", label: "text-muted-foreground" }
    : ytdUp
      ? { dot: "bg-success", label: "text-success" }
      : { dot: "bg-destructive", label: "text-destructive" };

  const winColor = winRate.total === 0
    ? { dot: "bg-muted-foreground", label: "text-muted-foreground" }
    : winRate.pct >= 50
      ? { dot: "bg-success", label: "text-success" }
      : { dot: "bg-destructive", label: "text-destructive" };

  return (
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-5 lg:gap-[12px]">
      <HighlightCard
        dotClass={ytdColor.dot}
        labelClass={ytdColor.label}
        label={highlights.ytdReturnPct != null ? t("highlights.ytdReturn") : t("highlights.totalReturn")}
        value={
          highlights.ytdReturnPct != null
            ? `${highlights.ytdReturnPct >= 0 ? "+" : ""}${highlights.ytdReturnPct.toFixed(2)}%`
            : "—"
        }
      />

      <HighlightCard
        dotClass="bg-success"
        labelClass="text-success"
        label={t("highlights.bestPosition")}
        value={bestPosition?.ticker ?? bestPosition?.name ?? "—"}
        sub={
          bestPosition
            ? `${formatCurrency(bestPosition.pnl, displayCurrency)} (${bestPosition.pnlPct >= 0 ? "+" : ""}${bestPosition.pnlPct.toFixed(2)}%)`
            : undefined
        }
      />

      <HighlightCard
        dotClass="bg-destructive"
        labelClass="text-destructive"
        label={t("highlights.worstPosition")}
        value={worstPosition?.ticker ?? worstPosition?.name ?? "—"}
        sub={
          worstPosition
            ? `${formatCurrency(worstPosition.pnl, displayCurrency)} (${worstPosition.pnlPct.toFixed(2)}%)`
            : undefined
        }
      />

      <HighlightCard
        dotClass={winColor.dot}
        labelClass={winColor.label}
        label={t("highlights.winRate")}
        value={winRate.total > 0 ? `${winRate.pct.toFixed(0)}%` : "—"}
        sub={winRate.total > 0 ? `${winRate.wins}W / ${winRate.losses}L` : undefined}
      />

      <HighlightCard
        dotColor={DIVIDEND_COLOR}
        labelColor={DIVIDEND_COLOR}
        label={t("highlights.dividendsCollected")}
        value={
          insights.dividendCount > 0
            ? formatCurrency(insights.totalDividends, displayCurrency)
            : "—"
        }
        sub={
          insights.dividendCount > 0
            ? `${insights.dividendCount} ${t("insights.payments")}`
            : undefined
        }
      />
    </div>
  );
}

function HighlightCard({
  dotClass,
  dotColor,
  labelClass,
  labelColor,
  label,
  value,
  sub,
}: {
  dotClass?: string;
  dotColor?: string;
  labelClass?: string;
  labelColor?: string;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex h-full flex-col rounded-xl px-[14px] py-3 md:px-5 md:py-[14px] shadow-section lg:h-[94px] overflow-hidden bg-card">
      <div className="flex items-center gap-[6px] mb-[8px]">
        <span
          className={`w-[7px] h-[7px] rounded-full shrink-0 ${dotClass ?? ""}`}
          style={dotColor ? { backgroundColor: dotColor } : undefined}
        />
        <span
          className={`text-[13px] font-medium ${labelClass ?? ""}`}
          style={labelColor ? { color: labelColor } : undefined}
        >
          {label}
        </span>
      </div>
      <div className="mt-auto">
        <div className="text-[15px] md:text-[18px] font-medium tracking-[-0.025em] tabular-nums leading-none text-foreground truncate">
          {value}
        </div>
        {sub && (
          <div className="text-[12.5px] mt-[5px] text-muted-foreground tabular-nums truncate">
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}
