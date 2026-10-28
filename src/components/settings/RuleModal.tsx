import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Loader2, AlertTriangle } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { buildMatchExamples, type MatchType } from '@/lib/matchExamples';
import { MatchTypeDropdown } from './MatchTypeDropdown';
import { getRuleCategoryWarning } from '@/lib/ruleValidation';
import { Circle } from 'lucide-react';

interface RuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  category: { slug: string; label: string; color: string; icon: string };
  movementType?: string;
  accounts: Array<{ id: string; label: string }>;
  defaultAccountId?: string | null;
  initialPattern?: string;
  initialMatchType?: MatchType;
  ruleId?: string;
  onConfirm: (payload: {
    pattern: string;
    matchType: MatchType;
    accountId: string | null;
    applyToExisting: boolean;
  }) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  isSaving?: boolean;
}

function ExampleChip({ text, highlight }: { text: string; highlight: [number, number] }) {
  const [a, b] = highlight;
  return (
    <span className="pk-ex-row">
      {text.slice(0, a)}
      <b>{text.slice(a, b)}</b>
      {text.slice(b)}
    </span>
  );
}

export function RuleModal({
  open,
  onOpenChange,
  mode,
  category,
  movementType,
  accounts,
  defaultAccountId,
  initialPattern = '',
  initialMatchType = 'fuzzy',
  onConfirm,
  onDelete,
  isSaving = false,
}: RuleModalProps) {
  const { t } = useTranslation('settings');
  const [pattern, setPattern] = useState(initialPattern);
  const [matchType, setMatchType] = useState<MatchType>(initialMatchType);
  const [accountId, setAccountId] = useState<string | null>(defaultAccountId ?? null);
  const [applyAll, setApplyAll] = useState(mode === 'create');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (open) {
      setPattern(initialPattern);
      setMatchType(initialMatchType);
      setAccountId(defaultAccountId ?? null);
      setApplyAll(mode === 'create');
      setShowDeleteConfirm(false);
    }
  }, [open, initialPattern, initialMatchType, defaultAccountId, mode]);

  const hasChanges = mode === 'edit' && (
    pattern !== initialPattern ||
    matchType !== initialMatchType ||
    accountId !== (defaultAccountId ?? null)
  );

  const examples = useMemo(
    () => buildMatchExamples(pattern, matchType),
    [pattern, matchType],
  );

  const categoryWarning = useMemo(
    () => getRuleCategoryWarning(pattern, category.slug),
    [pattern, category.slug],
  );

  const handleConfirm = () => {
    if (!pattern.trim()) return;
    onConfirm({
      pattern: pattern.trim(),
      matchType,
      accountId,
      applyToExisting: applyAll,
    });
  };

  const handleDelete = async () => {
    setShowDeleteConfirm(false);
    await onDelete?.();
  };

  const IconComponent = getLucideIcon(category.icon) || Circle;
  const isCreate = mode === 'create';

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[520px]">
          {/* Header */}
          <div className="flex items-center gap-3.5 px-6 pt-5 pb-[18px] border-b border-[#F3F5F9]">
            <span
              className="flex items-center justify-center w-[38px] h-[38px] rounded-[11px] shrink-0"
              style={{
                background: `${category.color}22`,
                color: category.color,
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
                {isCreate ? t('categories.newRule') : t('categories.editRuleTitle')}
                {movementType && <> · {movementType}</>}
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
          <div className="px-6 py-[22px] flex flex-col gap-[18px]">
            {/* Pattern + match type */}
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
                {t('categories.pattern')}
              </label>
              <div
                className="flex items-center gap-2"
                style={{
                  background: '#F2F4F9',
                  borderRadius: 11,
                  height: 44,
                  padding: '0 6px',
                }}
              >
                <MatchTypeDropdown value={matchType} onChange={setMatchType} />
                <input
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                  autoFocus
                  className="flex-1 min-w-0 bg-transparent border-none outline-none"
                  style={{
                    font: "500 14px 'JetBrains Mono', monospace",
                    color: '#0C0D0E',
                    padding: '0 6px',
                  }}
                />
              </div>
              <div className="pk-ex-wrap">
                {examples.map((ex, i) => (
                  <ExampleChip key={i} text={ex.text} highlight={ex.highlight} />
                ))}
              </div>
            </div>

            {/* Category mismatch warning */}
            {categoryWarning && (
              <div className="flex items-start gap-2.5 rounded-[10px] px-3.5 py-3 bg-warning/10">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-warning" strokeWidth={2.2} />
                <p className="text-[12.5px] leading-[1.45] text-foreground/80">
                  {categoryWarning === 'savings'
                    ? t('categories.ruleWarningSavings')
                    : t('categories.ruleWarningInvestment')}
                </p>
              </div>
            )}

            {/* Account select */}
            {accounts.length > 1 && (
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
                  {t('categories.accountScope')}
                </label>
                <div className="pk-select-wrap">
                  <select
                    value={accountId ?? ''}
                    onChange={(e) => setAccountId(e.target.value || null)}
                    className="w-full box-border"
                    style={{
                      background: '#F2F4F9',
                      border: '1.5px solid transparent',
                      borderRadius: 11,
                      height: 42,
                      padding: '0 14px',
                      font: '500 13.5px Inter, sans-serif',
                      color: '#0C0D0E',
                    }}
                  >
                    <option value="">{t('categories.allAccounts')}</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Apply to existing toggle */}
            <label className={cn("flex items-center gap-2.5 py-0.5", mode === 'edit' && !hasChanges ? "opacity-40 cursor-not-allowed" : "cursor-pointer")}>
              <button
                type="button"
                role="switch"
                aria-checked={applyAll}
                disabled={mode === 'edit' && !hasChanges}
                onClick={() => setApplyAll(!applyAll)}
                className="shrink-0 relative rounded-full transition-colors disabled:cursor-not-allowed"
                style={{
                  width: 34,
                  height: 20,
                  background: applyAll && !(mode === 'edit' && !hasChanges) ? '#1B76FF' : '#D1D6DF',
                }}
              >
                <span
                  className="absolute top-[2px] left-[2px] rounded-full bg-white transition-transform"
                  style={{
                    width: 16,
                    height: 16,
                    boxShadow: '0 1px 3px rgba(0,0,0,.18)',
                    transform: applyAll && !(mode === 'edit' && !hasChanges) ? 'translateX(14px)' : 'translateX(0)',
                  }}
                />
              </button>
              <span style={{ font: '500 13px Inter, sans-serif', color: '#0C0D0E' }}>
                {t('categories.applyToExisting')}
              </span>
            </label>
          </div>

          {/* Footer */}
          <div
            className="flex items-center gap-2.5 px-6 py-4 border-t border-[#F3F5F9]"
            style={{
              background: '#FAFBFD',
              justifyContent: isCreate ? 'flex-end' : 'space-between',
            }}
          >
            {!isCreate && onDelete && (
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
                {t('categories.deleteRule')}
              </button>
            )}
            <div className="flex items-center gap-2.5">
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
                onClick={handleConfirm}
                disabled={!pattern.trim() || isSaving}
                className="h-[38px] px-5 rounded-[10px] text-white disabled:opacity-50 transition-colors flex items-center gap-1.5"
                style={{
                  background: '#1B76FF',
                  font: '600 13px Inter, sans-serif',
                  border: 'none',
                  cursor: !pattern.trim() || isSaving ? 'not-allowed' : 'pointer',
                }}
              >
                {isSaving && <Loader2 size={14} className="animate-spin" />}
                {isCreate && <Plus size={14} />}
                {isCreate ? t('categories.createRule') : t('categories.saveChanges')}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation sub-dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('categories.deleteRuleConfirmTitle')}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            {t('categories.deleteRuleConfirmBody')}
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
