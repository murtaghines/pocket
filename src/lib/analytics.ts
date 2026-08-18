// Pure metrics & date helpers for the Dashboard and History views.
//
// All date math is tz-safe: we parse "YYYY-MM-DD" by string, never
// `new Date(isoString)` (which parses as UTC and can shift the day in negative-offset locales).
// Money amounts are summed as `Math.abs` and rounded to cents via `round2`.

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
// Granularity — bucket a series by week / month / year (History view selector)
// ---------------------------------------------------------------------------

export type Granularity = "week" | "month" | "year";

/** "2024-03-05" -> "2024". */
export function yearKeyOf(dateStr: string): string {
  return dateStr.slice(0, 4);
}

/**
 * The Monday (ISO week start) of the week containing `dateStr`, as "YYYY-MM-DD". Continuous and
 * string-sortable, so it works as a period key across month/year boundaries. tz-safe (date parts).
 */
export function weekStartKeyOf(dateStr: string): string {
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return dateStr.slice(0, 10);
  const dt = new Date(y, m - 1, d);
  const dow = (dt.getDay() + 6) % 7; // 0=Mon .. 6=Sun
  dt.setDate(dt.getDate() - dow);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** Period key for a date at the given granularity (week -> Monday date, month -> YYYY-MM, year -> YYYY). */
export function periodKeyOf(dateStr: string, g: Granularity): string {
  if (g === "week") return weekStartKeyOf(dateStr);
  if (g === "year") return yearKeyOf(dateStr);
  return monthKeyOf(dateStr);
}

/** Inclusive "YYYY-MM-DD" start/end range covered by a period key at the given granularity. */
export function periodRangeOf(key: string, g: Granularity): { start: string; end: string } {
  if (g === "week") {
    const start = key.slice(0, 10);
    const [y, m, d] = start.split("-").map(Number);
    const endDt = new Date(y, m - 1, d + 6);
    const end = `${endDt.getFullYear()}-${String(endDt.getMonth() + 1).padStart(2, "0")}-${String(endDt.getDate()).padStart(2, "0")}`;
    return { start, end };
  }
  if (g === "year") {
    return { start: `${key}-01-01`, end: `${key}-12-31` };
  }
  const days = daysInMonthOf(key);
  return { start: `${key}-01`, end: `${key}-${String(days).padStart(2, "0")}` };
}



/**
 * Human label for a period key at a given granularity. Month -> short month name, year -> the year,
 * week -> the week-start short date. `locale` controls month/day names.
 */
export function formatPeriodLabel(key: string, g: Granularity, locale = "en"): string {
  if (g === "year") return key;
  if (g === "week") {
    const [y, m, d] = key.slice(0, 10).split("-").map(Number);
    if (!y || !m || !d) return key;
    return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(y, m - 1, d));
  }
  const [y, m] = key.split("-").map(Number);
  if (!y || !m) return key;
  return new Intl.DateTimeFormat(locale, { month: "short" }).format(new Date(y, m - 1, 1));
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
// housing/utilities, groceries, transport, health, core subscriptions, education, plus sports and
// pets — treated as non-negotiable wellbeing/dependents) and "discretionary" (lifestyle choices:
// eating out, leisure, shopping, travel). The split answers "how much of what I spent was
// avoidable?". Legacy slugs are normalized first.
export const ESSENTIAL_EXPENSE_SLUGS = new Set([
  "housing",
  "groceries",
  "transport",
  "health",
  "subscriptions",
  "education",
  "sports",
  "pets",
]);

export const DISCRETIONARY_EXPENSE_SLUGS = new Set([
  "restaurants",
  "entertainment",
  "shopping",
  "travel",
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


export interface WeeklyPoint {
  week: number;
  spend: number;
  income: number;
  net: number;
}


export interface DailyOfWeekPoint {
  /** 0=Mon .. 6=Sun */
  dayIndex: number;
  spend: number;
  income: number;
  net: number;
}


export interface MonthOfYearPoint {
  /** 1..12 */
  monthIndex: number;
  spend: number;
  income: number;
  net: number;
}


/** A category slug with its accumulated amount, used to break a bucket down by category. */
export interface CategoryAmount {
  slug: string;
  amount: number;
}

export interface EssentialSplit {
  essential: number;
  discretionary: number;
  total: number;
  discretionaryPct: number;
  /** Categories composing the essential bucket, largest first — answers "which transactions?". */
  essentialCategories: CategoryAmount[];
  /** Categories composing the discretionary bucket, largest first. */
  discretionaryCategories: CategoryAmount[];
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
  g: Granularity = "month",
): CategoryTrend {
  const monthsSet = new Set<string>();
  // slug -> periodKey -> total
  const bySlug: Record<string, Record<string, number>> = {};
  const slugTotals: Record<string, number> = {};

  for (const t of transactions) {
    if (!isExpense(t)) continue;
    const mk = periodKeyOf(t.date, g);
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
