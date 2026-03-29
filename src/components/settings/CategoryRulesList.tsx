import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Trash2, Pencil, ChevronDown, ChevronRight, Palette } from 'lucide-react';
import { icons } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCategoryTranslations } from '@/hooks/useCategoryTranslations';
import { CategoryIcon } from '@/components/ui/category-icon';
import type { Database } from '@/integrations/supabase/types';
import type { CustomCategoryRule, VisualOverride } from '@/hooks/useCustomCategories';

type Category = Database["public"]["Tables"]["categories"]["Row"];
type Rule = Database["public"]["Tables"]["categorization_rules"]["Row"];

const CURATED_COLORS = [
  '220 70% 55%', '250 60% 58%', '280 55% 55%', '310 50% 55%',
  '340 65% 55%', '25 80% 55%', '45 85% 50%', '175 60% 42%',
  '195 70% 48%', '160 50% 45%', '35 60% 50%', '270 40% 50%',
  '200 50% 40%', '15 70% 50%', '330 45% 50%', '210 30% 50%',
];

const CURATED_ICONS = [
  'coffee', 'gift', 'baby', 'music', 'book', 'wrench',
  'scissors', 'palette', 'flame', 'zap', 'sparkles', 'crown',
  'star', 'tag', 'anchor', 'compass', 'umbrella', 'wine',
  'cake', 'dog', 'cat', 'truck', 'shield', 'key',
];

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

const matchTypeKey = (mt: string) => {
  if (mt === 'SMART') return 'categories.smartMatch';
  if (mt === 'STARTS_WITH') return 'categories.startsWith';
  if (mt === 'REGEX') return 'categories.regex';
  if (mt === 'EXACT') return 'categories.exact';
  return 'categories.contains';
};

function ColorIconPicker({
  currentColor,
  currentIcon,
  onSave,
}: {
  currentColor: string;
  currentIcon: string;
  onSave: (color: string, icon: string) => void;
}) {
  const [color, setColor] = useState(currentColor);
  const [icon, setIcon] = useState(currentIcon);
  const { t } = useTranslation('settings');

  const renderIcon = (iconName: string, size = 14) => {
    const Ic = icons[iconName as keyof typeof icons];
    return Ic ? <Ic size={size} /> : null;
  };

  return (
    <div className="space-y-3 p-1">
      <div className="space-y-1.5">
        <span className="text-[11px] font-medium text-muted-foreground">{t('categories.color', 'Color')}</span>
        <div className="flex flex-wrap gap-1.5">
          {CURATED_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className="w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center hover:scale-110"
              style={{
                backgroundColor: `hsl(${c})`,
                borderColor: color === c ? 'hsl(var(--foreground))' : 'transparent',
              }}
              onClick={() => setColor(c)}
            >
              {color === c && <Check className="w-3 h-3 text-white" />}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <span className="text-[11px] font-medium text-muted-foreground">{t('categories.icon', 'Icon')}</span>
        <div className="flex flex-wrap gap-1 max-h-[120px] overflow-y-auto">
          {CURATED_ICONS.map((ic) => (
            <button
              key={ic}
              type="button"
              className="w-7 h-7 rounded-md border transition-all flex items-center justify-center hover:bg-muted/80"
              style={{
                borderColor: icon === ic ? `hsl(${color})` : 'hsl(var(--border))',
                backgroundColor: icon === ic ? `hsl(${color} / 0.1)` : undefined,
                color: icon === ic ? `hsl(${color})` : 'hsl(var(--muted-foreground))',
              }}
              onClick={() => setIcon(ic)}
            >
              {renderIcon(ic, 13)}
            </button>
          ))}
        </div>
      </div>
      <Button size="sm" className="w-full h-7 text-xs" onClick={() => onSave(color, icon)}>
        {t('categories.save', 'Save')}
      </Button>
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

  const renderIcon = (iconName: string, size = 14) => {
    const IconComponent = icons[iconName as keyof typeof icons];
    if (!IconComponent) return null;
    return <IconComponent size={size} />;
  };

  return (
    <div className="space-y-0.5">
      {/* System categories */}
      {categories.map((cat) => {
        const slug = cat.slug || cat.name;
        const rules = getRulesForCategory(cat.id);
        const isOpen = expanded === cat.id;
        const override = getVisualOverride?.(slug);
        const defaultColorVar = getCategoryColor(slug);
        const defaultIcon = getCategoryIcon(slug);
        // Use override color as raw HSL, else use CSS var
        const hasOverrideColor = !!override?.color;
        const accentColor = hasOverrideColor ? override.color! : undefined;
        const displayIcon = override?.icon || defaultIcon;

        return (
          <div key={cat.id}>
            <button
              className="w-full flex items-center gap-2.5 px-2 py-2 text-left hover:bg-muted/60 transition-colors rounded-md group"
              onClick={() => setExpanded(isOpen ? null : cat.id)}
            >
              <div
                className="w-1 h-5 rounded-full shrink-0 transition-opacity group-hover:opacity-100 opacity-60"
                style={{ backgroundColor: accentColor ? `hsl(${accentColor})` : `hsl(var(--${defaultColorVar}))` }}
              />
              {override?.icon ? (
                <div
                  className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: accentColor ? `hsl(${accentColor} / 0.12)` : `hsl(var(--${defaultColorVar}) / 0.12)`,
                    color: accentColor ? `hsl(${accentColor})` : `hsl(var(--${defaultColorVar}))`,
                  }}
                >
                  {renderIcon(displayIcon, 12)}
                </div>
              ) : (
                <CategoryIcon
                  iconName={displayIcon}
                  colorVar={defaultColorVar}
                  size="sm"
                  showBackground={false}
                />
              )}
              <span className="text-sm font-medium flex-1 truncate">
                {getCategoryLabel(slug)}
              </span>
              {rules.length > 0 && (
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {rules.length} {rules.length === 1 ? t('categories.rule') : t('categories.rules')}
                </span>
              )}
              {isOpen ? (
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              )}
            </button>

            {isOpen && (
              <div
                className="ml-3 pl-3 border-l-2 pb-2 pt-1 space-y-1.5 mb-1"
                style={{ borderColor: accentColor ? `hsl(${accentColor} / 0.3)` : `hsl(var(--${defaultColorVar}) / 0.3)` }}
              >
                {/* Color/Icon customization */}
                {onSetVisualOverride && (
                  <div className="flex items-center gap-1.5 pb-1">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-xs h-6 gap-1 text-muted-foreground hover:text-foreground px-2">
                          <Palette className="w-3 h-3" />
                          {t('categories.editColorIcon', 'Edit color & icon')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[280px] p-3" align="start">
                        <ColorIconPicker
                          currentColor={accentColor || '210 30% 50%'}
                          currentIcon={override?.icon || defaultIcon}
                          onSave={(c, i) => onSetVisualOverride(slug, c, i)}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                {rules.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-1 pl-1">
                    {t('categories.noRules')}
                  </p>
                ) : (
                  <div className="space-y-1">
                    {rules.map((rule) => (
                      <div
                        key={rule.id}
                        className="flex items-center justify-between gap-2 text-xs rounded-md px-2.5 py-1.5 bg-muted/40 hover:bg-muted/60 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider shrink-0">
                            {t(matchTypeKey(rule.match_type))}
                          </span>
                          <code className="text-xs font-mono truncate text-foreground/80">{rule.pattern}</code>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            onClick={(e) => { e.stopPropagation(); onEditRule(rule, cat); }}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={(e) => { e.stopPropagation(); onDeleteRule(rule.id); }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 w-full justify-start text-muted-foreground hover:text-foreground"
                  onClick={() => onAddRule(cat)}
                >
                  <Plus className="w-3 h-3 mr-1.5" />
                  {t('categories.addRule')}
                </Button>
              </div>
            )}
          </div>
        );
      })}

      {/* Custom categories */}
      {customCategories.map((cat, idx) => {
        const customId = `custom-${cat.slug}-${idx}`;
        const isOpen = expanded === customId;
        const color = cat.color || '210 30% 50%';
        const iconName = cat.icon || 'circle';

        return (
          <div key={customId}>
            <button
              className="w-full flex items-center gap-2.5 px-2 py-2 text-left hover:bg-muted/60 transition-colors rounded-md group"
              onClick={() => setExpanded(isOpen ? null : customId)}
            >
              <div
                className="w-1 h-5 rounded-full shrink-0 transition-opacity group-hover:opacity-100 opacity-60"
                style={{ backgroundColor: `hsl(${color})` }}
              />
              <div
                className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                style={{ backgroundColor: `hsl(${color} / 0.12)`, color: `hsl(${color})` }}
              >
                {renderIcon(iconName, 12)}
              </div>
              <span className="text-sm font-medium flex-1 truncate">
                {cat.name}
              </span>
              <Badge variant="outline" className="text-[9px] h-4 px-1.5 shrink-0 border-dashed">
                Custom
              </Badge>
              {cat.keywords.length > 0 && (
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {cat.keywords.length} {cat.keywords.length === 1 ? t('categories.rule') : t('categories.rules')}
                </span>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => { e.stopPropagation(); onDeleteCustomCategory?.(cat); }}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
              {isOpen ? (
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              )}
            </button>

            {isOpen && (
              <div className="ml-3 pl-3 border-l-2 pb-2 pt-1 space-y-1.5 mb-1" style={{ borderColor: `hsl(${color} / 0.3)` }}>
                {cat.keywords.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-1 pl-1">
                    {t('categories.noRules')}
                  </p>
                ) : (
                  <div className="space-y-1">
                    {cat.keywords.map((kw, ki) => (
                      <div
                        key={ki}
                        className="flex items-center gap-2 text-xs rounded-md px-2.5 py-1.5 bg-muted/40"
                      >
                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider shrink-0">
                          {t('categories.contains')}
                        </span>
                        <code className="text-xs font-mono truncate text-foreground/80">{kw}</code>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
