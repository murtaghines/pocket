import { useTranslation } from 'react-i18next';
import type { MatchType } from '@/lib/matchExamples';

interface MatchTypeDropdownProps {
  value: MatchType;
  onChange: (value: MatchType) => void;
  className?: string;
}

const OPTIONS: MatchType[] = ['fuzzy', 'contains', 'starts_with', 'ends_with'];

const LABEL_KEY: Record<MatchType, string> = {
  fuzzy: 'matchType_fuzzy',
  contains: 'matchType_contains',
  starts_with: 'matchType_starts_with',
  ends_with: 'matchType_ends_with',
};

export function MatchTypeDropdown({ value, onChange, className }: MatchTypeDropdownProps) {
  const { t } = useTranslation('settings');

  return (
    <div className={`pk-select-wrap ${className ?? ''}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as MatchType)}
        className="h-8 px-2.5 bg-white rounded-lg text-[10.5px] font-bold tracking-[.06em] shrink-0 cursor-pointer border-0"
        style={{ color: '#5A6069' }}
      >
        {OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {t(`categories.${LABEL_KEY[opt]}`)}
          </option>
        ))}
      </select>
    </div>
  );
}
