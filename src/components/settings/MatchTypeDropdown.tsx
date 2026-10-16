import { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import type { MatchType } from '@/lib/matchExamples';

interface MatchTypeDropdownProps {
  value: MatchType;
  onChange: (value: MatchType) => void;
}

const OPTIONS: MatchType[] = ['fuzzy', 'contains', 'starts_with', 'ends_with'];

const LABEL_KEY: Record<MatchType, string> = {
  fuzzy: 'matchType_fuzzy',
  contains: 'matchType_contains',
  starts_with: 'matchType_starts_with',
  ends_with: 'matchType_ends_with',
};

const DESC_KEY: Record<MatchType, string> = {
  fuzzy: 'matchTypeDesc_fuzzy',
  contains: 'matchTypeDesc_contains',
  starts_with: 'matchTypeDesc_starts_with',
  ends_with: 'matchTypeDesc_ends_with',
};

export function MatchTypeDropdown({ value, onChange }: MatchTypeDropdownProps) {
  const { t } = useTranslation('settings');
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 h-8 px-2.5 bg-white rounded-lg shrink-0 cursor-pointer select-none"
          style={{
            font: '700 10.5px Inter, sans-serif',
            letterSpacing: '.06em',
            color: '#5A6069',
            boxShadow: '0 1px 2px rgba(16,24,40,.06)',
          }}
        >
          {t(`categories.${LABEL_KEY[value]}`)}
          <ChevronDown size={11} strokeWidth={2.4} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[240px] p-1.5 rounded-lg"
      >
        {OPTIONS.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => {
              onChange(opt);
              setOpen(false);
            }}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-left transition-colors hover:bg-muted"
          >
            <div className="flex-1 min-w-0">
              <span className="block text-[13px] font-semibold text-foreground">
                {t(`categories.${LABEL_KEY[opt]}`)}
              </span>
              <span className="block text-[11px] text-muted-foreground">
                {t(`categories.${DESC_KEY[opt]}`)}
              </span>
            </div>
            {opt === value && (
              <Check size={14} className="shrink-0 text-primary" />
            )}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
