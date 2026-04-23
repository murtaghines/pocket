import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Wand2, Sparkles, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CategoryIcon } from "@/components/ui/category-icon";
import {
  buildRuleFromCorrection,
  extractTokens,
  normalize,
  ruleMatchesDescription,
  type MatchType,
} from "@/lib/userRules";

/**
 * Professional rule editor dialog.
 *
 * Lets the user fine-tune a categorization rule before saving:
 *  • Pick which words from the original description form the pattern (token chips)
 *  • Or type a custom pattern manually
 *  • Choose a match strategy (smart, contains, starts/ends with, exact)
 *  • See a live count of how many existing transactions the rule would match
 */

export interface RuleEditorPayload {
  match_type: MatchType;
  pattern: string;
  tokens: string[];
  movement: string;
  category: string;
  original_description: string;
}

interface RuleEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Cleaned description shown to the user (also used for token suggestions). */
  description: string;
  /** Movement (INCOME/EXPENSE/TRANSFER) the rule will assign. */
  movement: string;
  /** Category slug the rule will assign. */
  categorySlug: string;
  categoryLabel: string;
  categoryColorVar?: string;
  categoryIcon?: string;
  onConfirm: (payload: RuleEditorPayload) => void | Promise<void>;
  /** Optional secondary action — e.g. "Just this one, don't save a rule". */
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
    label: "Smart match",
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
  // Suggested tokens from the description — defaults the user can toggle off
  const allTokens = useMemo(() => extractTokens(description), [description]);
  const suggested = useMemo(
    () => buildRuleFromCorrection(description, movement, categorySlug),
    [description, movement, categorySlug],
  );

  const [matchType, setMatchType] = useState<MatchType>(suggested.match_type);
  const [selectedTokens, setSelectedTokens] = useState<string[]>(suggested.tokens);
  const [customPattern, setCustomPattern] = useState<string>(suggested.pattern);
  const [patternEdited, setPatternEdited] = useState(false);

  // Reset whenever a new transaction triggers the dialog
  useEffect(() => {
    if (open) {
      setMatchType(suggested.match_type);
      setSelectedTokens(suggested.tokens);
      setCustomPattern(suggested.pattern);
      setPatternEdited(false);
    }
  }, [open, suggested]);

  // For non-fuzzy modes, the pattern is whatever the user typed; for fuzzy it's
  // derived from the selected tokens (unless they manually edited the input).
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

  // Live preview: how many existing tx would this rule match?
  const { data: matchCount = 0, isFetching: countLoading } = useQuery({
    queryKey: [
      "rule-preview",
      matchType,
      effectivePattern,
      effectiveTokens.join("|"),
      movement,
    ],
    enabled: open && effectivePattern.trim().length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;
      const { data, error } = await supabase
        .from("transactions")
        .select("description, description_norm, movement")
        .eq("user_id", user.id)
        .limit(1500);
      if (error) return 0;
      let n = 0;
      for (const row of data || []) {
        if (row.movement && row.movement !== movement) continue;
        const desc = (row.description_norm || row.description || "") as string;
        if (
          ruleMatchesDescription(matchType, effectivePattern, effectiveTokens, desc)
        ) {
          n++;
        }
      }
      return n;
    },
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
    });
  };

  const currentMeta = MATCH_OPTIONS.find((o) => o.value === matchType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl gap-0 p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 space-y-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
            <Wand2 className="w-5 h-5 text-primary" />
          </div>
          <div className="space-y-1.5">
            <DialogTitle>Create a categorization rule</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              Edit the pattern and choose how strict the match should be. Future
              transactions matching it will be tagged automatically.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="px-6 pb-5 space-y-5">
          {/* Original description + outcome */}
          <div className="rounded-xl border border-border/70 bg-muted/30 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] uppercase tracking-wide font-medium text-muted-foreground">
                Original description
              </span>
              <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>tag as</span>
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                  style={
                    categoryColorVar
                      ? {
                          backgroundColor: `hsl(var(${categoryColorVar}) / 0.12)`,
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

          {/* Pattern editor */}
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <Label
                htmlFor="rule-pattern"
                className="text-xs uppercase tracking-wide font-semibold text-muted-foreground"
              >
                Pattern
              </Label>
              {matchType === "fuzzy" && patternEdited && (
                <button
                  type="button"
                  onClick={() => {
                    setPatternEdited(false);
                    setCustomPattern(selectedTokens.join(" "));
                  }}
                  className="text-[11px] text-primary hover:underline"
                >
                  Reset to selected words
                </button>
              )}
            </div>
            <Input
              id="rule-pattern"
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
              className="font-mono text-sm h-10"
              maxLength={200}
            />
          </div>

          {/* Match-type selector */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">
              Match type
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {MATCH_OPTIONS.map((opt) => {
                const active = matchType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setMatchType(opt.value)}
                    className={cn(
                      "rounded-lg border px-2.5 py-1.5 text-left text-xs font-medium transition-colors",
                      active
                        ? "border-primary/40 bg-primary/8 text-primary ring-1 ring-primary/20"
                        : "border-border bg-card text-foreground hover:bg-muted",
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {currentMeta && (
              <p className="text-[11px] text-muted-foreground leading-relaxed pt-0.5">
                {currentMeta.hint}
              </p>
            )}
          </div>

          {/* Live preview */}
          <div
            className={cn(
              "rounded-xl border px-3.5 py-3 flex items-center justify-between gap-3",
              canSave
                ? "border-primary/20 bg-primary/[0.04]"
                : "border-border bg-muted/30",
            )}
          >
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
        <DialogFooter className="border-t border-border/70 bg-muted/30 px-6 py-4 sm:justify-between sm:gap-2">
          {onSkip ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 px-4 font-medium text-muted-foreground hover:text-foreground"
              onClick={() => {
                onSkip();
                onOpenChange(false);
              }}
            >
              <X className="w-4 h-4 mr-1.5" />
              {skipLabel}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 px-4 font-medium"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-9 px-4 font-medium"
              disabled={!canSave}
              onClick={handleSave}
            >
              <Wand2 className="w-4 h-4 mr-1.5" />
              Create rule
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}