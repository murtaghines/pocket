// Central, pure metrics module for the Dashboard (monthly) and History (all-time) views.
//
// Why this exists: aggregation math used to live inline in `useTransactions.tsx`, `Index.tsx`
// and each chart component, with 2-3 diverging "month key" conventions and duplicated
// averages/savings-rate logic. Everything here is a pure, side-effect-free function so it can be
// unit-tested and reused by the insight hooks (`useMonthlyInsights`, `useHistoricalInsights`)
// and by `TotalView`. No React, no i18n, no formatting — callers format with `useLocalization`.
//
// Money rules mirror the rest of the app: transfers are excluded from income/expense by the
// caller (movement === "TRANSFER"), amounts are summed as `Math.abs`, and results are rounded to
// cents via `round2`. All date math is tz-safe: we parse "YYYY-MM-DD" by string, never
// `new Date(isoString)` (which parses as UTC and can shift the day in negative-offset locales).

import type { MonthlyData, Transaction } from "@/lib/mockData";
import { normalizeCategory } from "@/lib/categoryTranslations";

// ---------------------------------------------------------------------------
// Date helpers (tz-safe: operate on the "YYYY-MM-DD" string, not a Date object)
// ---------------------------------------------------------------------------

/** "2024-03-05" -> "2024-03". Pure string slice, so it never shifts across timezones. */
export function monthKeyOf(dateStr: string): string {
  return dateStr.slice(0, 7);
}

/** Day-of-month 1..31 from a "YYYY-MM-DD" string. Returns 0 if unparseable. */
export function dayOfMonth(dateStr: string): number {
  const d = parseInt(dateStr.slice(8, 10), 10);
  return Number.isFinite(d) ? d : 0;
}

/** Number of calendar days in the month of a "YYYY-MM" or "YYYY-MM-DD" key. */
export function daysInMonthOf(monthKey: string): number {
  const [y, m] = monthKey.split("-").map(Number);
  if (!y || !m) return 30;
  return new Date(y, m, 0).getDate(); // day 0 of next month == last day of this month
}

/**
 * ISO-ish week bucket within a month: 1..5, computed from the day of month so weeks are stable
 * regardless of which weekday the 1st falls on (day 1-7 -> 1, 8-14 -> 2, ...). This is a
 * "week of the month" for grouping, not the calendar ISO week number.
 */
export function weekOfMonth(dateStr: string): number {
  const day = dayOfMonth(dateStr);
  if (day <= 0) return 1;
  return Math.min(5, Math.ceil(day / 7));
}

/**
 * Day of week as 0=Mon .. 6=Sun (Monday-first, matching how most of the world reads a calendar).
 * Built from local Date parts to avoid UTC parsing drift.
 */
export function dayOfWeekMon0(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return 0;
  const jsDay = new Date(y, m - 1, d).getDay(); // 0=Sun..6=Sat
  return (jsDay + 6) % 7; // shift so Mon=0 .. Sun=6
}

/** Round to cents, matching the rounding used across the money hooks. */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------
// Basic statistics (defensive: empty input -> 0, never NaN)
// ---------------------------------------------------------------------------

export function mean(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

/** Population standard deviation. Empty or single-element input -> 0. */
export function stdDev(nums: number[]): number {
  if (nums.length < 2) return 0;
  const mu = mean(nums);
  const variance = nums.reduce((s, n) => s + (n - mu) ** 2, 0) / nums.length;
  return Math.sqrt(variance);
}

/**
 * Coefficient of variation = stdDev / |mean|, a unit-less measure of dispersion.
 * Returns 0 when the mean is ~0 (avoids divide-by-zero blowups on all-zero series).
 * A low CV means steady/predictable amounts; a high CV means erratic spikes.
 */
export function coefficientOfVariation(nums: number[]): number {
  const mu = mean(nums);
  if (Math.abs(mu) < 1e-9) return 0;
  return stdDev(nums) / Math.abs(mu);
}

// ---------------------------------------------------------------------------
// Fixed / essential vs discretionary spending
// ---------------------------------------------------------------------------

// Canonical expense slugs (from categoryTranslations) split into "essential" (hard to avoid:
// housing/utilities, groceries, transport, health, core subscriptions, education) and
// "discretionary" (lifestyle choices: eating out, leisure, shopping, travel, sports, pets).
// The split answers "how much of what I spent was avoidable?". Legacy slugs are normalized first.
export const ESSENTIAL_EXPENSE_SLUGS = new Set([
  "housing",
  "groceries",
  "transport",
  "health",
  "subscriptions",
  "education",
]);

export const DISCRETIONARY_EXPENSE_SLUGS = new Set([
  "restaurants",
  "entertainment",
  "shopping",
  "travel",
  "sports",
  "pets",
  "other_expense",
]);

export type ExpenseKind = "essential" | "discretionary";

/** Classify an expense category slug. Unknown slugs fall back to "discretionary". */
export function classifyExpense(slug: string): ExpenseKind {
  const s = normalizeCategory(slug);
  return ESSENTIAL_EXPENSE_SLUGS.has(s) ? "essential" : "discretionary";
}

// ---------------------------------------------------------------------------
// Transaction predicates (movement is the single source of truth; `type` is a fallback)
// ---------------------------------------------------------------------------

export function isExpense(t: Pick<Transaction, "movement" | "type">): boolean {
  return t.movement === "EXPENSE" || (!t.movement && t.type === "expense");
}

export function isIncome(t: Pick<Transaction, "movement" | "type">): boolean {
  return t.movement === "INCOME" || (!t.movement && t.type === "income");
}

// ---------------------------------------------------------------------------
// Monthly aggregations (single selected month)
// ---------------------------------------------------------------------------

export interface DailySpendPoint {
  day: number;
  spend: number;
}

/** Total expense per day-of-month for one month's transactions (convert applied). */
export function dailySpendForMonth(
  transactions: Transaction[],
  monthKey: string | null,
  convert: (n: number) => number = (n) => n,
): DailySpendPoint[] {
  if (!monthKey) return [];
  const days = daysInMonthOf(monthKey);
  const byDay: Record<number, number> = {};
  for (const t of transactions) {
    if (!t.date.startsWith(monthKey) || !isExpense(t)) continue;
    const day = dayOfMonth(t.date);
    if (!day) continue;
    byDay[day] = (byDay[day] || 0) + Math.abs(convert(t.amount));
  }
  return Array.from({ length: days }, (_, i) => ({
    day: i + 1,
    spend: round2(byDay[i + 1] || 0),
  }));
}

export interface WeeklyPoint {
  week: number;
  spend: number;
  income: number;
  net: number;
}

/** Expense/income/net grouped into weeks-of-month (1..5) for one month. */
export function weeklyBreakdownForMonth(
  transactions: Transaction[],
  monthKey: string | null,
  convert: (n: number) => number = (n) => n,
): WeeklyPoint[] {
  if (!monthKey) return [];
  const weeks = Math.ceil(daysInMonthOf(monthKey) / 7);
  const buckets: Record<number, { spend: number; income: number }> = {};
  for (let w = 1; w <= weeks; w++) buckets[w] = { spend: 0, income: 0 };
  for (const t of transactions) {
    if (!t.date.startsWith(monthKey)) continue;
    const w = weekOfMonth(t.date);
    if (!buckets[w]) buckets[w] = { spend: 0, income: 0 };
    const amt = Math.abs(convert(t.amount));
    if (isExpense(t)) buckets[w].spend += amt;
    else if (isIncome(t)) buckets[w].income += amt;
  }
  return Object.entries(buckets).map(([w, b]) => ({
    week: Number(w),
    spend: round2(b.spend),
    income: round2(b.income),
    net: round2(b.income - b.spend),
  }));
}

export interface EssentialSplit {
  essential: number;
  discretionary: number;
  total: number;
  discretionaryPct: number;
}

/** Split one month's expenses into essential vs discretionary buckets. */
export function essentialSplitForMonth(
  transactions: Transaction[],
  monthKey: string | null,
  convert: (n: number) => number = (n) => n,
): EssentialSplit {
  let essential = 0;
  let discretionary = 0;
  if (monthKey) {
    for (const t of transactions) {
      if (!t.date.startsWith(monthKey) || !isExpense(t)) continue;
      const amt = Math.abs(convert(t.amount));
      if (classifyExpense(t.categorySlug || String(t.category)) === "essential") essential += amt;
      else discretionary += amt;
    }
  }
  const total = essential + discretionary;
  return {
    essential: round2(essential),
    discretionary: round2(discretionary),
    total: round2(total),
    discretionaryPct: total > 0 ? Math.round((discretionary / total) * 100) : 0,
  };
}

export interface TransactionStats {
  expenseCount: number;
  avgTicket: number;
  largest: { amount: number; description: string; date: string } | null;
  costliestDay: { day: number; spend: number } | null;
}

/** Per-month transaction behaviour: count, average ticket, largest single expense, costliest day. */
export function transactionStatsForMonth(
  transactions: Transaction[],
  monthKey: string | null,
  convert: (n: number) => number = (n) => n,
): TransactionStats {
  const expenses = (monthKey ? transactions.filter((t) => t.date.startsWith(monthKey)) : []).filter(
    isExpense,
  );
  const total = expenses.reduce((s, t) => s + Math.abs(convert(t.amount)), 0);
  let largest: TransactionStats["largest"] = null;
  for (const t of expenses) {
    const amt = Math.abs(convert(t.amount));
    if (!largest || amt > largest.amount) {
      largest = { amount: round2(amt), description: t.description, date: t.date };
    }
  }
  const daily = dailySpendForMonth(transactions, monthKey, convert);
  let costliestDay: TransactionStats["costliestDay"] = null;
  for (const p of daily) {
    if (p.spend > 0 && (!costliestDay || p.spend > costliestDay.spend)) {
      costliestDay = { day: p.day, spend: p.spend };
    }
  }
  return {
    expenseCount: expenses.length,
    avgTicket: expenses.length ? round2(total / expenses.length) : 0,
    largest,
    costliestDay,
  };
}

export interface SpendPace {
  spentSoFar: number;
  projected: number;
  elapsedDays: number;
  totalDays: number;
  /** true when this month is still in progress (so the projection is meaningful). */
  inProgress: boolean;
}

/**
 * Spend pace for a month. `asOf` is the reference "today" (defaults to the real today); when the
 * month is fully in the past the projection equals the actual total. Projection linearly
 * extrapolates spend-so-far across the whole month.
 */
export function spendPaceForMonth(
  transactions: Transaction[],
  monthKey: string | null,
  convert: (n: number) => number = (n) => n,
  asOf: Date = new Date(),
): SpendPace {
  const totalDays = monthKey ? daysInMonthOf(monthKey) : 30;
  if (!monthKey) {
    return { spentSoFar: 0, projected: 0, elapsedDays: 0, totalDays, inProgress: false };
  }
  const asOfKey = `${asOf.getFullYear()}-${String(asOf.getMonth() + 1).padStart(2, "0")}`;
  const isCurrentMonth = asOfKey === monthKey;
  const isFutureMonth = monthKey > asOfKey;
  const elapsedDays = isCurrentMonth ? asOf.getDate() : isFutureMonth ? 0 : totalDays;

  const spentSoFar = transactions
    .filter((t) => t.date.startsWith(monthKey) && isExpense(t))
    .reduce((s, t) => s + Math.abs(convert(t.amount)), 0);

  const projected =
    isCurrentMonth && elapsedDays > 0 ? (spentSoFar / elapsedDays) * totalDays : spentSoFar;

  return {
    spentSoFar: round2(spentSoFar),
    projected: round2(projected),
    elapsedDays,
    totalDays,
    inProgress: isCurrentMonth,
  };
}

// ---------------------------------------------------------------------------
// All-time / historical aggregations (over MonthlyData)
// ---------------------------------------------------------------------------

export interface MonthComparison extends MonthlyData {
  expensesVsPrevPct: number | null;
  incomeVsPrevPct: number | null;
  expensesVsAvgPct: number | null;
  incomeVsAvgPct: number | null;
}

/**
 * Per-month deltas vs the previous month and vs the all-time average. `monthlyData` is expected
 * ascending by month (as `useTransactions` returns it). Percentages are null when the baseline is 0.
 */
export function monthOverMonth(monthlyData: MonthlyData[]): MonthComparison[] {
  const avgExpenses = mean(monthlyData.map((m) => m.expenses));
  const avgIncome = mean(monthlyData.map((m) => m.income));
  const pct = (cur: number, base: number): number | null =>
    base > 0 ? Math.round(((cur - base) / base) * 100) : null;

  return monthlyData.map((m, i) => {
    const prev = i > 0 ? monthlyData[i - 1] : null;
    return {
      ...m,
      expensesVsPrevPct: prev ? pct(m.expenses, prev.expenses) : null,
      incomeVsPrevPct: prev ? pct(m.income, prev.income) : null,
      expensesVsAvgPct: pct(m.expenses, avgExpenses),
      incomeVsAvgPct: pct(m.income, avgIncome),
    };
  });
}

export interface SeasonalMonth {
  /** 1..12 */
  month: number;
  avgExpenses: number;
  avgIncome: number;
  avgNet: number;
  sampleSize: number;
}

/**
 * Average income/expense/net per calendar month (Jan..Dec) across the whole history. Needs
 * multiple years to be meaningful for repeated months; callers should gate on `monthlyData.length`.
 */
export function seasonalIndexByCalendarMonth(monthlyData: MonthlyData[]): SeasonalMonth[] {
  const byMonth: Record<number, { exp: number[]; inc: number[]; net: number[] }> = {};
  for (let m = 1; m <= 12; m++) byMonth[m] = { exp: [], inc: [], net: [] };
  for (const d of monthlyData) {
    const m = Number(d.month.slice(5, 7));
    if (m < 1 || m > 12) continue;
    byMonth[m].exp.push(d.expenses);
    byMonth[m].inc.push(d.income);
    byMonth[m].net.push(d.balance);
  }
  return Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const b = byMonth[m];
    return {
      month: m,
      avgExpenses: round2(mean(b.exp)),
      avgIncome: round2(mean(b.inc)),
      avgNet: round2(mean(b.net)),
      sampleSize: b.exp.length,
    };
  });
}

export interface WeekdaySpend {
  /** 0=Mon .. 6=Sun */
  weekday: number;
  avgSpend: number;
  totalSpend: number;
  txCount: number;
}

/** Average expense per weekday (Mon..Sun) across all history — reveals the weekend cycle. */
export function weekdaySpending(
  transactions: Transaction[],
  convert: (n: number) => number = (n) => n,
): WeekdaySpend[] {
  const totals: Record<number, number> = {};
  const counts: Record<number, number> = {};
  // Count distinct dates per weekday so "average" means "per that weekday", not "per transaction".
  const datesByWeekday: Record<number, Set<string>> = {};
  for (let w = 0; w < 7; w++) {
    totals[w] = 0;
    counts[w] = 0;
    datesByWeekday[w] = new Set();
  }
  for (const t of transactions) {
    if (!isExpense(t)) continue;
    const w = dayOfWeekMon0(t.date);
    totals[w] += Math.abs(convert(t.amount));
    counts[w] += 1;
    datesByWeekday[w].add(t.date);
  }
  return Array.from({ length: 7 }, (_, w) => {
    const distinctDays = datesByWeekday[w].size;
    return {
      weekday: w,
      totalSpend: round2(totals[w]),
      txCount: counts[w],
      avgSpend: distinctDays ? round2(totals[w] / distinctDays) : 0,
    };
  });
}

export interface RollingPoint {
  month: string;
  net: number;
  rolling: number;
}

/**
 * Rolling average of monthly net balance over a window expressed in months (1, 3, 6 for
 * ~30/90/180 days). Smooths short-term seasonal noise. `monthlyData` ascending.
 */
export function rollingNetByMonths(monthlyData: MonthlyData[], windowMonths: number): RollingPoint[] {
  const w = Math.max(1, windowMonths);
  return monthlyData.map((m, i) => {
    const start = Math.max(0, i - w + 1);
    const slice = monthlyData.slice(start, i + 1);
    return {
      month: m.month,
      net: m.balance,
      rolling: round2(mean(slice.map((s) => s.balance))),
    };
  });
}

export interface CategoryTrendSeries {
  /** category slug */
  slug: string;
  /** per-month totals, aligned to the `months` axis */
  values: number[];
}

export interface CategoryTrend {
  months: string[];
  series: CategoryTrendSeries[];
}

/**
 * Expense-by-category over time, keeping the top `topN` categories by total spend and collapsing
 * the rest into an "other_expense" series. Returns a dense matrix aligned to a sorted month axis.
 */
export function categoryTrends(
  transactions: Transaction[],
  topN = 6,
  convert: (n: number) => number = (n) => n,
): CategoryTrend {
  const monthsSet = new Set<string>();
  // slug -> month -> total
  const bySlug: Record<string, Record<string, number>> = {};
  const slugTotals: Record<string, number> = {};

  for (const t of transactions) {
    if (!isExpense(t)) continue;
    const mk = monthKeyOf(t.date);
    monthsSet.add(mk);
    const slug = normalizeCategory(t.categorySlug || String(t.category));
    const amt = Math.abs(convert(t.amount));
    bySlug[slug] = bySlug[slug] || {};
    bySlug[slug][mk] = (bySlug[slug][mk] || 0) + amt;
    slugTotals[slug] = (slugTotals[slug] || 0) + amt;
  }

  const months = Array.from(monthsSet).sort();
  const rankedSlugs = Object.keys(slugTotals).sort((a, b) => slugTotals[b] - slugTotals[a]);
  const topSlugs = rankedSlugs.slice(0, topN);
  const otherSlugs = rankedSlugs.slice(topN);

  const series: CategoryTrendSeries[] = topSlugs.map((slug) => ({
    slug,
    values: months.map((mk) => round2(bySlug[slug]?.[mk] || 0)),
  }));

  if (otherSlugs.length) {
    const otherValues = months.map((mk) =>
      round2(otherSlugs.reduce((s, slug) => s + (bySlug[slug]?.[mk] || 0), 0)),
    );
    if (otherValues.some((v) => v > 0)) series.push({ slug: "other_expense", values: otherValues });
  }

  return { months, series };
}

export interface HistorySummary {
  totalIncome: number;
  totalExpenses: number;
  totalBalance: number;
  avgIncome: number;
  avgExpenses: number;
  avgBalance: number;
  savingsRate: number;
  bestMonth: MonthlyData | null;
  worstMonth: MonthlyData | null;
  /** consecutive most-recent months with positive balance */
  positiveStreak: number;
  /** coefficient of variation of monthly income (0 = perfectly stable) */
  incomeVolatility: number;
}

/** All-time summary KPIs derived from `monthlyData` (ascending). */
export function historySummary(monthlyData: MonthlyData[]): HistorySummary {
  const totalIncome = round2(monthlyData.reduce((s, d) => s + d.income, 0));
  const totalExpenses = round2(monthlyData.reduce((s, d) => s + d.expenses, 0));
  const totalBalance = round2(totalIncome - totalExpenses);
  const n = monthlyData.length;

  let bestMonth: MonthlyData | null = null;
  let worstMonth: MonthlyData | null = null;
  for (const d of monthlyData) {
    if (!bestMonth || d.balance > bestMonth.balance) bestMonth = d;
    if (!worstMonth || d.balance < worstMonth.balance) worstMonth = d;
  }

  // Positive-savings streak counted backwards from the most recent month.
  let positiveStreak = 0;
  for (let i = monthlyData.length - 1; i >= 0; i--) {
    if (monthlyData[i].balance > 0) positiveStreak++;
    else break;
  }

  return {
    totalIncome,
    totalExpenses,
    totalBalance,
    avgIncome: n ? round2(totalIncome / n) : 0,
    avgExpenses: n ? round2(totalExpenses / n) : 0,
    avgBalance: n ? round2(totalBalance / n) : 0,
    savingsRate: totalIncome > 0 ? Math.round((totalBalance / totalIncome) * 100) : 0,
    bestMonth,
    worstMonth,
    positiveStreak,
    incomeVolatility: round2(coefficientOfVariation(monthlyData.map((d) => d.income))),
  };
}
