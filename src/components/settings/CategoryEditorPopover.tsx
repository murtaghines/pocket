import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { CURATED_COLORS } from '@/lib/categoryPalette';
import { getLucideIcon } from '@/lib/lucideIcon';

const POPOVER_COLORS = CURATED_COLORS.slice(0, 10);

const POPOVER_ICONS = [
  'briefcase', 'house', 'shopping-cart', 'utensils', 'car', 'heart-pulse',
  'gamepad-2', 'shopping-bag', 'graduation-cap', 'repeat', 'plane', 'dumbbell',
  'paw-print', 'coffee', 'wine', 'cake', 'apple', 'baby',
  'heart', 'gift', 'wrench', 'palette', 'music', 'camera',
  'sun', 'leaf', 'smartphone', 'headphones', 'wallet', 'credit-card',
  'piggy-bank', 'receipt', 'banknote', 'bike', 'train-front', 'fuel',
  'key', 'shield', 'crown', 'star', 'zap', 'sparkles',
  'flame', 'tag', 'anchor', 'compass', 'book', 'globe',
];

interface CategoryEditorPopoverProps {
  slug: string;
  isCustom: boolean;
  currentColor: string;
  currentIcon: string;
  onSave: (color: string, icon: string) => void;
  onClose: () => void;
}

export function CategoryEditorPopover({
  currentColor,
  currentIcon,
  onSave,
  onClose,
}: CategoryEditorPopoverProps) {
  const { t } = useTranslation('settings');
  const [color, setColor] = useState(currentColor);
  const [icon, setIcon] = useState(currentIcon);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setColor(currentColor);
    setIcon(currentIcon);
  }, [currentColor, currentIcon]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const renderIcon = (name: string, size = 18) => {
    const I = getLucideIcon(name);
    return I ? <I size={size} strokeWidth={1.8} /> : null;
  };

  return (
    <div
      ref={ref}
      className="absolute z-30"
      style={{ left: 0, top: 68, width: 296 }}
    >
      <div
        className="bg-card rounded-xl overflow-hidden"
        style={{
          boxShadow: '0 0 0 1px rgba(15,15,15,0.05), 0 3px 6px rgba(15,15,15,0.1), 0 9px 24px rgba(15,15,15,0.2)',
        }}
      >
        <div style={{ padding: '14px 16px 16px' }}>
          {/* Color section */}
          <div className="mb-3.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.07em]" style={{ color: '#9AA1AC' }}>
              {t('categories.colorLabel')}
            </span>
            <div className="flex items-center gap-[7px] mt-2">
              {POPOVER_COLORS.map((c) => {
                const isActive = color === c;
                return (
                  <button
                    key={c}
                    type="button"
                    className="rounded-full transition-transform hover:scale-110"
                    style={{
                      width: 22, height: 22,
                      backgroundColor: `hsl(${c})`,
                      outline: isActive ? `2px solid hsl(${c})` : 'none',
                      outlineOffset: isActive ? 2 : 0,
                    }}
                    onClick={() => {
                      setColor(c);
                      onSave(c, icon);
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Icon section */}
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.07em]" style={{ color: '#9AA1AC' }}>
              {t('categories.iconLabel')}
            </span>
            <div className="grid grid-cols-8 gap-0.5 mt-2 max-h-[180px] overflow-y-auto">
              {POPOVER_ICONS.map((ic) => {
                const isActive = icon === ic;
                return (
                  <button
                    key={ic}
                    type="button"
                    className="flex items-center justify-center rounded-lg transition-colors"
                    style={{
                      width: 32, height: 32,
                      backgroundColor: isActive ? `hsl(${color} / 0.12)` : undefined,
                      border: isActive ? `1.5px solid hsl(${color})` : '1.5px solid transparent',
                      color: isActive ? `hsl(${color})` : '#5A6069',
                    }}
                    onClick={() => {
                      setIcon(ic);
                      onSave(color, ic);
                    }}
                  >
                    {renderIcon(ic, 16)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
