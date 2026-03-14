import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, X, Loader2, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCustomCategories, type CustomCategoryRule, type RuleOverride } from '@/hooks/useCustomCategories';
import { useCategories } from '@/hooks/useCategories';
import { useCategoryTranslations } from '@/hooks/useCategoryTranslations';
import { CategoryIcon } from '@/components/ui/category-icon';
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
  const { ruleOverrides, customCategories, isSaving, addRuleOverride, addCustomCategory, removeRule, rules } = useCustomCategories();
  const { incomeCategories, expenseCategories } = useCategories('CASHFLOW');
  const { getCategoryLabel, getCategoryIcon, getCategoryColor } = useCategoryTranslations();
  const allStandardCategories = [...incomeCategories, ...expenseCategories];

  const [showAddOverride, setShowAddOverride] = useState(false);
  const [showAddCustom, setShowAddCustom] = useState(false);

  // Override form state
  const [overrideCategoryId, setOverrideCategoryId] = useState('');
  const [overrideKeywords, setOverrideKeywords] = useState<string[]>([]);
  const [overrideKeywordInput, setOverrideKeywordInput] = useState('');

  // Custom category form state
  const [customName, setCustomName] = useState('');
  const [customMovement, setCustomMovement] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [customKeywords, setCustomKeywords] = useState<string[]>([]);
  const [customKeywordInput, setCustomKeywordInput] = useState('');

  const addKeyword = (list: string[], setList: (l: string[]) => void, input: string, setInput: (s: string) => void) => {
    const trimmed = input.trim();
    if (trimmed && !list.includes(trimmed)) {
      setList([...list, trimmed]);
    }
    setInput('');
  };

  const removeKeyword = (list: string[], setList: (l: string[]) => void, index: number) => {
    setList(list.filter((_, i) => i !== index));
  };

  const handleSaveOverride = async () => {
    if (!overrideCategoryId || overrideKeywords.length === 0) return;
    const cat = allStandardCategories.find(c => c.id === overrideCategoryId);
    if (!cat) return;
    try {
      await addRuleOverride({
        targetCategoryId: cat.id,
        targetCategorySlug: cat.slug || cat.name,
        keywords: overrideKeywords,
      });
      toast({ title: t('categories.ruleSaved') });
      resetOverrideForm();
    } catch {
      toast({ title: t('categories.errorSaving', 'Error saving'), variant: 'destructive' });
    }
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
      resetCustomForm();
    } catch {
      toast({ title: t('categories.errorSaving', 'Error saving'), variant: 'destructive' });
    }
  };

  const handleDelete = async (index: number) => {
    try {
      await removeRule(index);
      toast({ title: t('categories.ruleDeleted') });
    } catch {
      toast({ title: t('categories.errorSaving', 'Error deleting'), variant: 'destructive' });
    }
  };

  const resetOverrideForm = () => {
    setShowAddOverride(false);
    setOverrideCategoryId('');
    setOverrideKeywords([]);
    setOverrideKeywordInput('');
  };

  const resetCustomForm = () => {
    setShowAddCustom(false);
    setCustomName('');
    setCustomMovement('EXPENSE');
    setCustomKeywords([]);
    setCustomKeywordInput('');
  };

  // Find original index in the full rules array
  const getOriginalIndex = (rule: RuleOverride | CustomCategoryRule) => {
    return rules.indexOf(rule);
  };

  return (
    <div className="space-y-6">
      {/* Rule Overrides Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">{t('categories.customRules', 'Custom Rules')}</h4>
          <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setShowAddOverride(true)}>
            <Plus className="w-3 h-3 mr-1" />
            {t('categories.addRuleToCategory', 'Add rule to a category')}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {t('categories.customRulesDescription', 'Add keywords to override how specific transactions are categorized.')}
        </p>

        {ruleOverrides.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-2">
            {t('categories.noCustomRules', 'No custom rules yet. Add one to override categorization for specific merchants.')}
          </p>
        ) : (
          <div className="space-y-2">
            {ruleOverrides.map((rule, idx) => {
              const slug = rule.targetCategorySlug;
              return (
                <div key={idx} className="rounded-md border bg-background p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CategoryIcon iconName={getCategoryIcon(slug)} colorVar={getCategoryColor(slug)} size="sm" />
                      <span className="text-sm font-medium">{getCategoryLabel(slug)}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDelete(getOriginalIndex(rule))}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {rule.keywords.map((kw, ki) => (
                      <Badge key={ki} variant="secondary" className="text-[10px]">{kw}</Badge>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Custom Categories Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">{t('categories.myCustomCategories', 'My Custom Categories')}</h4>
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
          <div className="space-y-2">
            {customCategories.map((cat, idx) => (
              <div key={idx} className="rounded-md border bg-background p-2.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {cat.movement === 'INCOME' ? t('categories.income') : t('categories.expenses')}
                    </Badge>
                    <span className="text-sm font-medium">{cat.name}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDelete(getOriginalIndex(cat))}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {cat.keywords.map((kw, ki) => (
                    <Badge key={ki} variant="secondary" className="text-[10px]">{kw}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Override Dialog */}
      <Dialog open={showAddOverride} onOpenChange={(o) => !o && resetOverrideForm()}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-base">{t('categories.addRuleToCategory', 'Add rule to a category')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm">{t('categories.selectCategory', 'Select category')}</Label>
              <Select value={overrideCategoryId} onValueChange={setOverrideCategoryId}>
                <SelectTrigger><SelectValue placeholder={t('categories.selectCategory', 'Select category')} /></SelectTrigger>
                <SelectContent>
                  {allStandardCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {getCategoryLabel(cat.slug || cat.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{t('categories.keywords', 'Keywords')}</Label>
              <div className="flex gap-2">
                <Input
                  value={overrideKeywordInput}
                  onChange={(e) => setOverrideKeywordInput(e.target.value)}
                  placeholder={t('categories.keywordPlaceholder', 'e.g. WOSAP')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addKeyword(overrideKeywords, setOverrideKeywords, overrideKeywordInput, setOverrideKeywordInput);
                    }
                  }}
                />
                <Button size="sm" variant="outline" onClick={() => addKeyword(overrideKeywords, setOverrideKeywords, overrideKeywordInput, setOverrideKeywordInput)}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1 min-h-[24px]">
                {overrideKeywords.map((kw, i) => (
                  <Badge key={i} variant="secondary" className="text-xs gap-1">
                    {kw}
                    <button onClick={() => removeKeyword(overrideKeywords, setOverrideKeywords, i)}><X className="w-2.5 h-2.5" /></button>
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {t('categories.overrideHelp', 'If a transaction description contains any of these words, it will be classified under the selected category, overriding the default rules.')}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetOverrideForm}>{t('categories.cancel')}</Button>
            <Button onClick={handleSaveOverride} disabled={!overrideCategoryId || overrideKeywords.length === 0 || isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              {t('categories.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Custom Category Dialog */}
      <Dialog open={showAddCustom} onOpenChange={(o) => !o && resetCustomForm()}>
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addKeyword(customKeywords, setCustomKeywords, customKeywordInput, setCustomKeywordInput);
                    }
                  }}
                />
                <Button size="sm" variant="outline" onClick={() => addKeyword(customKeywords, setCustomKeywords, customKeywordInput, setCustomKeywordInput)}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1 min-h-[24px]">
                {customKeywords.map((kw, i) => (
                  <Badge key={i} variant="secondary" className="text-xs gap-1">
                    {kw}
                    <button onClick={() => removeKeyword(customKeywords, setCustomKeywords, i)}><X className="w-2.5 h-2.5" /></button>
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {t('categories.customCategoryHelp', 'This category will appear in your dashboard alongside the standard ones. Transactions matching your keywords will be assigned here first, before standard rules are checked.')}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetCustomForm}>{t('categories.cancel')}</Button>
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
