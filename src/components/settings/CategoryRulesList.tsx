import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Pencil, ChevronRight, Palette, Sparkles, Smile } from 'lucide-react';
import { icons } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCategoryTranslations } from '@/hooks/useCategoryTranslations';
import { CategoryIcon } from '@/components/ui/category-icon';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Database } from '@/integrations/supabase/types';
import { ColorIconPicker } from '@/components/settings/ColorIconPicker';
import type { CustomCategoryRule, VisualOverride } from '@/hooks/useCustomCategories';
import { cn } from '@/lib/utils';

type Category = Database['public']['Tables']['categories']['Row'];
type Rule = Database['public']['Tables']['categorization_rules']['Row'];

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

// Friendly examples per category slug — shown as placeholders when there are no rules
const EXAMPLE_PATTERNS: Record<string, { type: string; pattern: string }> = {
  groceries: { type: 'Contains', pattern: 'mercadona' },
  restaurants: { type: 'Contains', pattern: 'uber eats' },
  transport: { type: 'Contains', pattern: 'cabify' },
  travel: { type: 'Contains', pattern: 'booking.com' },
  housing: { type: 'Contains', pattern: 'alquiler' },
  health: { type: 'Contains', pattern: 'farmacia' },
  entertainment: { type: 'Contains', pattern: 'cinepolis' },
  subscriptions: { type: 'Contains', pattern: 'netflix' },
  shopping: { type: 'Contains', pattern: 'amazon' },
  sports: { type: 'Contains', pattern: 'basic fit' },
  education: { type: 'Contains', pattern: 'udemy' },
  pets: { type: 'Contains', pattern: 'kiwoko' },
  other: { type: 'Contains', pattern: 'misc' },
  salary: { type: 'Contains', pattern: 'nomina' },
  rents: { type: 'Contains', pattern: 'alquiler recibido' },
  investment: { type: 'Contains', pattern: 'dividendos' },
  transfers: { type: 'Contains', pattern: 'bizum' },
};

function renderLucide(iconName: string, size = 18) {
  const I = icons[iconName as keyof typeof icons];
  if (!I) return null;
  return <I size={size} strokeWidth={2} />;
}

interface GroupShellProps {
  accent: string;
  iconNode: React.ReactNode;
  name: string;
  isCustom?: boolean;
  ruleCount: number;
  expanded: boolean;
  onToggle: () => void;
  onEditCategory?: () => React.ReactNode; // returns popover content
  onDelete?: () => void;
  children: React.ReactNode;
}

function GroupShell({
  accent,
  iconNode,
  name,
  isCustom,
  ruleCount,
  expanded,
  onToggle,
  onEditCategory,
  onDelete,
  children,
}: GroupShellProps) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      {/* Group header band — Airtable style */}

      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-muted/30"
        style={{ backgroundColor: `${accent}0F` }}
      >
        <ChevronRight
          className={cn(
            'w-4 h-4 text-muted-foreground transition-transform shrink-0',
            expanded && 'rotate-90'
          )}
        />
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${accent}24`, color: accent }}
        >
          {iconNode}
        </div>
        <span
          className="text-[14px] font-semibold tracking-tight truncate"
          style={{ color: accent }}
        >
          {name}
        </span>
        {isCustom && (
          <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-background/80 text-foreground/70 font-semibold shrink-0">
            Custom
          </span>
        )}
        <span className="text-[11px] text-muted-foreground tabular-nums ml-1">
          {ruleCount} {ruleCount === 1 ? 'rule' : 'rules'}
        </span>

        <div className="ml-auto flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
          {onEditCategory && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors"
                  aria-label="Customize color & icon"
                  title="Customize color & icon"
                >
                  <Palette className="w-3.5 h-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[320px] p-3">
                {onEditCategory()}
              </PopoverContent>
            </Popover>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-background/80 transition-colors"
              aria-label="Delete custom category"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </button>

      {/* Rules table */}
      {expanded && (
        <div className="bg-card">
          {/* Column headers — Match type + Pattern only (row actions appear on hover) */}
          <div className="grid grid-cols-[140px_1fr_72px] items-center gap-3 px-3 py-1.5 border-b border-border/60 bg-muted/20">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
              Match type
            </span>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
              Pattern
            </span>
            <span />
          </div>
          {children}
        </div>
      )}
    </div>
  );
}

interface RuleRowProps {
  matchType: string;
  pattern: string;
  accent: string;
  onEdit?: () => void;
  onDelete?: () => void;
  placeholder?: boolean;
}

function RuleRow({ matchType, pattern, accent, onEdit, onDelete, placeholder }: RuleRowProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-[140px_1fr_72px] items-center gap-3 px-3 py-2 border-b border-border/40 last:border-b-0 group/row transition-colors',
        placeholder ? 'bg-transparent' : 'hover:bg-muted/20'
      )}
    >
      <span
        className={cn(
          'text-[11px] font-semibold uppercase tracking-wider truncate',
          placeholder && 'text-muted-foreground/60'
        )}
        style={placeholder ? undefined : { color: accent }}
      >
        {matchType}
      </span>
      <div className="flex items-center gap-2 min-w-0">
        {placeholder && (
          <Sparkles className="w-3 h-3 text-muted-foreground/50 shrink-0" />
        )}
        <code
          className={cn(
            'text-[13px] font-mono truncate',
            placeholder ? 'text-muted-foreground/60 italic' : 'text-foreground'
          )}
        >
          {placeholder ? `e.g. "${pattern}"` : pattern}
        </code>
      </div>
      <div className="flex items-center justify-end gap-0.5">
        {!placeholder && onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-background opacity-0 group-hover/row:opacity-100 transition-all"
            aria-label="Edit rule"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
        {!placeholder && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-background opacity-0 group-hover/row:opacity-100 transition-all"
            aria-label="Delete rule"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function AddRuleRow({ accent, onAdd }: { accent: string; onAdd: () => void }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
    >
      <Plus className="w-3.5 h-3.5" style={{ color: accent }} />
      <span>Add rule</span>
    </button>
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
  // Default: all groups expanded so the user sees the empty/example row right away
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggle = (id: string) =>
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));

  const resolveCssColor = (override: VisualOverride | undefined, slug: string) => {
    if (override?.color) return `hsl(${override.color})`;
    const v = getCategoryColor(slug);
    return `hsl(var(--${v}))`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">

      {/* System categories */}
      {categories.map((cat) => {
        const slug = cat.slug || cat.name;
        const rules = getRulesForCategory(cat.id);
        const override = getVisualOverride?.(slug);
        const accent = resolveCssColor(override, slug);
        const defaultIcon = getCategoryIcon(slug);
        const displayIcon = override?.icon || defaultIcon;
        const expanded = !collapsed[cat.id];
        const example = EXAMPLE_PATTERNS[slug] || { type: 'Contains', pattern: 'keyword' };

        return (
          <GroupShell
            key={cat.id}
            accent={accent}
            iconNode={
              override?.icon ? (
                renderLucide(displayIcon, 16)
              ) : (
                <CategoryIcon
                  iconName={displayIcon}
                  colorVar={getCategoryColor(slug)}
                  size="sm"
                  showBackground={false}
                />
              )
            }
            name={getCategoryLabel(slug)}
            ruleCount={rules.length}
            expanded={expanded}
            onToggle={() => toggle(cat.id)}
            onEditCategory={
              onSetVisualOverride
                ? () => (
                    <ColorIconPicker
                      currentColor={override?.color || '210 30% 50%'}
                      currentIcon={override?.icon || defaultIcon}
                      onSave={(c, i) => onSetVisualOverride(slug, c, i)}
                    />
                  )
                : undefined
            }
          >
            {rules.length === 0 ? (
              <RuleRow
                placeholder
                matchType={example.type}
                pattern={example.pattern}
                accent={accent}
              />
            ) : (
              rules.map((rule) => (
                <RuleRow
                  key={rule.id}
                  matchType={matchTypeLabel(rule.match_type, t)}
                  pattern={rule.pattern}
                  accent={accent}
                  onEdit={() => onEditRule(rule, cat)}
                  onDelete={() => onDeleteRule(rule.id)}
                />
              ))
            )}
            <AddRuleRow accent={accent} onAdd={() => onAddRule(cat)} />
          </GroupShell>
        );
      })}

      {/* Custom categories */}
      {customCategories.map((cat, idx) => {
        const customId = `custom-${cat.slug}-${idx}`;
        const accent = `hsl(${cat.color || '210 30% 50%'})`;
        const iconName = cat.icon || 'circle';
        const expanded = !collapsed[customId];

        return (
          <GroupShell
            key={customId}
            accent={accent}
            iconNode={renderLucide(iconName, 16)}
            name={cat.name}
            isCustom
            ruleCount={cat.keywords.length}
            expanded={expanded}
            onToggle={() => toggle(customId)}
            onDelete={onDeleteCustomCategory ? () => onDeleteCustomCategory(cat) : undefined}
          >
            {cat.keywords.length === 0 ? (
              <RuleRow
                placeholder
                matchType="Contains"
                pattern="keyword"
                accent={accent}
              />
            ) : (
              cat.keywords.map((kw, ki) => (
                <RuleRow
                  key={ki}
                  matchType="Contains"
                  pattern={kw}
                  accent={accent}
                />
              ))
            )}
          </GroupShell>
        );
      })}

      {categories.length === 0 && customCategories.length === 0 && (
        <div className="lg:col-span-2 rounded-xl border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
          No categories yet.
        </div>
      )}

    </div>
  );
}
