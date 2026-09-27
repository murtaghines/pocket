/**
 * Shared Y-axis tick formatter for dashboard/investment charts. Values under 1000 are shown
 * as-is (never forced into "0k"/"-0k"), and thousands only get a decimal when rounding to a
 * whole number would collide with a neighboring tick (e.g. 1500 and 2250 both becoming "2k").
 */
export function formatCompactAxisNumber(value: number, opts?: { prefix?: string }): string {
  const prefix = opts?.prefix ?? "";
  if (value === 0) return `${prefix}0`;
  const abs = Math.abs(value);
  if (abs < 1000) return `${prefix}${Math.round(value)}`;
  const thousands = value / 1000;
  const isWhole = Math.abs(thousands - Math.round(thousands)) < 0.05;
  const formatted = isWhole ? `${Math.round(thousands)}` : thousands.toFixed(1);
  return `${prefix}${formatted}k`;
}
