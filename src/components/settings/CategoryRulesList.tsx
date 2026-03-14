import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCategoryTranslations } from '@/hooks/useCategoryTranslations';
import { CategoryIcon } from '@/components/ui/category-icon';
import type { Database } from '@/integrations/supabase/types';

type Category = Database["public"]["Tables"]["categories"]["Row"];
type Rule = Database["public"]["Tables"]["categorization_rules"]["Row"];

interface Props {
  categories: Category[];
  getRulesForCategory: (categoryId: string) => Rule[];
  onAddRule: (category: Category) => void;
  onDeleteRule: (ruleId: string) => void;
}

export function CategoryRulesList({ categories, getRulesForCategory, onAddRule, onDeleteRule }: Props) {
  const { t } = useTranslation('settings');
  const { getCategoryLabel, getCategoryIcon, getCategoryColor } = useCategoryTranslations();
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-1.5">
      {categories.map((cat) => {
        const slug = cat.slug || cat.name;
        const rules = getRulesForCategory(cat.id);
        const isOpen = expanded === cat.id;

        return (
          <div key={cat.id} className="rounded-md border bg-background">
            <button
              className="w-full flex items-center gap-2 p-2.5 text-left hover:bg-muted/50 transition-colors rounded-md"
              onClick={() => setExpanded(isOpen ? null : cat.id)}
            >
              {isOpen ? (
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              )}
              <CategoryIcon
                iconName={getCategoryIcon(slug)}
                colorVar={getCategoryColor(slug)}
                size="sm"
              />
              <span className="text-sm font-medium flex-1 truncate">
                {getCategoryLabel(slug)}
              </span>
              {rules.length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {rules.length} {rules.length === 1 ? t('categories.rule') : t('categories.rules')}
                </Badge>
              )}
            </button>

            {isOpen && (
              <div className="px-3 pb-3 pt-1 border-t space-y-2">
                {rules.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-1">
                    {t('categories.noRules')}
                  </p>
                ) : (
                  <div className="space-y-1">
                    {rules.map((rule) => (
                      <div
                        key={rule.id}
                        className="flex items-center justify-between gap-2 text-xs bg-muted/30 rounded px-2 py-1.5"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {rule.match_type === 'exact' ? t('categories.exact') : t('categories.contains')}
                          </Badge>
                          <code className="text-xs font-mono truncate">{rule.pattern}</code>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
                          onClick={() => onDeleteRule(rule.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 w-full"
                  onClick={() => onAddRule(cat)}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  {t('categories.addRule')}
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
