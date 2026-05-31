import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { icons } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

// Same palette as CreateCategoryDialog — 2 rows of 12, anchored to Pocket blue
const CURATED_COLORS = [
  // Row 1 — Cool / brand family
  '203 60% 51%',
  '210 70% 60%',
  '220 65% 55%',
  '230 55% 60%',
  '250 55% 62%',
  '270 50% 60%',
  '190 65% 48%',
  '180 55% 45%',
  '170 55% 42%',
  '155 50% 45%',
  '140 45% 48%',
  '120 40% 50%',
  // Row 2 — Warm / earth / neutrals
  '50 85% 55%',
  '40 90% 55%',
  '30 85% 55%',
  '20 80% 55%',
  '10 75% 55%',
  '355 70% 58%',
  '335 60% 58%',
  '315 50% 55%',
  '25 40% 45%',
  '35 35% 40%',
  '210 15% 50%',
  '215 20% 35%',
];

const CURATED_ICONS = [
  'briefcase', 'rotate-ccw', 'arrow-down-left', 'circle-plus', 'trending-up',
  'laptop', 'house', 'shopping-cart',
  'utensils', 'car', 'heart-pulse', 'gamepad-2', 'shopping-bag', 'graduation-cap', 'repeat', 'plane',
  'dumbbell', 'ellipsis', 'paw-print', 'arrow-left-right', 'coffee', 'wine', 'cake', 'apple',
  'beer', 'baby', 'users', 'heart', 'gift', 'smile', 'wrench', 'scissors',
  'hammer', 'settings', 'clipboard', 'palette', 'music', 'camera', 'pen-tool', 'image',
  'sun', 'cloud', 'umbrella', 'leaf', 'flower-2', 'smartphone', 'monitor', 'wifi',
  'bluetooth', 'headphones', 'wallet', 'credit-card', 'piggy-bank', 'receipt', 'banknote', 'bike',
  'train-front', 'ship', 'fuel', 'truck', 'key', 'shield', 'crown', 'star',
  'zap', 'sparkles', 'flame', 'tag', 'anchor', 'compass', 'book', 'newspaper',
  'map', 'globe', 'building-2', 'pill', 'stethoscope', 'syringe', 'activity', 'cat',
];

interface ColorIconPickerProps {
  currentColor: string;
  currentIcon: string;
  onSave: (color: string, icon: string) => void;
  mode?: 'both' | 'color' | 'icon';
}

export function ColorIconPicker({ currentColor, currentIcon, onSave, mode = 'both' }: ColorIconPickerProps) {
  const [color, setColor] = useState(currentColor);
  const [icon, setIcon] = useState(currentIcon);
  const { t } = useTranslation('settings');

  const toPascalCase = (name: string) =>
    name.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');

  const renderIcon = (iconName: string, size = 16) => {
    const key = toPascalCase(iconName);
    const Ic = icons[key as keyof typeof icons];
    return Ic ? <Ic size={size} strokeWidth={1.8} /> : null;
  };

  return (
    <div className="space-y-4">
      {mode !== 'icon' && (
        <div className="space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t('categories.color', 'Color')}
          </span>
          <div className="grid grid-cols-12 gap-2.5">
            {CURATED_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={cn(
                  'w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center hover:scale-110'
                )}
                style={{
                  backgroundColor: `hsl(${c})`,
                  borderColor: color === c ? 'hsl(var(--foreground))' : 'transparent',
                }}
                onClick={() => setColor(c)}
              >
                {color === c && <Check className="w-3 h-3 text-white drop-shadow-sm" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {mode !== 'color' && (
        <div className="space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t('categories.icon', 'Icon')}
          </span>
          <div className="grid grid-cols-8 gap-2 max-h-[240px] overflow-y-auto pr-1 scrollbar-thin">
            {CURATED_ICONS.map((ic) => {
              const isSelected = icon === ic;
              return (
                <button
                  key={ic}
                  type="button"
                  className={cn(
                    'w-9 h-9 rounded-lg border transition-all flex items-center justify-center hover:bg-muted/60'
                  )}
                  style={{
                    borderColor: isSelected ? `hsl(${color})` : 'hsl(var(--border))',
                    backgroundColor: isSelected ? `hsl(${color} / 0.12)` : undefined,
                    color: isSelected ? `hsl(${color})` : 'hsl(var(--foreground) / 0.75)',
                  }}
                  onClick={() => setIcon(ic)}
                >
                  {renderIcon(ic, 16)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Button
        size="sm"
        className="w-full h-8 text-xs font-medium"
        style={{
          backgroundColor: `hsl(${color})`,
          color: 'white',
        }}
        onClick={() => onSave(color, icon)}
      >
        {t('categories.save', 'Save')}
      </Button>
    </div>
  );
}
