import { useEffect, useMemo, useState } from "react";
import { Wand2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CategoryIcon } from "@/components/ui/category-icon";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  buildRuleFromCorrection,
  extractTokens,
  type MatchType,
} from "@/lib/userRules";
import { useRulePreview } from "@/hooks/useRulePreview";
import { useAccounts } from "@/hooks/useAccounts";
import { AccountScopeSelect } from "./AccountScopeSelect";
import { RetroactiveApplyOptions } from "@/components/settings/RetroactiveApplyOptions";
import { filterByScope, type RetroScope } from "@/hooks/useRetroactiveApply";
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

const LABEL = "text-[12px] font-medium text-primary/70 mb-1.5";
const PILL_INPUT =
  "h-11 rounded-xl bg-muted/50 border-0 shadow-none px-4 text-[14px] focus-visible:ring-1 focus-visible:ring-primary placeholder:text-muted-foreground/50";

const MATCH_OPTIONS: {
  value: MatchType;
  labelKey: string;
  fallback: string;
  hintKey: string;
  hintFallback: string;
}[] = [
  {
    value: "fuzzy",
    labelKey: "categories.smartMatch",
    fallback: "Smart",
    hintKey: "categories.matchHelp_SMART",
    hintFallback: "Matches when all selected words appear, in any order.",
  },
  {
    value: "contains",
    labelKey: "categories.contains",
    fallback: "Contains",
    hintKey: "categories.matchHelp_CONTAINS",
    hintFallback: "Matches when the pattern appears anywhere in the description.",
  },
  {
    value: "starts_with",
    labelKey: "categories.startsWith",
    fallback: "Starts with",
    hintKey: "categories.matchHelp_STARTS_WITH",
    hintFallback: "Matches when the description begins with the pattern.",
  },
  {
    value: "ends_with",
    labelKey: "categories.endsWith",
    fallback: "Ends with",
    hintKey: "categories.matchHelp_ENDS_WITH",
    hintFallback: "Matches when the description ends with the pattern.",
  },
  {
    value: "exact",
    labelKey: "categories.exact",
    fallback: "Exact",
    hintKey: "categories.matchHelp_EXACT",
    hintFallback: "Matches only when the description is identical to the pattern.",
  },
];

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
  skipLabel,
}: RuleEditorDialogProps) {
  const { t } = useTranslation("settings");
  const { t: tc } = useTranslation("common");
  const { accounts } = useAccounts();
  const allTokens = useMemo(() => extractTokens(description), [description]);
  const suggested = useMemo(
    () => buildRuleFromCorrection(description, movement, categorySlug),
    [description, movement, categorySlug],
  );

  const [matchType, setMatchType] = useState<MatchType>(suggested.match_type);
  const [selectedTokens, setSelectedTokens] = useState<string[]>(suggested.tokens);
  const [customPattern, setCustomPattern] = useState<string>(suggested.pattern);
  const [patternEdited, setPatternEdited] = useState(false);
  const [accountScope, setAccountScope] = useState<string[] | null>(
    defaultAccountId ? [defaultAccountId] : null,
  );
  const [retroScope, setRetroScope] = useState<RetroScope>("all");
  const [customSince, setCustomSince] = useState("");

  useEffect(() => {
    if (open) {
      setMatchType(suggested.match_type);
      setSelectedTokens(suggested.tokens);
      setCustomPattern(suggested.pattern);
      setPatternEdited(false);
      setAccountScope(defaultAccountId ? [defaultAccountId] : null);
      setRetroScope("all");
      setCustomSince("");
    }
  }, [open, suggested, defaultAccountId]);

  const effectivePattern = useMemo(() => {
    if (matchType === "fuzzy") {
      return patternEdited ? customPattern : selectedTokens.join(" ");
    }
    return customPattern;
  }, [matchType, patternEdited, customPattern, selectedTokens]);

  const effectiveTokens = useMemo(() => {
    if (matchType === "fuzzy") {
      return patternEdited ? extractTokens(customPattern) : selectedTokens;
    }
    return [];
  }, [matchType, patternEdited, customPattern, selectedTokens]);

  const toggleToken = (tok: string) => {
    setPatternEdited(false);
    setSelectedTokens((prev) =>
      prev.includes(tok) ? prev.filter((x) => x !== tok) : [...prev, tok],
    );
  };

  const { matched, isLoading: countLoading } = useRulePreview({
    matchType,
    pattern: effectivePattern,
    tokens: effectiveTokens,
    movement,
    accountIds: accountScope,
    enabled: open,
  });

  const scopedIds = useMemo(
    () => filterByScope(matched, retroScope, customSince ? customSince + "-01" : undefined),
    [matched, retroScope, customSince],
  );
  const matchCount = scopedIds.length;

  const ruleAccountId = accountScope && accountScope.length === 1 ? accountScope[0] : null;

  const canSave = effectivePattern.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    onConfirm({
      match_type: matchType,
      pattern: effectivePattern.trim(),
      tokens: effectiveTokens,
      movement,
      category: categorySlug,
      original_description: description,
      matchingTransactionIds: scopedIds,
      account_id: ruleAccountId,
      account_ids: accountScope,
    });
  };

  const currentMeta = MATCH_OPTIONS.find((o) => o.value === matchType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] bg-card rounded-2xl p-0 gap-0 overflow-hidden border-0 shadow-lg">
        <DialogHeader className="px-7 pt-6 pb-0">
          <DialogTitle className="text-[17px] font-semibold text-foreground">
            {tc("imports.ruleNudgeCta", "Create rule")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {tc("imports.ruleNudgeCta", "Create rule")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 px-7 pt-5 pb-6 max-h-[75vh] overflow-y-auto">
          {/* Description (read-only) + category tag */}
          <div>
            <label className={LABEL}>
              {tc("imports.description", "Description")}
            </label>
            <div className="flex items-center gap-2 rounded-xl bg-muted/50 px-4 py-3">
              <p className="flex-1 min-w-0 text-[14px] font-mono text-foreground break-all leading-snug truncate">
                {description}
              </p>
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold shrink-0"
                style={
                  categoryColorVar
                    ? {
                        backgroundColor: `hsl(var(${categoryColorVar}) / 0.15)`,
                        color: `hsl(var(${categoryColorVar}))`,
                      }
                    : undefined
                }
              >
                {categoryIcon && (
                  <CategoryIcon
                    iconName={categoryIcon}
                    colorVar={categoryColorVar}
                    size="sm"
                    showBackground={false}
                  />
                )}
                {categoryLabel}
              </span>
            </div>
          </div>

          {/* Pattern */}
          <div>
            <label className={LABEL}>
              {t("categories.pattern", "Pattern")}
            </label>
            <Input
              value={
                matchType === "fuzzy" && !patternEdited
                  ? selectedTokens.join(" ")
                  : customPattern
              }
              onChange={(e) => {
                setPatternEdited(true);
                setCustomPattern(e.target.value);
              }}
              placeholder={t("categories.patternPlaceholder", "e.g. WOSAP, Netflix...")}
              className={cn(PILL_INPUT, "font-mono")}
              maxLength={200}
            />
          </div>

          {/* Token chips (fuzzy mode) */}
          {matchType === "fuzzy" && allTokens.length > 1 && (
            <div className="flex flex-wrap gap-1.5 -mt-2">
              {allTokens.map((tok) => {
                const active = selectedTokens.includes(tok);
                return (
                  <button
                    key={tok}
                    type="button"
                    onClick={() => toggleToken(tok)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                      active
                        ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                        : "bg-muted text-muted-foreground hover:bg-muted/80",
                    )}
                  >
                    {tok}
                  </button>
                );
              })}
            </div>
          )}

          {/* Match type — pill segmented control */}
          <div>
            <label className={LABEL}>
              {t("categories.matchType", "Match type")}
            </label>
            <div className="flex rounded-xl bg-muted/50 p-1">
              {MATCH_OPTIONS.map((opt) => {
                const active = matchType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setMatchType(opt.value)}
                    className={cn(
                      "flex flex-1 items-center justify-center rounded-lg py-2.5 text-[11px] font-medium transition-all",
                      active
                        ? "bg-card text-foreground shadow-sm font-semibold"
                        : "text-muted-foreground hover:text-foreground/70",
                    )}
                  >
                    {t(opt.labelKey, opt.fallback)}
                  </button>
                );
              })}
            </div>
            {currentMeta && (
              <p className="text-[11px] text-muted-foreground leading-relaxed mt-1.5 px-1">
                {t(currentMeta.hintKey, currentMeta.hintFallback)}
              </p>
            )}
          </div>

          {/* Account scope */}
          <AccountScopeSelect
            accounts={accounts}
            value={accountScope}
            onChange={setAccountScope}
          />

          {/* Time-range scope */}
          {matched.length > 0 && (
            <RetroactiveApplyOptions
              transactions={matched}
              scope={retroScope}
              onScopeChange={setRetroScope}
              customSince={customSince}
              onCustomSinceChange={setCustomSince}
              compact
            />
          )}

          {/* Live preview */}
          <div className="rounded-xl bg-warning/10 px-5 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Sparkles
                className={cn(
                  "w-4 h-4 shrink-0",
                  canSave ? "text-primary" : "text-muted-foreground/60",
                )}
              />
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-foreground">
                  {tc("imports.rulePreviewTitle", "Live preview")}
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {tc("imports.rulePreviewDesc", "Matches existing transactions in your history")}
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div
                className={cn(
                  "text-lg font-bold tabular-nums leading-none",
                  canSave ? "text-primary" : "text-muted-foreground",
                )}
              >
                {countLoading ? "…" : matchCount}
              </div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-0.5">
                {matchCount === 1
                  ? tc("imports.ruleMatchSingular", "match")
                  : tc("imports.ruleMatchPlural", "matches")}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-1">
            {onSkip ? (
              <Button
                variant="outline"
                className="flex-1 h-12 rounded-xl font-semibold text-[14px] border-border"
                onClick={() => {
                  onSkip();
                  onOpenChange(false);
                }}
              >
                {skipLabel || tc("imports.cancel", "Cancel")}
              </Button>
            ) : (
              <Button
                variant="outline"
                className="flex-1 h-12 rounded-xl font-semibold text-[14px] border-border"
                onClick={() => onOpenChange(false)}
              >
                {tc("imports.cancel", "Cancel")}
              </Button>
            )}
            <Button
              className="flex-1 h-12 rounded-xl font-semibold text-[14px] gap-1.5"
              disabled={!canSave}
              onClick={handleSave}
            >
              <Wand2 className="w-4 h-4" />
              {tc("imports.ruleSaveRule", "Save rule")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
