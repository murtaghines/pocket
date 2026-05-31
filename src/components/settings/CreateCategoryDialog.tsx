import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, X, Loader2, Check } from 'lucide-react';
import { icons } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CustomCategoryRule } from '@/hooks/useCustomCategories';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_');
}

const CURATED_COLORS = [
  // Row 1 — Cool / brand family
  '203 60% 51%', // Pocket blue (default)
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
  'coffee', 'gift', 'baby', 'music', 'book', 'wrench',
  'scissors', 'palette', 'flame', 'zap', 'sparkles', 'crown',
  'star', 'tag', 'anchor', 'compass', 'umbrella', 'wine',
  'cake', 'cat', 'paw-print', 'truck', 'shield', 'key',
] as const;

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<CustomCategoryRule, 'type'>) => Promise<void>;
  isSaving: boolean;
}

export function CreateCategoryDialog({ open, onClose, onSave, isSaving }: Props) {
  const { t } = useTranslation('settings');
  const [name, setName] = useState('');
  const [movement, setMovement] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [selectedColor, setSelectedColor] = useState(CURATED_COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState<string>('tag');

  const addKeyword = () => {
    const trimmed = keywordInput.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed]);
    }
    setKeywordInput('');
  };

  const handleSave = async () => {
    if (!name.trim() || keywords.length === 0) return;
    await onSave({
      slug: generateSlug(name),
      name: name.trim(),
      movement,
      keywords,
      color: selectedColor,
      icon: selectedIcon,
    });
    resetForm();
  };

  const resetForm = () => {
    setName('');
    setMovement('EXPENSE');
    setKeywords([]);
    setKeywordInput('');
    setSelectedColor(CURATED_COLORS[0]);
    setSelectedIcon('tag');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const renderIcon = (iconName: string, size = 16) => {
    const IconComponent = icons[iconName as keyof typeof icons];
    if (!IconComponent) return null;
    return <IconComponent size={size} />;
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-base">{t('categories.createNewCategory', 'Create new category')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-2">
          {/* Name & Type row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{t('categories.customCategoryName')}</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('categories.customCategoryNamePlaceholder')}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{t('categories.customCategoryType')}</Label>
              <Select value={movement} onValueChange={(v) => setMovement(v as 'INCOME' | 'EXPENSE')}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXPENSE">{t('categories.expenses')}</SelectItem>
                  <SelectItem value="INCOME">{t('categories.income')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Color Picker */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t('categories.color', 'Color')}</Label>
            <div className="grid grid-cols-12 gap-2">
              {CURATED_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className="w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center hover:scale-110"
                  style={{
                    backgroundColor: `hsl(${color})`,
                    borderColor: selectedColor === color ? 'hsl(var(--foreground))' : 'transparent',
                  }}
                  onClick={() => setSelectedColor(color)}
                >
                  {selectedColor === color && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              ))}
            </div>
          </div>

          {/* Icon Picker */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t('categories.icon', 'Icon')}</Label>
            <div className="flex flex-wrap gap-1.5">
              {CURATED_ICONS.map((iconName) => (
                <button
                  key={iconName}
                  type="button"
                  className="w-9 h-9 rounded-lg border transition-all flex items-center justify-center hover:bg-muted/80"
                  style={{
                    borderColor: selectedIcon === iconName ? `hsl(${selectedColor})` : 'hsl(var(--border))',
                    backgroundColor: selectedIcon === iconName ? `hsl(${selectedColor} / 0.12)` : undefined,
                    color: selectedIcon === iconName ? `hsl(${selectedColor})` : 'hsl(var(--foreground) / 0.75)',
                  }}
                  onClick={() => setSelectedIcon(iconName)}
                >
                  {renderIcon(iconName, 16)}
                </button>
              ))}
            </div>
          </div>


          {/* Keywords */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t('categories.keywords', 'Keywords')}</Label>
            <div className="flex gap-2">
              <Input
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                placeholder={t('categories.keywordPlaceholder', 'e.g. WOSAP')}
                className="h-9"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addKeyword(); } }}
              />
              <Button size="sm" variant="outline" className="h-9 px-3" onClick={addKeyword}>
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1 min-h-[24px]">
              {keywords.map((kw, i) => (
                <Badge key={i} variant="secondary" className="text-xs gap-1">
                  {kw}
                  <button onClick={() => setKeywords(keywords.filter((_, j) => j !== i))}><X className="w-2.5 h-2.5" /></button>
                </Badge>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {t('categories.customCategoryHelp', 'This category will appear in your dashboard alongside the standard ones.')}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={handleClose}>{t('categories.cancel')}</Button>
          <Button size="sm" onClick={handleSave} disabled={!name.trim() || keywords.length === 0 || isSaving}>
            {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
            {t('categories.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
