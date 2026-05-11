import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Trash2, Pencil, ChevronDown, Palette } from 'lucide-react';
import { icons } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCategoryTranslations } from '@/hooks/useCategoryTranslations';
import { CategoryIcon } from '@/components/ui/category-icon';
import type { Database } from '@/integrations/supabase/types';
import { ColorIconPicker } from '@/components/settings/ColorIconPicker';
import type { CustomCategoryRule, VisualOverride } from '@/hooks/useCustomCategories';
import { cn } from '@/lib/utils';

type Category = Database["public"]["Tables"]["categories"]["Row"];
type Rule = Database["public"]["Tables"]["categorization_rules"]["Row"];

interface Props {
  categories: Category[];
  getRulesForCategory: (categoryId: string) => Rule[];
  onAddRule: (category: Category) => void;
  onEditRule: (rule: Rule, category: Category) => void;
  onDeleteRule: (ruleId: string) => void;
  customCategories?: CustomCategoryRule[];
  onDeleteCustomCategory?: (cat: CustomCategoryRule) => void;
  getVisualOverride?: (slug: string) => VisualOverride | undefined;
  onSetVisualOverride?: (slug: string, color?: string, icon?: string) => Promise<void>;
}

const matchTypeLabel = (mt: string, t: (k: string) => string) => {
  if (mt === 'SMART') return t('categories.smartMatch');
  if (mt === 'STARTS_WITH') return t('categories.startsWith');
  if (mt === 'REGEX') return t('categories.regex');
  if (mt === 'EXACT') return t('categories.exact');
  return t('categories.contains');
};

function renderLucide(iconName: string, size = 22) {
  const I = icons[iconName as keyof typeof icons];
  if (!I) return null;
  return <I size={size} strokeWidth={2} />;
}

function CategoryRow({
  accent,
  iconNode,
  name,
  ruleCount,
  isOpen,
  onToggle,
  editTrigger,
  rightSlot,
  children,
  isCustom,
}: {
  accent: string; // css color
  iconNode: React.ReactNode;
  name: string;
  ruleCount: number;
  isOpen: boolean;
  onToggle: () => void;
  editTrigger?: React.ReactNode;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
  isCustom?: boolean;
}) {
  return (
    <div className="group border-b border-border/60 last:border-b-0">
      <div
        className={cn(
          "flex items-center gap-4 px-4 py-3 transition-colors cursor-pointer",
          isOpen ? "bg-muted/40" : "hover:bg-muted/30"
        )}
        onClick={onToggle}
      >
        {/* Icon + name as a unified colored chip */}
        <div
          className="flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-xl min-w-0 flex-1"
          style={{
            backgroundColor: `${accent}14`,
          }}
        >
          <div
            className="relative w-11 h-11 rounded-lg flex items-center justify-center shrink-0"
            style={{
              backgroundColor: `${accent}2E`,
              color: accent,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {iconNode}
            {editTrigger && (
              <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center bg-foreground/40 backdrop-blur-[1px]">
                {editTrigger}
              </div>
            )}
          </div>

          <div className="min-w-0 flex items-center gap-2">
            <span
              className="text-[16px] font-semibold truncate"
              style={{ color: accent }}
            >
              {name}
            </span>
            {isCustom && (
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-background/70 text-foreground/70 font-semibold shrink-0">
                Custom
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {ruleCount > 0 ? (
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{
                backgroundColor: `${accent}1F`,
                color: accent,
              }}
            >
              {ruleCount} {ruleCount === 1 ? 'rule' : 'rules'}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">No rules</span>
          )}
          {rightSlot}
          <ChevronDown
            className={cn(
              "w-4 h-4 text-muted-foreground transition-transform shrink-0",
              isOpen && "rotate-180"
            )}
          />
        </div>
      </div>

      {isOpen && (
        <div className="px-4 pb-4 pt-1 bg-muted/20" onClick={(e) => e.stopPropagation()}>
          {children}
        </div>
      )}
    </div>
  );
}

export function CategoryRulesList({
  categories,
  getRulesForCategory,
  onAddRule,
  onEditRule,
  onDeleteRule,
  customCategories = [],
  onDeleteCustomCategory,
  getVisualOverride,
  onSetVisualOverride,
}: Props) {
  const { t } = useTranslation('settings');
  const { getCategoryLabel, getCategoryIcon, getCategoryColor } = useCategoryTranslations();
  const [expanded, setExpanded] = useState<string | null>(null);

  const resolveCssColor = (override: VisualOverride | undefined, slug: string) => {
    if (override?.color) return `hsl(${override.color})`;
    const v = getCategoryColor(slug);
    return `hsl(var(--${v}))`;
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* System categories */}
      {categories.map((cat) => {
        const slug = cat.slug || cat.name;
        const rules = getRulesForCategory(cat.id);
        const isOpen = expanded === cat.id;
        const override = getVisualOverride?.(slug);
        const accent = resolveCssColor(override, slug);
        const defaultIcon = getCategoryIcon(slug);
        const displayIcon = override?.icon || defaultIcon;

        return (
          <CategoryRow
            key={cat.id}
            accent={accent}
            iconNode={
              override?.icon ? (
                renderLucide(displayIcon, 22)
              ) : (
                <CategoryIcon iconName={displayIcon} colorVar={getCategoryColor(slug)} size="md" showBackground={false} />
              )
            }
            name={getCategoryLabel(slug)}
            ruleCount={rules.length}
            isOpen={isOpen}
            onToggle={() => setExpanded(isOpen ? null : cat.id)}
            editTrigger={
              onSetVisualOverride && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className="p-1.5 rounded-md text-white hover:scale-110 transition-transform"
                      onClick={(e) => e.stopPropagation()}
                      aria-label="Edit color & icon"
                    >
                      <Palette className="w-4 h-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[340px] p-4" align="start" onClick={(e) => e.stopPropagation()}>
                    <ColorIconPicker
                      currentColor={override?.color || '210 30% 50%'}
                      currentIcon={override?.icon || defaultIcon}
                      onSave={(c, i) => onSetVisualOverride(slug, c, i)}
                    />
                  </PopoverContent>
                </Popover>
              )
            }
          >
            {rules.length === 0 ? (
              <div className="flex items-center justify-between gap-3 py-2">
                <p className="text-sm text-muted-foreground">
                  No custom rules yet. Add keywords to fine-tune how transactions are categorized.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 gap-1.5"
                  onClick={() => onAddRule(cat)}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add rule
                </Button>
              </div>
            ) : (
              <div className="space-y-1.5 pt-1">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center gap-3 bg-card border border-border rounded-lg px-3 py-2 hover:border-primary/40 transition-colors"
                  >
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground shrink-0 w-20">
                      {matchTypeLabel(rule.match_type, t)}
                    </span>
                    <code className="text-sm font-mono text-foreground flex-1 truncate">{rule.pattern}</code>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => onEditRule(rule, cat)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => onDeleteRule(rule.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full justify-start gap-1.5 text-muted-foreground hover:text-foreground mt-1"
                  onClick={() => onAddRule(cat)}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add another rule
                </Button>
              </div>
            )}
          </CategoryRow>
        );
      })}

      {/* Custom categories */}
      {customCategories.map((cat, idx) => {
        const customId = `custom-${cat.slug}-${idx}`;
        const isOpen = expanded === customId;
        const accent = `hsl(${cat.color || '210 30% 50%'})`;
        const iconName = cat.icon || 'circle';

        return (
          <CategoryRow
            key={customId}
            accent={accent}
            iconNode={renderLucide(iconName, 22)}
            name={cat.name}
            ruleCount={cat.keywords.length}
            isOpen={isOpen}
            onToggle={() => setExpanded(isOpen ? null : customId)}
            isCustom
            rightSlot={
              onDeleteCustomCategory && (
                <button
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-background text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteCustomCategory(cat);
                  }}
                  aria-label="Delete custom category"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )
            }
          >
            {cat.keywords.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No keywords yet.</p>
            ) : (
              <div className="space-y-1.5 pt-1">
                {cat.keywords.map((kw, ki) => (
                  <div
                    key={ki}
                    className="flex items-center gap-3 bg-card border border-border rounded-lg px-3 py-2"
                  >
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground shrink-0 w-20">
                      Contains
                    </span>
                    <code className="text-sm font-mono text-foreground flex-1 truncate">{kw}</code>
                  </div>
                ))}
              </div>
            )}
          </CategoryRow>
        );
      })}

      {categories.length === 0 && customCategories.length === 0 && (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
          No categories yet.
        </div>
      )}
    </div>
  );
}
