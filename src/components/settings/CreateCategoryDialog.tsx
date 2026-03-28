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
  '220 70% 55%',   // Blue
  '250 60% 58%',   // Purple
  '280 55% 55%',   // Violet
  '310 50% 55%',   // Magenta
  '340 65% 55%',   // Pink
  '25 80% 55%',    // Orange
  '45 85% 50%',    // Amber
  '175 60% 42%',   // Teal
  '195 70% 48%',   // Cyan
  '160 50% 45%',   // Sage
  '35 60% 50%',    // Brown
  '270 40% 50%',   // Lavender
  '200 50% 40%',   // Steel
  '15 70% 50%',    // Terracotta
  '330 45% 50%',   // Rose
  '210 30% 50%',   // Slate
];

const CURATED_ICONS = [
  'coffee', 'gift', 'baby', 'music', 'book', 'wrench',
  'scissors', 'palette', 'flame', 'zap', 'sparkles', 'crown',
  'star', 'tag', 'anchor', 'compass', 'umbrella', 'wine',
  'cake', 'dog', 'cat', 'truck', 'shield', 'key',
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
            <div className="flex flex-wrap gap-2">
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
                  className="w-8 h-8 rounded-lg border transition-all flex items-center justify-center hover:bg-muted/80"
                  style={{
                    borderColor: selectedIcon === iconName ? `hsl(${selectedColor})` : 'hsl(var(--border))',
                    backgroundColor: selectedIcon === iconName ? `hsl(${selectedColor} / 0.1)` : undefined,
                    color: selectedIcon === iconName ? `hsl(${selectedColor})` : 'hsl(var(--muted-foreground))',
                  }}
                  onClick={() => setSelectedIcon(iconName)}
                >
                  {renderIcon(iconName, 14)}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40 border border-border/50">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `hsl(${selectedColor} / 0.15)`, color: `hsl(${selectedColor})` }}
            >
              {renderIcon(selectedIcon, 14)}
            </div>
            <span className="text-sm font-medium">{name || t('categories.customCategoryNamePlaceholder')}</span>
            <Badge variant="outline" className="text-[9px] ml-auto">Custom</Badge>
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
