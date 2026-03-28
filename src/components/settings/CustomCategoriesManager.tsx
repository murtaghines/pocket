import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, X, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCustomCategories, type CustomCategoryRule } from '@/hooks/useCustomCategories';
import { useToast } from '@/hooks/use-toast';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_');
}

export function CustomCategoriesManager() {
  const { t } = useTranslation('settings');
  const { toast } = useToast();
  const { customCategories, isSaving, addCustomCategory, removeRule, rules } = useCustomCategories();

  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customMovement, setCustomMovement] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [customKeywords, setCustomKeywords] = useState<string[]>([]);
  const [customKeywordInput, setCustomKeywordInput] = useState('');

  const addKeyword = () => {
    const trimmed = customKeywordInput.trim();
    if (trimmed && !customKeywords.includes(trimmed)) {
      setCustomKeywords([...customKeywords, trimmed]);
    }
    setCustomKeywordInput('');
  };

  const handleSaveCustom = async () => {
    if (!customName.trim() || customKeywords.length === 0) return;
    try {
      await addCustomCategory({
        slug: generateSlug(customName),
        name: customName.trim(),
        movement: customMovement,
        keywords: customKeywords,
      });
      toast({ title: t('categories.customCategorySaved') });
      resetForm();
    } catch {
      toast({ title: t('categories.errorSaving', 'Error saving'), variant: 'destructive' });
    }
  };

  const handleDelete = async (cat: CustomCategoryRule) => {
    try {
      await removeRule(rules.indexOf(cat));
      toast({ title: t('categories.ruleDeleted') });
    } catch {
      toast({ title: t('categories.errorSaving', 'Error deleting'), variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setShowAddCustom(false);
    setCustomName('');
    setCustomMovement('EXPENSE');
    setCustomKeywords([]);
    setCustomKeywordInput('');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold tracking-tight">{t('categories.myCustomCategories', 'My Custom Categories')}</h4>
        <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setShowAddCustom(true)}>
          <Plus className="w-3 h-3 mr-1" />
          {t('categories.createNewCategory', 'Create new category')}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {t('categories.customCategoriesDescription', 'Create entirely new categories with your own name and rules. These appear in your dashboard alongside the standard ones.')}
      </p>

      {customCategories.length === 0 ? (
        <p className="text-xs text-muted-foreground italic py-2">
          {t('categories.noCustomCategories', 'No custom categories yet.')}
        </p>
      ) : (
        <div className="space-y-1.5">
          {customCategories.map((cat, idx) => (
            <div key={idx} className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-muted/40 hover:bg-muted/60 transition-colors">
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {cat.movement === 'INCOME' ? t('categories.income') : t('categories.expenses')}
                </Badge>
                <span className="text-sm font-medium">{cat.name}</span>
                {cat.keywords.map((kw, ki) => (
                  <Badge key={ki} variant="secondary" className="text-[10px]">{kw}</Badge>
                ))}
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0" onClick={() => handleDelete(cat)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showAddCustom} onOpenChange={(o) => !o && resetForm()}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-base">{t('categories.createNewCategory', 'Create new category')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm">{t('categories.customCategoryName')}</Label>
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder={t('categories.customCategoryNamePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{t('categories.customCategoryType')}</Label>
              <Select value={customMovement} onValueChange={(v) => setCustomMovement(v as 'INCOME' | 'EXPENSE')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXPENSE">{t('categories.expenses')}</SelectItem>
                  <SelectItem value="INCOME">{t('categories.income')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{t('categories.keywords', 'Keywords')}</Label>
              <div className="flex gap-2">
                <Input
                  value={customKeywordInput}
                  onChange={(e) => setCustomKeywordInput(e.target.value)}
                  placeholder={t('categories.keywordPlaceholder', 'e.g. WOSAP')}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addKeyword(); } }}
                />
                <Button size="sm" variant="outline" onClick={addKeyword}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1 min-h-[24px]">
                {customKeywords.map((kw, i) => (
                  <Badge key={i} variant="secondary" className="text-xs gap-1">
                    {kw}
                    <button onClick={() => setCustomKeywords(customKeywords.filter((_, j) => j !== i))}><X className="w-2.5 h-2.5" /></button>
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {t('categories.customCategoryHelp', 'This category will appear in your dashboard alongside the standard ones.')}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>{t('categories.cancel')}</Button>
            <Button onClick={handleSaveCustom} disabled={!customName.trim() || customKeywords.length === 0 || isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              {t('categories.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
