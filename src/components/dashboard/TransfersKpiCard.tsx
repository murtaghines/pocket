import { useTranslation } from "react-i18next";

interface TransfersKpiCardProps {
  transfersIn: number;
  transfersOut: number;
  formatCurrency: (n: number) => string;
  formatNumber: (n: number, opts?: Intl.NumberFormatOptions) => string;
}

export function TransfersKpiCard({
  transfersIn,
  transfersOut,
  formatCurrency,
  formatNumber,
}: TransfersKpiCardProps) {
  const { t } = useTranslation("dashboard");

  const net = transfersIn - transfersOut;
  const sign = net > 0 ? "+" : "";
  const formattedNet = net === 0 ? formatCurrency(0) : `${sign}${formatCurrency(net)}`;

  const fmtBare = (n: number) =>
    formatNumber(n, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="flex h-full flex-col rounded-xl bg-card px-[14px] py-3 md:px-5 md:py-[14px] shadow-section lg:h-[104px] overflow-hidden">
      <div className="flex items-center gap-[6px]">
        <span className="w-[7px] h-[7px] rounded-full shrink-0 bg-muted-foreground" />
        <span className="text-[13px] font-medium text-muted-foreground">
          {t("stats.transfers")}
        </span>
      </div>

      <div className="text-[18px] md:text-[22px] font-medium tracking-[-0.025em] tabular-nums leading-none text-foreground mt-auto">
        {formattedNet}
      </div>

      <div className="flex items-center gap-[10px] mt-[6px] text-[12.5px] tabular-nums">
        <span
          className="inline-flex items-center gap-[3px]"
          title={t("stats.transfersIn")}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            role="img"
            aria-label={t("stats.transfersInLabel")}
          >
            <path d="M12 5v14" />
            <path d="m19 12-7 7-7-7" />
          </svg>
          <span className="font-semibold text-muted-foreground">
            {fmtBare(transfersIn)}
          </span>
        </span>
        <span
          className="inline-flex items-center gap-[3px]"
          title={t("stats.transfersOut")}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            role="img"
            aria-label={t("stats.transfersOutLabel")}
          >
            <path d="M12 19V5" />
            <path d="m5 12 7-7 7 7" />
          </svg>
          <span className="font-semibold text-muted-foreground">
            {fmtBare(transfersOut)}
          </span>
        </span>
      </div>
    </div>
  );
}
