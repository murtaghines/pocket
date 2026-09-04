import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Database } from "@/integrations/supabase/types";
import type { EssentialSplit, WeeklyPoint, DailyOfWeekPoint, MonthOfYearPoint, Granularity } from "@/lib/analytics";
import { coefficientOfVariation } from "@/lib/analytics";
import { getCategoryLabel, categoryColors as categoryColorVars } from "@/lib/categoryTranslations";
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

interface UsePeriodAggregatesArgs {
  domain?: AppDomain;
  startDate?: string;
  endDate?: string;
  prevStartDate?: string;
  prevEndDate?: string;
  granularity: Granularity;
  convert?: (n: number) => number;
}

export interface PeriodAggregates {
  dailyTotals: DailyTotal[];
  expenseCategoryData: CategoryBreakdownPoint[];
  incomeCategoryData: CategoryBreakdownPoint[];
  topExpenses: TopExpenseRow[];
  essentialSplit: EssentialSplit;
  subBreakdown: WeeklyPoint[] | DailyOfWeekPoint[] | MonthOfYearPoint[];
  volatility: number;
  volatilityLevel: "steady" | "moderate" | "erratic";
  isLoading: boolean;
}

interface DashboardAggregatesResponse {
  daily_totals: Array<{ day: string; income: number; expenses: number; tx_count: number }>;
  expense_categories: Array<{ category: string; total: number; tx_count: number }>;
  income_categories: Array<{ category: string; total: number; tx_count: number }>;
  prev_expense_categories: Array<{ category: string; total: number }>;
  top_expenses: Array<{ id: string; description: string; date: string; amount: number; category: string }>;
  essential_split: Array<{ category: string; kind: string; total: number }>;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function buildSubBreakdown(
  dailyTotals: DailyTotal[],
  granularity: Granularity,
  startDate: string,
  convert: (n: number) => number,
): WeeklyPoint[] | DailyOfWeekPoint[] | MonthOfYearPoint[] {
  if (granularity === "week") {
    const buckets: Record<number, { spend: number; income: number }> = {};
    for (let i = 0; i < 7; i++) buckets[i] = { spend: 0, income: 0 };
    for (const d of dailyTotals) {
      const idx = (new Date(d.day + "T00:00:00").getDay() + 6) % 7;
      buckets[idx].spend += convert(d.expenses);
      buckets[idx].income += convert(d.income);
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
        buckets[m].spend += convert(d.expenses);
        buckets[m].income += convert(d.income);
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
    buckets[w].spend += convert(d.expenses);
    buckets[w].income += convert(d.income);
  }
  return Object.entries(buckets).map(([w, b]): WeeklyPoint => ({
    week: Number(w),
    spend: round2(b.spend),
    income: round2(b.income),
    net: round2(b.income - b.spend),
  }));
}

function buildEssentialSplit(
  rows: Array<{ category: string; kind: string; total: number }>,
  convert: (n: number) => number,
): EssentialSplit {
  let essential = 0;
  let discretionary = 0;
  const essentialCats: Array<{ slug: string; amount: number }> = [];
  const discretionaryCats: Array<{ slug: string; amount: number }> = [];

  for (const r of rows) {
    const amt = round2(convert(Number(r.total)));
    if (r.kind === "essential") {
      essential += amt;
      essentialCats.push({ slug: r.category, amount: amt });
    } else {
      discretionary += amt;
      discretionaryCats.push({ slug: r.category, amount: amt });
    }
  }

  essentialCats.sort((a, b) => b.amount - a.amount);
  discretionaryCats.sort((a, b) => b.amount - a.amount);
  const total = round2(essential + discretionary);

  return {
    essential: round2(essential),
    discretionary: round2(discretionary),
    total,
    discretionaryPct: total > 0 ? Math.round((discretionary / total) * 100) : 0,
    essentialCategories: essentialCats.filter((c) => c.amount > 0),
    discretionaryCategories: discretionaryCats.filter((c) => c.amount > 0),
  };
}

function buildCategoryBreakdown(
  rows: Array<{ category: string; total: number }>,
  convert: (n: number) => number,
): CategoryBreakdownPoint[] {
  return rows.map((r) => ({
    name: getCategoryLabel(r.category),
    value: round2(convert(Number(r.total))),
    category: r.category as Category,
    color: getCategoryHslColor(r.category),
  }));
}

export function usePeriodAggregates({
  domain = "CASHFLOW",
  startDate,
  endDate,
  prevStartDate,
  prevEndDate,
  granularity,
  convert: convertFn,
}: UsePeriodAggregatesArgs): PeriodAggregates {
  const { user } = useAuth();

  const enabled = !!user && !!startDate && !!endDate;

  const { data: agg, isLoading } = useQuery({
    queryKey: ["dashboard-aggregates", user?.id, domain, startDate, endDate, prevStartDate, prevEndDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_dashboard_aggregates" as any, {
        p_user_id: user!.id,
        p_domain: domain,
        p_start_date: startDate!,
        p_end_date: endDate!,
        p_prev_start: prevStartDate ?? null,
        p_prev_end: prevEndDate ?? null,
      });
      if (error) throw error;
      return data as unknown as DashboardAggregatesResponse;
    },
    enabled,
    staleTime: 30_000,
  });

  const cvt = convertFn ?? ((n: number) => n);

  const dailyTotals: DailyTotal[] = (agg?.daily_totals ?? []).map((r) => ({
    day: r.day,
    income: Number(r.income),
    expenses: Number(r.expenses),
    txCount: Number(r.tx_count),
  }));

  const prevByCat: Record<string, number> = {};
  for (const r of agg?.prev_expense_categories ?? []) {
    prevByCat[r.category] = Number(r.total);
  }

  const expenseCategoryData = buildCategoryBreakdown(agg?.expense_categories ?? [], cvt).map((d) => ({
    ...d,
    previousValue: round2(cvt(prevByCat[d.category] ?? 0)),
  }));
  const incomeCategoryData = buildCategoryBreakdown(agg?.income_categories ?? [], cvt);
  const essentialSplit = buildEssentialSplit(agg?.essential_split ?? [], cvt);
  const subBreakdown = startDate
    ? buildSubBreakdown(dailyTotals, granularity, startDate, cvt)
    : [];
  const topExpenses = (agg?.top_expenses ?? []).map((r) => ({
    ...r,
    amount: round2(cvt(Number(r.amount))),
  }));
  const spendPoints = granularity === "month"
    ? dailyTotals.map((d) => cvt(d.expenses))
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
    volatility,
    volatilityLevel,
    isLoading,
  };
}
