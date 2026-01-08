import { OnboardingData } from './OnboardingModal';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown } from 'lucide-react';
import {
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  categoryEmojis,
  getCategoryLabel,
} from '@/lib/categoryTranslations';

interface StepCategoriesProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

// Get onboarding-specific text based on selected language
const getOnboardingText = (key: string, language: string) => {
  const texts: Record<string, Record<string, string>> = {
    income_tab: {
      es: 'Ingresos',
      en: 'Income',
      pt: 'Receitas',
      fr: 'Revenus',
      it: 'Entrate',
      de: 'Einnahmen',
    },
    expense_tab: {
      es: 'Gastos',
      en: 'Expenses',
      pt: 'Despesas',
      fr: 'Dépenses',
      it: 'Spese',
      de: 'Ausgaben',
    },
    select_income_categories: {
      es: 'Selecciona las categorías de ingresos que quieres usar.',
      en: 'Select the income categories you want to use.',
      pt: 'Selecione as categorias de receita que deseja usar.',
      fr: 'Sélectionnez les catégories de revenus à utiliser.',
      it: 'Seleziona le categorie di entrate che vuoi usare.',
      de: 'Wählen Sie die Einnahmekategorien aus.',
    },
    select_expense_categories: {
      es: 'Selecciona las categorías de gastos que quieres usar.',
      en: 'Select the expense categories you want to use.',
      pt: 'Selecione as categorias de despesas que deseja usar.',
      fr: 'Sélectionnez les catégories de dépenses à utiliser.',
      it: 'Seleziona le categorie di spese che vuoi usare.',
      de: 'Wählen Sie die Ausgabenkategorien aus.',
    },
    selected: {
      es: 'seleccionadas',
      en: 'selected',
      pt: 'selecionadas',
      fr: 'sélectionnées',
      it: 'selezionate',
      de: 'ausgewählt',
    },
    almost_done: {
      es: '🎉 ¡Casi listo! Haz clic en "Comenzar" para empezar.',
      en: '🎉 Almost done! Click "Get Started" to begin.',
      pt: '🎉 Quase pronto! Clique em "Começar" para iniciar.',
      fr: '🎉 Presque terminé! Cliquez sur "Commencer".',
      it: '🎉 Quasi fatto! Clicca su "Inizia" per cominciare.',
      de: '🎉 Fast fertig! Klicken Sie auf "Loslegen".',
    },
    always_included: {
      es: '(siempre incluida)',
      en: '(always included)',
      pt: '(sempre incluída)',
      fr: '(toujours incluse)',
      it: '(sempre inclusa)',
      de: '(immer enthalten)',
    },
  };
  return texts[key]?.[language] || texts[key]?.['en'] || key;
};

export function StepCategories({ data, updateData }: StepCategoriesProps) {
  const language = data.language || 'en';

  // Split categories into income and expense
  const incomeCategories = data.incomeCategories || [];
  const expenseCategories = data.expenseCategories || [];

  const toggleIncomeCategory = (categorySlug: string) => {
    // 'other_income' is always included
    if (categorySlug === 'other_income') return;

    const current = incomeCategories;
    const newCategories = current.includes(categorySlug)
      ? current.filter((c) => c !== categorySlug)
      : [...current, categorySlug];

    updateData({ incomeCategories: newCategories });
  };

  const toggleExpenseCategory = (categorySlug: string) => {
    // 'other_expense' is always included
    if (categorySlug === 'other_expense') return;

    const current = expenseCategories;
    const newCategories = current.includes(categorySlug)
      ? current.filter((c) => c !== categorySlug)
      : [...current, categorySlug];

    updateData({ expenseCategories: newCategories });
  };

  const renderCategoryGrid = (
    categories: string[],
    selectedCategories: string[],
    toggleFn: (slug: string) => void,
    alwaysIncludedSlug: string
  ) => (
    <div className="grid grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-2">
      {categories.map((slug) => {
        const isChecked = selectedCategories.includes(slug);
        const isDisabled = slug === alwaysIncludedSlug;

        return (
          <div
            key={slug}
            className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
              isChecked
                ? 'bg-primary/5 border-primary/20'
                : 'bg-background hover:bg-muted/50'
            } ${isDisabled ? 'opacity-70' : 'cursor-pointer'}`}
            onClick={() => !isDisabled && toggleFn(slug)}
          >
            <Checkbox
              id={slug}
              checked={isChecked}
              disabled={isDisabled}
              onCheckedChange={() => toggleFn(slug)}
            />
            <Label
              htmlFor={slug}
              className={`flex items-center gap-2 ${isDisabled ? '' : 'cursor-pointer'}`}
            >
              <span>{categoryEmojis[slug] || '📌'}</span>
              <span className="text-sm">
                {getCategoryLabel(slug, language)}
                {isDisabled && (
                  <span className="text-xs text-muted-foreground ml-1">
                    {getOnboardingText('always_included', language)}
                  </span>
                )}
              </span>
            </Label>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-4">
      <Tabs defaultValue="income" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="income" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            {getOnboardingText('income_tab', language)}
          </TabsTrigger>
          <TabsTrigger value="expense" className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4" />
            {getOnboardingText('expense_tab', language)}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="income" className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            {getOnboardingText('select_income_categories', language)}
          </p>
          {renderCategoryGrid(
            INCOME_CATEGORIES,
            incomeCategories,
            toggleIncomeCategory,
            'other_income'
          )}
          <p className="text-sm text-muted-foreground">
            {incomeCategories.length} {getOnboardingText('selected', language)}
          </p>
        </TabsContent>

        <TabsContent value="expense" className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            {getOnboardingText('select_expense_categories', language)}
          </p>
          {renderCategoryGrid(
            EXPENSE_CATEGORIES,
            expenseCategories,
            toggleExpenseCategory,
            'other_expense'
          )}
          <p className="text-sm text-muted-foreground">
            {expenseCategories.length} {getOnboardingText('selected', language)}
          </p>
        </TabsContent>
      </Tabs>

      <div className="p-4 rounded-lg bg-muted/50">
        <p className="text-sm text-muted-foreground">
          {getOnboardingText('almost_done', language)}
        </p>
      </div>
    </div>
  );
}
