import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { getLucideIcon } from '@/lib/lucideIcon';
import { EXPANDED_PALETTE } from '@/lib/categoryPalette';
import { Circle } from 'lucide-react';

const MODAL_ICONS = [
  'briefcase', 'house', 'shopping-cart', 'utensils', 'car', 'heart-pulse',
  'gamepad-2', 'shopping-bag', 'graduation-cap', 'repeat', 'plane', 'dumbbell',
  'paw-print', 'coffee', 'wine', 'cake', 'apple', 'baby',
  'heart', 'gift', 'wrench', 'palette', 'music', 'camera',
  'sun', 'leaf', 'smartphone', 'headphones', 'wallet', 'credit-card',
  'piggy-bank', 'receipt', 'banknote', 'bike', 'train-front', 'fuel',
  'key', 'shield', 'crown', 'star', 'zap', 'sparkles',
  'flame', 'tag', 'anchor', 'compass', 'book', 'globe',
];

interface EditCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: {
    slug: string;
    label: string;
    color: string;
    icon: string;
    deletable: boolean;
  };
  onSave: (next: { label: string; color: string; icon: string }) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  isSaving?: boolean;
}

export function EditCategoryModal({
  open,
  onOpenChange,
  category,
  onSave,
  onDelete,
  isSaving = false,
}: EditCategoryModalProps) {
  const { t } = useTranslation('settings');
  const [label, setLabel] = useState(category.label);
  const [color, setColor] = useState(category.color);
  const [icon, setIcon] = useState(category.icon);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (open) {
      setLabel(category.label);
      setColor(category.color);
      setIcon(category.icon);
      setShowDeleteConfirm(false);
    }
  }, [open, category.label, category.color, category.icon]);

  const handleSave = () => {
    if (!label.trim()) return;
    onSave({ label: label.trim(), color, icon });
  };

  const handleDelete = async () => {
    setShowDeleteConfirm(false);
    await onDelete?.();
  };

  const IconComponent = getLucideIcon(icon) || Circle;

  const renderIcon = (name: string, size = 19) => {
    const I = getLucideIcon(name);
    return I ? <I size={size} strokeWidth={1.8} /> : null;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[520px]">
          {/* Header */}
          <div className="flex items-center gap-3.5 px-6 pt-5 pb-[18px] border-b border-[#F3F5F9]">
            <span
              className="flex items-center justify-center w-[38px] h-[38px] rounded-[11px] shrink-0"
              style={{
                background: `${color}22`,
                color: color,
              }}
            >
              <IconComponent size={18} strokeWidth={2} />
            </span>
            <div className="flex-1 min-w-0">
              <p
                className="m-0 uppercase"
                style={{
                  font: '700 10.5px Inter, sans-serif',
                  letterSpacing: '.1em',
                  color: '#9AA1AC',
                }}
              >
                {t('categories.editCategoryTitle')}
              </p>
              <p
                className="m-0 mt-0.5 truncate"
                style={{
                  font: '700 18px Quicksand, sans-serif',
                  letterSpacing: '-.01em',
                  color: '#0C0D0E',
                }}
              >
                {category.label}
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-[22px] flex flex-col gap-5">
            {/* Name */}
            <div>
              <label
                className="block mb-1.5"
                style={{
                  font: '600 11.5px Inter, sans-serif',
                  letterSpacing: '.04em',
                  textTransform: 'uppercase',
                  color: '#5A6069',
                }}
              >
                {t('categories.nameLabel')}
              </label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                autoFocus
                className="w-full box-border"
                style={{
                  background: '#F2F4F9',
                  border: '1.5px solid transparent',
                  borderRadius: 11,
                  height: 42,
                  padding: '0 14px',
                  font: '500 13.5px Inter, sans-serif',
                  color: '#0C0D0E',
                  outline: 'none',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.background = '#fff';
                  e.currentTarget.style.borderColor = '#1B76FF';
                  e.currentTarget.style.boxShadow = '0 0 0 2px rgba(27,118,255,.22)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.background = '#F2F4F9';
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Color grid */}
            <div>
              <div className="flex items-baseline justify-between mb-2.5">
                <label
                  style={{
                    font: '600 11.5px Inter, sans-serif',
                    letterSpacing: '.04em',
                    textTransform: 'uppercase',
                    color: '#5A6069',
                  }}
                >
                  {t('categories.colorLabel')}
                </label>
                <span style={{ font: '500 11px Inter, sans-serif', color: '#9AA1AC' }}>
                  {t('categories.colorOptions')}
                </span>
              </div>
              <div className="grid grid-cols-12 gap-2.5">
                {EXPANDED_PALETTE.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    className={`pk-swatch${hex === color ? ' on' : ''}`}
                    style={{ background: hex, color: hex }}
                    onClick={() => setColor(hex)}
                  />
                ))}
              </div>
            </div>

            {/* Icon grid */}
            <div>
              <label
                className="block mb-1.5"
                style={{
                  font: '600 11.5px Inter, sans-serif',
                  letterSpacing: '.04em',
                  textTransform: 'uppercase',
                  color: '#5A6069',
                }}
              >
                {t('categories.iconLabel')}
              </label>
              <div
                className="grid grid-cols-8 gap-1.5 overflow-y-auto p-0.5"
                style={{ maxHeight: 220 }}
              >
                {MODAL_ICONS.map((iconName) => (
                  <button
                    key={iconName}
                    type="button"
                    className={`pk-icon-btn${iconName === icon ? ' on' : ''}`}
                    style={
                      iconName === icon
                        ? {
                            background: `${color}1a`,
                            borderColor: `${color}59`,
                            color: color,
                          }
                        : undefined
                    }
                    onClick={() => setIcon(iconName)}
                  >
                    {renderIcon(iconName)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            className="flex items-center gap-2.5 px-6 py-4 border-t border-[#F3F5F9]"
            style={{
              background: '#FAFBFD',
              justifyContent: category.deletable ? 'space-between' : 'flex-end',
            }}
          >
            {category.deletable && onDelete && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5"
                style={{
                  padding: '0 14px',
                  height: 38,
                  font: '600 12.5px Inter, sans-serif',
                  color: '#C9502A',
                  background: '#fff',
                  border: '1px solid #F2D4C8',
                  borderRadius: 10,
                  cursor: 'pointer',
                }}
              >
                <Trash2 size={12} />
                {t('categories.deleteCategoryButton')}
              </button>
            )}
            <div className="flex items-center gap-2.5" style={{ marginLeft: category.deletable ? undefined : 'auto' }}>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="h-[38px] px-4 rounded-[10px] bg-muted text-foreground hover:bg-[hsl(220,13%,91%)] transition-colors"
                style={{ font: '600 13px Inter, sans-serif', border: 'none', cursor: 'pointer' }}
              >
                {t('categories.cancel')}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!label.trim() || isSaving}
                className="h-[38px] px-5 rounded-[10px] text-white disabled:opacity-50 transition-colors"
                style={{
                  background: '#1B76FF',
                  font: '600 13px Inter, sans-serif',
                  border: 'none',
                  cursor: !label.trim() || isSaving ? 'not-allowed' : 'pointer',
                }}
              >
                {t('categories.save')}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('categories.deleteCategoryConfirmTitle')}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            {t('categories.deleteCategoryConfirmBody', 'Existing categorized transactions will not change.')}
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('categories.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('categories.deleteConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
