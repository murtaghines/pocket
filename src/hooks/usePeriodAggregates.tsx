import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Database } from "@/integrations/supabase/types";
import type { EssentialSplit, WeeklyPoint, DailyOfWeekPoint, MonthOfYearPoint, Granularity } from "@/lib/analytics";
import { coefficientOfVariation } from "@/lib/analytics";
import { categoryColors as categoryColorVars } from "@/lib/categoryTranslations";
import { useCategoryTranslations } from "@/hooks/useCategoryTranslations";
import type { Category } from "@/lib/mockData";

type AppDomain = Database["public"]["Enums"]["app_domain"];

function getCategoryHslColor(slug: string): string {
  const varName = categoryColorVars[slug];
  if (!varName) return "hsl(220, 10%, 55%)";
  if (typeof window !== "undefined") {
    const value = getComputedStyle(document.documentElement).getPropertyValue(`--${varName}`).trim();
    if (value) return `hsl(${value})`;
  }
  return "hsl(220, 10%, 55%)";
}

export interface DailyTotal {
  day: string;
  income: number;
  expenses: number;
  txCount: number;
}

export interface CategoryBreakdownPoint {
  name: string;
  value: number;
  category: Category;
  color: string;
  previousValue?: number;
}

export interface TopExpenseRow {
  id: string;
  description: string;
  date: string;
  amount: number;
  category: string;
}

export type CurrencyConvert = (n: number, currency: string) => number;

interface UsePeriodAggregatesArgs {
  domain?: AppDomain;
  startDate?: string;
  endDate?: string;
  prevStartDate?: string;
  prevEndDate?: string;
  granularity: Granularity;
  convert?: CurrencyConvert;
  periodMonth?: string | null;
  periodWeek?: string | null;
  periodYear?: number | null;
}

export interface PeriodAggregates {
  dailyTotals: DailyTotal[];
  expenseCategoryData: CategoryBreakdownPoint[];
  incomeCategoryData: CategoryBreakdownPoint[];
  topExpenses: TopExpenseRow[];
  essentialSplit: EssentialSplit;
  subBreakdown: WeeklyPoint[] | DailyOfWeekPoint[] | MonthOfYearPoint[];
  transfersIn: number;
  transfersOut: number;
  transfersNet: number;
  volatility: number;
  volatilityLevel: "steady" | "moderate" | "erratic";
  isLoading: boolean;
}

interface DashboardAggregatesResponse {
  daily_totals: Array<{ day: string; currency: string; income: number; expenses: number; tx_count: number }>;
  expense_categories: Array<{ category: string; currency: string; total: number; tx_count: number }>;
  income_categories: Array<{ category: string; currency: string; total: number; tx_count: number }>;
  prev_expense_categories: Array<{ category: string; currency: string; total: number }>;
  top_expenses: Array<{ id: string; description: string; date: string; amount: number; category: string; currency: string }>;
  essential_split: Array<{ category: string; kind: string; currency: string; total: number }>;
  transfer_totals: Array<{ currency: string; transfers_out: number; transfers_in: number }>;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function buildSubBreakdown(
  dailyTotals: DailyTotal[],
  granularity: Granularity,
  startDate: string,
): WeeklyPoint[] | DailyOfWeekPoint[] | MonthOfYearPoint[] {
  if (granularity === "week") {
    const buckets: Record<number, { spend: number; income: number }> = {};
    for (let i = 0; i < 7; i++) buckets[i] = { spend: 0, income: 0 };
    for (const d of dailyTotals) {
      const idx = (new Date(d.day + "T00:00:00").getDay() + 6) % 7;
      buckets[idx].spend += d.expenses;
      buckets[idx].income += d.income;
    }
    return Array.from({ length: 7 }, (_, i): DailyOfWeekPoint => ({
      dayIndex: i,
      spend: round2(buckets[i].spend),
      income: round2(buckets[i].income),
      net: round2(buckets[i].income - buckets[i].spend),
    }));
  }

  if (granularity === "year") {
    const buckets: Record<number, { spend: number; income: number }> = {};
    for (let m = 1; m <= 12; m++) buckets[m] = { spend: 0, income: 0 };
    for (const d of dailyTotals) {
      const m = Number(d.day.slice(5, 7));
      if (m >= 1 && m <= 12) {
        buckets[m].spend += d.expenses;
        buckets[m].income += d.income;
      }
    }
    return Array.from({ length: 12 }, (_, i): MonthOfYearPoint => {
      const m = i + 1;
      return {
        monthIndex: m,
        spend: round2(buckets[m].spend),
        income: round2(buckets[m].income),
        net: round2(buckets[m].income - buckets[m].spend),
      };
    });
  }

  // month: group by week-of-month
  const [y, mo] = startDate.split("-").map(Number);
  const daysInMonth = new Date(y, mo, 0).getDate();
  const weeks = Math.ceil(daysInMonth / 7);
  const buckets: Record<number, { spend: number; income: number }> = {};
  for (let w = 1; w <= weeks; w++) buckets[w] = { spend: 0, income: 0 };
  for (const d of dailyTotals) {
    const dayNum = Number(d.day.slice(8, 10));
    const w = Math.min(Math.ceil(dayNum / 7), weeks);
    buckets[w].spend += d.expenses;
    buckets[w].income += d.income;
  }
  return Object.entries(buckets).map(([w, b]): WeeklyPoint => ({
    week: Number(w),
    spend: round2(b.spend),
    income: round2(b.income),
    net: round2(b.income - b.spend),
  }));
}

function buildEssentialSplit(
  rows: Array<{ category: string; kind: string; currency: string; total: number }>,
  convert: CurrencyConvert,
): EssentialSplit {
  let essential = 0;
  let discretionary = 0;
  const essentialMap = new Map<string, number>();
  const discretionaryMap = new Map<string, number>();

  for (const r of rows) {
    const amt = round2(convert(Number(r.total), r.currency));
    if (r.kind === "essential") {
      essential += amt;
      essentialMap.set(r.category, (essentialMap.get(r.category) ?? 0) + amt);
    } else {
      discretionary += amt;
      discretionaryMap.set(r.category, (discretionaryMap.get(r.category) ?? 0) + amt);
    }
  }

  const essentialCats = Array.from(essentialMap, ([slug, amount]) => ({ slug, amount }))
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const discretionaryCats = Array.from(discretionaryMap, ([slug, amount]) => ({ slug, amount }))
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const total = round2(essential + discretionary);

  return {
    essential: round2(essential),
    discretionary: round2(discretionary),
    total,
    discretionaryPct: total > 0 ? Math.round((discretionary / total) * 100) : 0,
    essentialCategories: essentialCats,
    discretionaryCategories: discretionaryCats,
  };
}

function buildCategoryBreakdown(
  rows: Array<{ category: string; currency: string; total: number }>,
  convert: CurrencyConvert,
  getCategoryLabel: (slug: string) => string,
): CategoryBreakdownPoint[] {
  const byCat = new Map<string, number>();
  for (const r of rows) {
    byCat.set(r.category, (byCat.get(r.category) ?? 0) + round2(convert(Number(r.total), r.currency)));
  }
  return Array.from(byCat, ([category, value]) => ({
    name: getCategoryLabel(category),
    value,
    category: category as Category,
    color: getCategoryHslColor(category),
  })).sort((a, b) => b.value - a.value);
}

export function usePeriodAggregates({
  domain = "CASHFLOW",
  startDate,
  endDate,
  prevStartDate,
  prevEndDate,
  granularity,
  convert: convertFn,
  periodMonth,
  periodWeek,
  periodYear,
}: UsePeriodAggregatesArgs): PeriodAggregates {
  const { user } = useAuth();
  const { getCategoryLabel } = useCategoryTranslations();

  const enabled = !!user && !!startDate && !!endDate;

  const { data: agg, isLoading } = useQuery({
    queryKey: ["dashboard-aggregates", user?.id, domain, startDate, endDate, prevStartDate, prevEndDate, periodMonth, periodWeek, periodYear],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_dashboard_aggregates" as any, {
        p_user_id: user!.id,
        p_domain: domain,
        p_start_date: startDate!,
        p_end_date: endDate!,
        p_prev_start: prevStartDate ?? null,
        p_prev_end: prevEndDate ?? null,
        p_month: periodMonth ?? null,
        p_week: periodWeek ?? null,
        p_year: periodYear ?? null,
      });
      if (error) throw error;
      return data as unknown as DashboardAggregatesResponse;
    },
    enabled,
    staleTime: 30_000,
  });

  const cvt: CurrencyConvert = convertFn ?? ((_n: number, _c: string) => _n);

  // Aggregate per-currency daily_totals into single-currency rows
  const dailyTotals: DailyTotal[] = (() => {
    const byDay = new Map<string, DailyTotal>();
    for (const r of agg?.daily_totals ?? []) {
      const currency = r.currency || "EUR";
      const existing = byDay.get(r.day);
      if (existing) {
        existing.income += cvt(Number(r.income), currency);
        existing.expenses += cvt(Number(r.expenses), currency);
        existing.txCount += Number(r.tx_count);
      } else {
        byDay.set(r.day, {
          day: r.day,
          income: cvt(Number(r.income), currency),
          expenses: cvt(Number(r.expenses), currency),
          txCount: Number(r.tx_count),
        });
      }
    }
    return Array.from(byDay.values()).sort((a, b) => a.day.localeCompare(b.day));
  })();

  // Aggregate previous-period categories across currencies
  const prevByCat: Record<string, number> = {};
  for (const r of agg?.prev_expense_categories ?? []) {
    const currency = r.currency || "EUR";
    prevByCat[r.category] = (prevByCat[r.category] ?? 0) + cvt(Number(r.total), currency);
  }

  const expenseCategoryData = buildCategoryBreakdown(agg?.expense_categories ?? [], cvt, getCategoryLabel).map((d) => ({
    ...d,
    previousValue: round2(prevByCat[d.category] ?? 0),
  }));
  const incomeCategoryData = buildCategoryBreakdown(agg?.income_categories ?? [], cvt, getCategoryLabel);
  const essentialSplit = buildEssentialSplit(agg?.essential_split ?? [], cvt);
  const subBreakdown = startDate
    ? buildSubBreakdown(dailyTotals, granularity, startDate)
    : [];

  // top_expenses: convert each individual transaction
  const topExpenses = (agg?.top_expenses ?? []).map((r) => ({
    ...r,
    amount: round2(cvt(Number(r.amount), r.currency || "EUR")),
  }));

  // transfer_totals: aggregate per-currency rows
  let transfersIn = 0;
  let transfersOut = 0;
  const ttRows = agg?.transfer_totals ?? [];
  if (Array.isArray(ttRows)) {
    for (const r of ttRows) {
      const currency = r.currency || "EUR";
      transfersIn += cvt(Number(r.transfers_in), currency);
      transfersOut += cvt(Number(r.transfers_out), currency);
    }
  }
  transfersIn = round2(transfersIn);
  transfersOut = round2(transfersOut);
  const transfersNet = round2(transfersIn - transfersOut);

  const spendPoints = granularity === "month"
    ? dailyTotals.map((d) => d.expenses)
    : (subBreakdown as any[]).map((p: any) => p.spend);
  const volatility = coefficientOfVariation(spendPoints.filter((v: number) => v > 0));
  const volatilityLevel = volatility >= 1.2 ? "erratic" as const : volatility >= 0.7 ? "moderate" as const : "steady" as const;

  return {
    dailyTotals,
    expenseCategoryData,
    incomeCategoryData,
    topExpenses,
    essentialSplit,
    subBreakdown,
    transfersIn,
    transfersOut,
    transfersNet,
    volatility,
    volatilityLevel,
    isLoading,
  };
}
