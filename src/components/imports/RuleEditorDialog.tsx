import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Wand2, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CategoryIcon } from "@/components/ui/category-icon";
import {
  buildRuleFromCorrection,
  extractTokens,
  normalize,
  type MatchType,
} from "@/lib/userRules";
import { useRulePreview } from "@/hooks/useRulePreview";

export interface RuleEditorPayload {
  match_type: MatchType;
  pattern: string;
  tokens: string[];
  movement: string;
  category: string;
  original_description: string;
  matchingTransactionIds: string[];
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
  onConfirm: (payload: RuleEditorPayload) => void | Promise<void>;
  onSkip?: () => void;
  skipLabel?: string;
}

const MATCH_OPTIONS: {
  value: MatchType;
  label: string;
  hint: string;
}[] = [
  {
    value: "fuzzy",
    label: "Smart",
    hint: "Matches when all selected words appear, in any order. Best default.",
  },
  {
    value: "contains",
    label: "Contains",
    hint: "Matches when the pattern appears anywhere in the description.",
  },
  {
    value: "starts_with",
    label: "Starts with",
    hint: "Matches when the description begins with the pattern.",
  },
  {
    value: "ends_with",
    label: "Ends with",
    hint: "Matches when the description ends with the pattern.",
  },
  {
    value: "exact",
    label: "Exact",
    hint: "Matches only when the description is identical to the pattern.",
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
  onConfirm,
  onSkip,
  skipLabel = "Just this one",
}: RuleEditorDialogProps) {
  const allTokens = useMemo(() => extractTokens(description), [description]);
  const suggested = useMemo(
    () => buildRuleFromCorrection(description, movement, categorySlug),
    [description, movement, categorySlug],
  );

  const [matchType, setMatchType] = useState<MatchType>(suggested.match_type);
  const [selectedTokens, setSelectedTokens] = useState<string[]>(suggested.tokens);
  const [customPattern, setCustomPattern] = useState<string>(suggested.pattern);
  const [patternEdited, setPatternEdited] = useState(false);

  useEffect(() => {
    if (open) {
      setMatchType(suggested.match_type);
      setSelectedTokens(suggested.tokens);
      setCustomPattern(suggested.pattern);
      setPatternEdited(false);
    }
  }, [open, suggested]);

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

  const toggleToken = (t: string) => {
    setPatternEdited(false);
    setSelectedTokens((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  };

  const { matchingIds: matchingTransactions, count: matchCount, isLoading: countLoading } = useRulePreview({
    matchType,
    pattern: effectivePattern,
    tokens: effectiveTokens,
    movement,
    enabled: open,
  });

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
      matchingTransactionIds: matchingTransactions,
    });
  };

  const currentMeta = MATCH_OPTIONS.find((o) => o.value === matchType);

  if (!open) return null;

  const panel = (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col bg-background transition-transform duration-300 ease-out",
        open ? "translate-y-0" : "translate-y-full",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-accent"
        >
          <X className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-foreground">
          Create rule
        </span>
        <div className="w-9" />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Original description + category tag */}
        <div className="rounded-xl bg-muted p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Description
            </span>
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <span>Tag as</span>
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold normal-case tracking-normal"
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
          <p className="text-sm font-mono text-foreground break-all leading-snug">
            {description}
          </p>
        </div>

        {/* Pattern */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Pattern
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
            placeholder={
              matchType === "exact"
                ? "Exact text to match"
                : "Text the description must include"
            }
            className="h-11 rounded-xl bg-muted border-0 shadow-none font-mono text-sm focus-visible:ring-1 focus-visible:ring-primary placeholder:text-muted-foreground/50"
            maxLength={200}
          />
        </div>

        {/* Token chips (fuzzy mode) */}
        {matchType === "fuzzy" && allTokens.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {allTokens.map((tok) => {
              const active = selectedTokens.includes(tok);
              return (
                <button
                  key={tok}
                  type="button"
                  onClick={() => toggleToken(tok)}
                  className={cn(
                    "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {tok}
                </button>
              );
            })}
          </div>
        )}

        {/* Match type — segmented control */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Match type
          </label>
          <div className="flex rounded-xl bg-muted p-1">
            {MATCH_OPTIONS.map((opt) => {
              const active = matchType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMatchType(opt.value)}
                  className={cn(
                    "flex flex-1 items-center justify-center rounded-lg py-2 text-[11px] font-medium transition-all",
                    active
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground",
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          {currentMeta && (
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {currentMeta.hint}
            </p>
          )}
        </div>

        {/* Live preview */}
        <div className="rounded-xl bg-muted p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Sparkles
              className={cn(
                "w-4 h-4 shrink-0",
                canSave ? "text-primary" : "text-muted-foreground/60",
              )}
            />
            <div className="min-w-0">
              <div className="text-xs font-medium text-foreground">
                Live preview
              </div>
              <div className="text-[11px] text-muted-foreground truncate">
                Will retroactively match transactions in your history.
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div
              className={cn(
                "text-lg font-semibold tabular-nums leading-none",
                canSave ? "text-primary" : "text-muted-foreground",
              )}
            >
              {countLoading ? "…" : matchCount}
            </div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-0.5">
              match{matchCount === 1 ? "" : "es"}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 pb-6 pt-3 bg-background space-y-2">
        <Button
          className="w-full h-12 rounded-xl gap-1.5"
          disabled={!canSave}
          onClick={handleSave}
        >
          <Wand2 className="w-4 h-4" />
          Save rule
        </Button>
        <Button
          variant="ghost"
          className="w-full h-10 rounded-xl text-muted-foreground"
          onClick={() => {
            onSkip?.();
            onOpenChange(false);
          }}
        >
          {onSkip ? skipLabel : "Cancel"}
        </Button>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}
