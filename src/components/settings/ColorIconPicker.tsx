import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { icons } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

// Warm-cool palette inspired by reference — ocean blues, warm ambers, terracotta, navy, teal
const CURATED_COLORS = [
  // Blues & teals
  '210 80% 72%',  // light sky
  '197 71% 52%',  // teal
  '205 80% 40%',  // ocean blue
  '215 50% 30%',  // navy
  '220 65% 55%',  // royal blue
  '240 50% 55%',  // indigo
  // Warm tones
  '45 95% 58%',   // golden yellow
  '35 85% 55%',   // amber
  '25 85% 55%',   // warm orange
  '15 75% 52%',   // terracotta
  '5 70% 55%',    // coral
  '350 60% 55%',  // rose
  // Earth & muted
  '175 55% 42%',  // sea green
  '160 45% 45%',  // sage
  '145 40% 48%',  // forest
  '280 45% 55%',  // purple
  '310 45% 52%',  // orchid
  '330 50% 55%',  // magenta
  // Neutrals & accent
  '30 55% 50%',   // sand brown
  '200 25% 50%',  // steel
  '250 35% 50%',  // lavender
  '0 0% 45%',     // grey
];

// Comprehensive icon set — existing category icons + many useful general ones
const CURATED_ICONS = [
  // Existing category icons
  'briefcase', 'rotate-ccw', 'arrow-down-left', 'circle-plus', 'trending-up',
  'laptop', 'home', 'shopping-cart', 'utensils', 'car',
  'heart-pulse', 'gamepad-2', 'shopping-bag', 'graduation-cap', 'repeat',
  'plane', 'dumbbell', 'more-horizontal', 'paw-print', 'arrow-left-right',
  // Food & drink
  'coffee', 'wine', 'cake', 'apple', 'beer',
  // People & social
  'baby', 'users', 'heart', 'gift', 'smile',
  // Tools & work
  'wrench', 'scissors', 'hammer', 'settings', 'clipboard',
  // Creative
  'palette', 'music', 'camera', 'pen-tool', 'image',
  // Nature & weather
  'sun', 'cloud', 'umbrella', 'leaf', 'flower-2',
  // Tech
  'smartphone', 'monitor', 'wifi', 'bluetooth', 'headphones',
  // Money & business
  'wallet', 'credit-card', 'piggy-bank', 'receipt', 'banknote',
  // Transport
  'bike', 'train-front', 'ship', 'fuel', 'truck',
  // Misc objects
  'key', 'shield', 'crown', 'star', 'zap',
  'sparkles', 'flame', 'tag', 'anchor', 'compass',
  'book', 'newspaper', 'map', 'globe', 'building-2',
  // Health & wellness
  'pill', 'stethoscope', 'syringe', 'activity',
  // Animals
  'dog', 'cat', 'fish', 'bird',
];

interface ColorIconPickerProps {
  currentColor: string;
  currentIcon: string;
  onSave: (color: string, icon: string) => void;
}

export function ColorIconPicker({ currentColor, currentIcon, onSave }: ColorIconPickerProps) {
  const [color, setColor] = useState(currentColor);
  const [icon, setIcon] = useState(currentIcon);
  const { t } = useTranslation('settings');

  const toPasscalCase = (name: string) =>
    name.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');

  const renderIcon = (iconName: string, size = 16) => {
    const key = toPasscalCase(iconName);
    const Ic = icons[key as keyof typeof icons];
    return Ic ? <Ic size={size} strokeWidth={1.8} /> : null;
  };

  return (
    <div className="space-y-4">
      {/* Preview */}
      <div className="flex items-center justify-center py-3">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-md transition-all duration-200"
          style={{
            backgroundColor: `hsl(${color} / 0.15)`,
            color: `hsl(${color})`,
            boxShadow: `0 4px 14px -4px hsl(${color} / 0.3)`,
          }}
        >
          {renderIcon(icon, 28)}
        </div>
      </div>

      {/* Colors */}
      <div className="space-y-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t('categories.color', 'Color')}
        </span>
        <div className="grid grid-cols-8 gap-1.5">
          {CURATED_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={cn(
                'w-7 h-7 rounded-lg transition-all duration-150 flex items-center justify-center',
                'hover:scale-110 hover:shadow-md',
                color === c ? 'ring-2 ring-offset-2 ring-offset-background' : ''
              )}
              style={{
                backgroundColor: `hsl(${c})`,
                ...(color === c ? { ringColor: `hsl(${c})` } : {}),
              }}
              onClick={() => setColor(c)}
            >
              {color === c && <Check className="w-3.5 h-3.5 text-white drop-shadow-sm" />}
            </button>
          ))}
        </div>
      </div>

      {/* Icons — all shown in the selected color */}
      <div className="space-y-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t('categories.icon', 'Icon')}
        </span>
        <div className="grid grid-cols-8 gap-1 max-h-[200px] overflow-y-auto pr-1 scrollbar-thin">
          {CURATED_ICONS.map((ic) => {
            const isSelected = icon === ic;
            return (
              <button
                key={ic}
                type="button"
                className={cn(
                  'w-8 h-8 rounded-lg transition-all duration-150 flex items-center justify-center',
                  'hover:scale-105',
                  isSelected ? 'shadow-sm' : 'hover:bg-muted/60'
                )}
                style={{
                  backgroundColor: isSelected ? `hsl(${color} / 0.15)` : undefined,
                  color: `hsl(${color})`,
                  ...(isSelected ? { boxShadow: `inset 0 0 0 1.5px hsl(${color} / 0.4)` } : {}),
                }}
                onClick={() => setIcon(ic)}
              >
                {renderIcon(ic, 15)}
              </button>
            );
          })}
        </div>
      </div>

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
