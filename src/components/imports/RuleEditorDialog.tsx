import { useEffect, useMemo, useState } from "react";
import { Plus, Circle } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  buildRuleFromCorrection,
  extractTokens,
  type MatchType,
} from "@/lib/userRules";
import { buildMatchExamples, type MatchType as ModalMatchType } from "@/lib/matchExamples";
import { useRulePreview } from "@/hooks/useRulePreview";
import { useAccounts } from "@/hooks/useAccounts";
import { MatchTypeDropdown } from "@/components/settings/MatchTypeDropdown";
import { getLucideIcon } from "@/lib/lucideIcon";
import { useTranslation } from "react-i18next";

export interface RuleEditorPayload {
  match_type: MatchType;
  pattern: string;
  tokens: string[];
  movement: string;
  category: string;
  original_description: string;
  matchingTransactionIds: string[];
  account_id: string | null;
  account_ids: string[] | null;
}

interface RuleEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  description: string;
  movement: string;
  categorySlug: string;
  categoryLabel: string;
  categoryColorVar?: string;
  categoryIcon?: string;
  defaultAccountId?: string | null;
  onConfirm: (payload: RuleEditorPayload) => void | Promise<void>;
  onSkip?: () => void;
  skipLabel?: string;
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

export function RuleEditorDialog({
  open,
  onOpenChange,
  description,
  movement,
  categorySlug,
  categoryLabel,
  categoryColorVar,
  categoryIcon,
  defaultAccountId,
  onConfirm,
  onSkip,
}: RuleEditorDialogProps) {
  const { t } = useTranslation("settings");
  const { t: tc } = useTranslation("common");
  const { accounts } = useAccounts();
  const suggested = useMemo(
    () => buildRuleFromCorrection(description, movement, categorySlug),
    [description, movement, categorySlug],
  );

  const [matchType, setMatchType] = useState<MatchType>(suggested.match_type);
  const [pattern, setPattern] = useState<string>(suggested.pattern);
  const [accountId, setAccountId] = useState<string | null>(
    defaultAccountId ?? null,
  );
  const [applyAll, setApplyAll] = useState(true);

  useEffect(() => {
    if (open) {
      setMatchType(suggested.match_type);
      setPattern(suggested.pattern);
      setAccountId(defaultAccountId ?? null);
      setApplyAll(true);
    }
  }, [open, suggested, defaultAccountId]);

  const effectiveTokens = useMemo(() => {
    if (matchType === "fuzzy") return extractTokens(pattern);
    return [];
  }, [matchType, pattern]);

  const { matchingIds: matchedIds } = useRulePreview({
    matchType,
    pattern,
    tokens: effectiveTokens,
    movement,
    accountIds: accountId ? [accountId] : null,
    enabled: open,
  });

  const matchingIds = useMemo(
    () => (applyAll ? matchedIds : []),
    [applyAll, matchedIds],
  );

  const canSave = pattern.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    onConfirm({
      match_type: matchType,
      pattern: pattern.trim(),
      tokens: effectiveTokens,
      movement,
      category: categorySlug,
      original_description: description,
      matchingTransactionIds: matchingIds,
      account_id: accountId,
      account_ids: accountId ? [accountId] : null,
    });
  };

  const examples = useMemo(
    () => buildMatchExamples(pattern, matchType as ModalMatchType),
    [pattern, matchType],
  );

  const IconComponent = getLucideIcon(categoryIcon ?? "") || Circle;
  const categoryColor = categoryColorVar ? `hsl(var(--${categoryColorVar}))` : undefined;

  const accountOptions = useMemo(
    () => accounts.map((a) => ({
      id: a.id,
      label: [a.institution, a.name].filter(Boolean).join(" · "),
    })),
    [accounts],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px]">
        {/* Header */}
        <div className="flex items-center gap-3.5 px-6 pt-5 pb-[18px] border-b border-[#F3F5F9]">
          <span
            className="flex items-center justify-center w-[38px] h-[38px] rounded-[11px] shrink-0"
            style={{
              background: categoryColor ? `hsl(var(--${categoryColorVar}) / 0.13)` : undefined,
              color: categoryColor,
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
              {t('categories.newRule')} · {movement}
            </p>
            <p
              className="m-0 mt-0.5 truncate"
              style={{
                font: '700 18px Quicksand, sans-serif',
                letterSpacing: '-.01em',
                color: '#0C0D0E',
              }}
            >
              {categoryLabel}
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
              <MatchTypeDropdown
                value={matchType as ModalMatchType}
                onChange={(v) => setMatchType(v as MatchType)}
              />
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
                maxLength={200}
              />
            </div>
            <div className="pk-ex-wrap">
              {examples.map((ex, i) => (
                <ExampleChip key={i} text={ex.text} highlight={ex.highlight} />
              ))}
            </div>
          </div>

          {/* Account select */}
          {accountOptions.length > 1 && (
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
                  {accountOptions.map((a) => (
                    <option key={a.id} value={a.id}>{a.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Apply to existing toggle */}
          <label className="flex items-center gap-2.5 cursor-pointer py-0.5">
            <button
              type="button"
              role="switch"
              aria-checked={applyAll}
              onClick={() => setApplyAll(!applyAll)}
              className="shrink-0 relative rounded-full transition-colors"
              style={{
                width: 34,
                height: 20,
                background: applyAll ? '#1B76FF' : '#D1D6DF',
              }}
            >
              <span
                className="absolute top-[2px] left-[2px] rounded-full bg-white transition-transform"
                style={{
                  width: 16,
                  height: 16,
                  boxShadow: '0 1px 3px rgba(0,0,0,.18)',
                  transform: applyAll ? 'translateX(14px)' : 'translateX(0)',
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
          style={{ background: '#FAFBFD', justifyContent: 'flex-end' }}
        >
          <button
            type="button"
            onClick={() => {
              if (onSkip) onSkip();
              onOpenChange(false);
            }}
            className="h-[38px] px-4 rounded-[10px] bg-muted text-foreground hover:bg-[hsl(220,13%,91%)] transition-colors"
            style={{ font: '600 13px Inter, sans-serif', border: 'none', cursor: 'pointer' }}
          >
            {tc('imports.cancel', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="h-[38px] px-5 rounded-[10px] text-white disabled:opacity-50 transition-colors flex items-center gap-1.5"
            style={{
              background: '#1B76FF',
              font: '600 13px Inter, sans-serif',
              border: 'none',
              cursor: !canSave ? 'not-allowed' : 'pointer',
            }}
          >
            <Plus size={14} />
            {t('categories.createRule')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
