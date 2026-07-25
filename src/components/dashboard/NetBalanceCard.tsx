import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Wallet, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface NetBalanceCardProps {
  balance: number;
  previousBalance?: number;
  sentToInvest: number;
  monthKey: string | null;
  formatCurrency: (n: number) => string;
}

/**
 * The filled brand-blue "hero" balance card. Net balance (= income − expenses) with its
 * month-over-month trend on the left, and how much was moved to investment this month
 * tucked into a right-hand annex (informational — it doesn't change the net balance).
 */
export function NetBalanceCard({
  balance,
  previousBalance,
  sentToInvest,
  monthKey,
  formatCurrency,
}: NetBalanceCardProps) {
  const { t, i18n } = useTranslation("dashboard");

  const change =
    previousBalance !== undefined && previousBalance !== 0
      ? Math.round(((balance - previousBalance) / Math.abs(previousBalance)) * 100)
      : undefined;
  const isUp = change !== undefined && change > 0;
  const isDown = change !== undefined && change < 0;

  const prevMonthLabel = useMemo(() => {
    if (!monthKey) return "last month";
    const [y, m] = monthKey.split("-").map(Number);
    const prev = new Date(y, m - 2, 1);
    return new Intl.DateTimeFormat(i18n.language || "en", { month: "short" }).format(prev);
  }, [monthKey, i18n.language]);

  // On the filled card a good change is green; a bad one just softens (no red on blue).
  const deltaColor = change === undefined || !isUp ? "text-primary-foreground/82" : "text-success";

  return (
    <div
      className="flex items-stretch gap-3 rounded-2xl bg-primary p-[18px] text-primary-foreground"
      style={{ boxShadow: "var(--shadow-glow)" }}
    >
      {/* Balance */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mb-[14px] flex items-center justify-between">
          <span className="text-[12px] font-semibold uppercase tracking-[.04em] text-primary-foreground/78">
            {t("stats.netBalance")}
          </span>
          <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-white/[0.18]">
            <Wallet className="h-[17px] w-[17px]" strokeWidth={2.2} />
          </div>
        </div>
        <div className="text-[20px] font-semibold tabular-nums leading-none tracking-[-0.02em]">
          {formatCurrency(balance)}
        </div>
        <div className="mt-[5px] text-[12px] text-primary-foreground/82">
          {change !== undefined ? (
            <>
              <span className={cn("font-semibold", deltaColor)}>
                {isUp ? "▲" : isDown ? "▼" : "–"} {Math.abs(change)}%
              </span>{" "}
              vs {prevMonthLabel}
            </>
          ) : (
            <span className="opacity-70">–</span>
          )}
        </div>
      </div>

      {/* Sent-to-invest annex */}
      <div className="flex max-w-[42%] shrink-0 flex-col justify-center border-l border-white/20 pl-3">
        <ArrowRight className="mb-1.5 h-4 w-4 text-primary-foreground/60" strokeWidth={2.4} />
        <span className="text-[10px] font-semibold uppercase leading-tight tracking-[.04em] text-primary-foreground/78">
          {t("stats.sentToInvest")}
        </span>
        <span className="mt-0.5 text-[15px] font-semibold tabular-nums leading-none">
          {formatCurrency(sentToInvest)}
        </span>
      </div>
    </div>
  );
}
