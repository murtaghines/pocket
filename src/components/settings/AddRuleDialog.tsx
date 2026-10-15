import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { useCategoryTranslations } from '@/hooks/useCategoryTranslations';
import { buildDbRuleFields } from '@/hooks/useCategorizationRules';
import { useRulePreview } from '@/hooks/useRulePreview';
import { useAccounts } from '@/hooks/useAccounts';
import { AccountScopeSelect } from '@/components/imports/AccountScopeSelect';
import { RetroactiveApplyOptions } from '@/components/settings/RetroactiveApplyOptions';
import { filterByScope, type RetroScope } from '@/hooks/useRetroactiveApply';
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
  onSave: (pattern: string, matchType: string, matchingTransactionIds?: string[], accountId?: string | null) => void;
  isSaving: boolean;
}

const MODAL_INPUT = "h-11 rounded-xl bg-muted border-[1.5px] border-transparent px-3.5 text-sm font-medium shadow-none focus-visible:bg-card focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/[0.14] focus-visible:outline-none";
const MODAL_LABEL = "text-[13px] font-medium text-muted-foreground";

const MATCH_TYPES: Array<{ value: string; recommended?: boolean }> = [
  { value: 'SMART', recommended: true },
  { value: 'CONTAINS' },
  { value: 'STARTS_WITH' },
  { value: 'ENDS_WITH' },
  { value: 'EXACT' },
  { value: 'REGEX' },
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
  const { accounts } = useAccounts();
  const [pattern, setPattern] = useState('');
  const [matchType, setMatchType] = useState('SMART');
  // null = all accounts; otherwise the subset of account ids in scope.
  const [accountScope, setAccountScope] = useState<string[] | null>(null);
  const [retroScope, setRetroScope] = useState<RetroScope>("all");
  const [customSince, setCustomSince] = useState("");

  useEffect(() => {
    if (open && editingRule) {
      setPattern(editingRule.pattern);
      setMatchType(editingRule.matchType);
    } else if (open) {
      setPattern('');
      setMatchType('SMART');
      setAccountScope(null);
      setRetroScope("all");
      setCustomSince("");
    }
  }, [open, editingRule]);

  const isEditing = !!editingRule;

  const { dbType, pattern: builtPattern, tokens: builtTokens } = buildDbRuleFields(
    pattern.trim(),
    matchType,
    category?.movement || 'EXPENSE',
    category?.slug || '',
  );
  // The rule's forward scope can only store one account id; use it when the user
  // narrowed to exactly one, otherwise the rule stays global (the retro set is still scoped).
  const ruleAccountId = accountScope && accountScope.length === 1 ? accountScope[0] : null;
  const { matched, count: matchCount, isLoading: previewLoading } = useRulePreview({
    matchType: dbType as MatchType,
    pattern: builtPattern,
    tokens: builtTokens,
    movement: category?.movement || 'EXPENSE',
    accountIds: accountScope,
    enabled: open && !isEditing && pattern.trim().length > 0,
  });

  const handleSave = () => {
    if (!pattern.trim()) return;
    let idsToApply: string[] | undefined;
    if (!isEditing && matched.length > 0) {
      idsToApply = filterByScope(matched, retroScope, customSince ? customSince + "-01" : undefined);
    }
    onSave(pattern.trim(), matchType, idsToApply, ruleAccountId);
  };

  const handleClose = () => {
    setPattern('');
    setMatchType('SMART');
    setAccountScope(null);
    onClose();
  };

  const activeAccounts = accounts.filter(a => !a.archived);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('categories.editRule') : t('categories.addRule')} · {category?.name}
          </DialogTitle>
        </DialogHeader>

        <DialogBody>
          <div className="space-y-2">
            <Label className={MODAL_LABEL}>{t('categories.pattern')}</Label>
            <Input
              className={MODAL_INPUT}
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
            <Label className={MODAL_LABEL}>{t('categories.matchType')}</Label>
            <Select value={matchType} onValueChange={setMatchType}>
              <SelectTrigger className={MODAL_INPUT}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MATCH_TYPES.map(({ value, recommended }) => (
                  <SelectItem key={value} value={value}>
                    <span className="flex items-center gap-2">
                      <span className="font-medium">{t(`categories.${LABEL_KEY[value]}`)}</span>
                      {recommended && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/[0.12] text-primary">
                          {t('categories.recommended', 'Recommended')}
                        </span>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{t(`categories.${HELP_KEY[matchType]}`)}</p>
          </div>

          {/* Account scope (multi-select) */}
          {activeAccounts.length > 1 && (
            <div className="space-y-2">
              <AccountScopeSelect
                accounts={accounts}
                value={accountScope}
                onChange={setAccountScope}
              />
              <p className="text-xs text-muted-foreground">{t('categories.accountScopeHelp')}</p>
            </div>
          )}

          {/* Retroactive scope */}
          {!isEditing && matched.length > 0 && (
            <RetroactiveApplyOptions
              transactions={matched}
              scope={retroScope}
              onScopeChange={setRetroScope}
              customSince={customSince}
              onCustomSinceChange={setCustomSince}
            />
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} className="h-12 rounded-[14px] px-6 text-[15px] font-semibold border-0 bg-muted text-foreground hover:bg-[hsl(220,13%,91%)]">
            {t('categories.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={!pattern.trim() || isSaving} className="h-12 rounded-[14px] px-6 text-[15px] font-semibold min-w-[160px]">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            {t('categories.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
