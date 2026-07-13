import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next';
import { Loader2, Sparkles, Search, AlignLeft, AlignRight, Type, Code2, Check } from 'lucide-react';
import { useCategoryTranslations } from '@/hooks/useCategoryTranslations';
import { getLucideIcon } from '@/lib/lucideIcon';
import { cn } from '@/lib/utils';
import { buildDbRuleFields } from '@/hooks/useCategorizationRules';
import { useRulePreview } from '@/hooks/useRulePreview';
import type { MatchType } from '@/lib/userRules';

interface EditingRule {
  id: string;
  pattern: string;
  matchType: string;
}

interface DialogCategory {
  id: string;
  name: string;
  movement?: string | null;
  slug?: string | null;
  icon?: string | null;
  color?: string | null;
}

interface Props {
  open: boolean;
  category: DialogCategory | null;
  editingRule?: EditingRule | null;
  onClose: () => void;
  onSave: (pattern: string, matchType: string, matchingTransactionIds?: string[]) => void;
  isSaving: boolean;
}

const MATCH_TYPES: Array<{ value: string; icon: typeof Sparkles; recommended?: boolean }> = [
  { value: 'SMART', icon: Sparkles, recommended: true },
  { value: 'CONTAINS', icon: Search },
  { value: 'STARTS_WITH', icon: AlignLeft },
  { value: 'ENDS_WITH', icon: AlignRight },
  { value: 'EXACT', icon: Type },
  { value: 'REGEX', icon: Code2 },
];

const LABEL_KEY: Record<string, string> = {
  SMART: 'smartMatch',
  CONTAINS: 'contains',
  STARTS_WITH: 'startsWith',
  ENDS_WITH: 'endsWith',
  EXACT: 'exact',
  REGEX: 'regex',
};

const HELP_KEY: Record<string, string> = {
  SMART: 'matchHelp_SMART',
  CONTAINS: 'matchHelp_CONTAINS',
  STARTS_WITH: 'matchHelp_STARTS_WITH',
  ENDS_WITH: 'matchHelp_ENDS_WITH',
  EXACT: 'matchHelp_EXACT',
  REGEX: 'matchHelp_REGEX',
};

function placeholderFor(movement?: string | null): string {
  if (movement === 'INCOME') return 'e.g. Payroll, Salary, Stripe...';
  if (movement === 'TRANSFER') return 'e.g. Transfer, Wise, Revolut...';
  return 'e.g. Netflix, Mercadona, Spotify...';
}

export function AddRuleDialog({ open, category, editingRule, onClose, onSave, isSaving }: Props) {
  const { t } = useTranslation('settings');
  const { getMovementLabel } = useCategoryTranslations();
  const [pattern, setPattern] = useState('');
  const [matchType, setMatchType] = useState('SMART');

  useEffect(() => {
    if (open && editingRule) {
      setPattern(editingRule.pattern);
      setMatchType(editingRule.matchType);
    } else if (open) {
      setPattern('');
      setMatchType('SMART');
    }
  }, [open, editingRule]);

  const isEditing = !!editingRule;

  // Preview uses the exact pattern/tokens/match_type that will actually be saved
  // (same builder the addRule mutation uses), so the count shown here can never
  // drift from what the retroactive apply on save actually updates.
  const { dbType, pattern: builtPattern, tokens: builtTokens } = buildDbRuleFields(
    pattern.trim(),
    matchType,
    category?.movement || 'EXPENSE',
    category?.slug || '',
  );
  const { matchingIds, count: matchCount, isLoading: previewLoading } = useRulePreview({
    matchType: dbType as MatchType,
    pattern: builtPattern,
    tokens: builtTokens,
    movement: category?.movement || 'EXPENSE',
    enabled: open && !isEditing && pattern.trim().length > 0,
  });

  const handleSave = () => {
    if (!pattern.trim()) return;
    onSave(pattern.trim(), matchType, isEditing ? undefined : matchingIds);
  };

  const handleClose = () => {
    setPattern('');
    setMatchType('SMART');
    onClose();
  };

  const accent = category?.color ? `hsl(${category.color})` : 'hsl(var(--primary))';
  const CategoryIconCmp = category?.icon ? getLucideIcon(category.icon) : null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-3">
            <span
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
              style={{ backgroundColor: `${accent}22`, color: accent }}
            >
              {CategoryIconCmp ? <CategoryIconCmp className="w-4.5 h-4.5" /> : <Sparkles className="w-4 h-4" />}
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                {isEditing ? t('categories.editRule') : t('categories.addRule')}
                {category?.movement && ` · ${getMovementLabel(category.movement)}`}
              </span>
              <span className="text-base font-semibold text-foreground">{category?.name}</span>
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label className="text-sm">{t('categories.pattern')}</Label>
            <Input
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder={placeholderFor(category?.movement)}
              autoFocus
            />
            {!isEditing && pattern.trim().length > 0 && (
              <p className="text-xs text-muted-foreground">
                {previewLoading
                  ? 'Checking existing transactions…'
                  : matchCount > 0
                    ? `Will match ${matchCount} existing transaction${matchCount === 1 ? '' : 's'}.`
                    : 'No existing transactions match yet.'}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm">{t('categories.matchType')}</Label>
            <div className="grid gap-2">
              {MATCH_TYPES.map(({ value, icon: Icon, recommended }) => {
                const selected = matchType === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMatchType(value)}
                    className={cn(
                      'group relative flex items-start gap-3 rounded-lg border p-3 text-left transition-all',
                      selected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                        : 'border-border bg-card hover:border-primary/40 hover:bg-muted/30'
                    )}
                  >
                    <span
                      className={cn(
                        'inline-flex items-center justify-center w-8 h-8 rounded-md shrink-0 transition-colors',
                        selected ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium text-foreground">
                          {t(`categories.${LABEL_KEY[value]}`)}
                        </span>
                        {recommended && (
                          <span className="text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary/15 text-primary">
                            {t('categories.recommended', 'Recommended')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-snug">
                        {t(`categories.${HELP_KEY[value]}`)}
                      </p>
                    </div>
                    {selected && (
                      <Check className="w-4 h-4 text-primary shrink-0 mt-1" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {t('categories.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={!pattern.trim() || isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            {t('categories.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
