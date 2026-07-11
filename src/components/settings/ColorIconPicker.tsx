import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CURATED_COLORS } from '@/lib/categoryPalette';
import { getLucideIcon } from '@/lib/lucideIcon';

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

  const renderIcon = (iconName: string, size = 16) => {
    const Ic = getLucideIcon(iconName);
    return Ic ? <Ic size={size} strokeWidth={1.8} /> : null;
  };

  return (
    <div className="space-y-4">
      {mode !== 'icon' && (
        <div className="space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t('categories.color', 'Color')}
          </span>
          <div className="grid grid-cols-12 gap-2">
            {CURATED_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className="aspect-square w-full rounded-full border-2 transition-all flex items-center justify-center hover:scale-110"
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
          <div className="grid grid-cols-8 gap-2 max-h-[260px] overflow-y-auto pr-1 scrollbar-thin">
            {CURATED_ICONS.map((ic) => {
              const isSelected = icon === ic;
              return (
                <button
                  key={ic}
                  type="button"
                  className="aspect-square w-full rounded-lg border transition-all flex items-center justify-center hover:bg-muted/60"
                  style={{
                    borderColor: isSelected ? `hsl(${color})` : 'hsl(var(--border))',
                    backgroundColor: isSelected ? `hsl(${color} / 0.12)` : undefined,
                    color: isSelected ? `hsl(${color})` : 'hsl(var(--foreground) / 0.75)',
                  }}
                  onClick={() => setIcon(ic)}
                >
                  {renderIcon(ic, 18)}
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
