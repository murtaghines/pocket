export const MATCH_TYPES = [
  { value: 'SMART' as const, dbValue: 'fuzzy' as const, recommended: true },
  { value: 'CONTAINS' as const, dbValue: 'contains' as const },
  { value: 'STARTS_WITH' as const, dbValue: 'starts_with' as const },
  { value: 'ENDS_WITH' as const, dbValue: 'ends_with' as const },
] as const;

export type UIMatchType = typeof MATCH_TYPES[number]['value'];
