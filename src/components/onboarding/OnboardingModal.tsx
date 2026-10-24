import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useProfile, type OnboardingAnswers } from '@/hooks/useProfile';
import { useLocalization, detectLocalePattern } from '@/hooks/useLocalization';
import { useToast } from '@/hooks/use-toast';
import { getLocaleForRegion } from '@/lib/currencies';
import { buildFullDatePattern, type DisplayFormat } from '@/lib/displayFormat';
import { ChevronLeft, ChevronRight, Check, Loader2, Search, PiggyBank, TrendingUp, Wallet, Plus, X } from 'lucide-react';
import { format } from 'date-fns';

interface OnboardingModalProps {
  open: boolean;
  onComplete: () => void;
}

const TOTAL_STEPS = 4;

const GOAL_ICONS = {
  understand_spending: Search,
  save: PiggyBank,
  investments: TrendingUp,
  budget: Wallet,
} as const;

const GOAL_IDS = ['understand_spending', 'save', 'investments', 'budget'] as const;

type DateOrder = 'DMY' | 'MDY' | 'YMD';

export function OnboardingModal({ open, onComplete }: OnboardingModalProps) {
  const { t } = useTranslation('settings');
  const { preferences, updatePreferences } = useUserPreferences();
  const { profile, updateProfile } = useProfile();
  const { formatCurrency } = useLocalization();
  const { toast } = useToast();

  const currency = preferences?.base_currency || 'EUR';
  const locale = getLocaleForRegion(preferences?.country);
  const autoDateOrder = useMemo(() => detectLocalePattern(locale), [locale]);

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1: Goal
  const [primaryGoal, setPrimaryGoal] = useState<string>('');

  // Step 2: Name aliases
  const defaultName = useMemo(() => {
    const first = profile?.first_name?.trim() || '';
    const last = profile?.last_name?.trim() || '';
    const full = [first, last].filter(Boolean).join(' ');
    return full || '';
  }, [profile?.first_name, profile?.last_name]);

  const [nameAliases, setNameAliases] = useState<string[]>(() =>
    defaultName ? [defaultName] : []
  );
  const [nameInput, setNameInput] = useState('');

  // Step 3: Formats
  const [dateFormat, setDateFormat] = useState<DateOrder>(autoDateOrder);
  const [showDecimals, setShowDecimals] = useState(preferences?.show_decimals !== false);

  // Step 4: Savings
  const [hasSavingsGoal, setHasSavingsGoal] = useState(false);
  const [savingsAmount, setSavingsAmount] = useState<string>('');
  const [savingsDate, setSavingsDate] = useState<string>('');

  const addName = () => {
    const trimmed = nameInput.trim();
    if (trimmed && !nameAliases.includes(trimmed)) {
      setNameAliases([...nameAliases, trimmed]);
      setNameInput('');
    }
  };

  const removeName = (name: string) => {
    setNameAliases(nameAliases.filter((n) => n !== name));
  };

  const sampleDate = useMemo(() => {
    const d = new Date(2026, 9, 24);
    const pattern = buildFullDatePattern(dateFormat, {} as DisplayFormat);
    try { return format(d, pattern); } catch { return '24/10/2026'; }
  }, [dateFormat]);

  const sampleAmount = useMemo(() => {
    const opts: Intl.NumberFormatOptions = {
      style: 'currency',
      currency,
      minimumFractionDigits: showDecimals ? 2 : 0,
      maximumFractionDigits: showDecimals ? 2 : 0,
      useGrouping: true,
    };
    try { return new Intl.NumberFormat(locale, opts).format(1234.56); }
    catch { return showDecimals ? '$1,234.56' : '$1,235'; }
  }, [currency, locale, showDecimals]);

  const finish = async (skipped: boolean) => {
    setSaving(true);
    try {
      if (!skipped) {
        const answers: OnboardingAnswers = {};
        if (primaryGoal) answers.primary_goal = primaryGoal;
        if (hasSavingsGoal && savingsAmount) {
          answers.savings_goal = {
            amount: Number(savingsAmount),
            currency,
            target_date: savingsDate || null,
          };
        }
        if (Object.keys(answers).length > 0) {
          updateProfile({ onboarding_answers: answers });
        }
        updatePreferences({
          onboarding_completed: true,
          own_name_aliases: nameAliases.length > 0 ? nameAliases : undefined,
          date_format: dateFormat !== autoDateOrder ? dateFormat : undefined,
          show_decimals: showDecimals,
        });
      } else {
        updatePreferences({ onboarding_completed: true });
      }
      onComplete();
    } catch (error) {
      console.error('Error saving onboarding:', error);
      toast({
        title: t('onboarding.postLogin.errorTitle'),
        description: t('onboarding.postLogin.errorDescription'),
        variant: 'destructive',
      });
      onComplete();
    } finally {
      setSaving(false);
    }
  };

  const canProceed = step === 1 ? !!primaryGoal : true;

  const inputClasses = "h-11 rounded-xl bg-muted border-[1.5px] border-transparent shadow-none px-3.5 text-sm font-medium focus-visible:bg-card focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/[0.14] focus-visible:outline-none";

  const stepTitles: Record<number, string> = {
    1: t('onboarding.postLogin.stepGoal'),
    2: t('onboarding.postLogin.stepNames'),
    3: t('onboarding.postLogin.stepFormats'),
    4: t('onboarding.postLogin.stepSavings'),
  };

  const renderStep = () => {
    if (step === 1) {
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('onboarding.postLogin.goalHint')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {GOAL_IDS.map((id) => {
              const Icon = GOAL_ICONS[id];
              const active = primaryGoal === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPrimaryGoal(id)}
                  className={`flex items-center gap-3 rounded-xl border-[1.5px] p-4 text-left transition-colors ${
                    active
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-foreground/30'
                  }`}
                >
                  <span
                    className={`shrink-0 flex items-center justify-center rounded-lg w-9 h-9 ${
                      active ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {t(`onboarding.postLogin.goals.${id}`)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('onboarding.postLogin.namesHint')}
          </p>
          <div className="space-y-2.5">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder={t('onboarding.postLogin.namePlaceholder')}
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addName())}
                className={`flex-1 ${inputClasses}`}
              />
              <button
                type="button"
                onClick={addName}
                disabled={!nameInput.trim()}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-muted disabled:opacity-30"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {nameAliases.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {nameAliases.map((name) => (
                  <span key={name} className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-sm text-foreground">
                    {name}
                    <button type="button" onClick={() => removeName(name)} aria-label={`Remove ${name}`}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (step === 3) {
      const DATE_OPTIONS: DateOrder[] = ['DMY', 'MDY', 'YMD'];
      return (
        <div className="space-y-5">
          <p className="text-sm text-muted-foreground">
            {t('onboarding.postLogin.formatsHint')}
          </p>

          <div className="space-y-3">
            <label className="block text-[13px] font-medium text-muted-foreground">
              {t('onboarding.postLogin.dateFormat')}
            </label>
            <div className="flex rounded-xl bg-muted p-1 gap-1">
              {DATE_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setDateFormat(opt)}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                    dateFormat === opt
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
            <span className="text-sm font-medium text-foreground/70">
              {t('onboarding.postLogin.showDecimals')}
            </span>
            <Switch checked={showDecimals} onCheckedChange={setShowDecimals} />
          </div>

          <div className="rounded-xl border border-border bg-muted/50 p-4">
            <span className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
              {t('onboarding.postLogin.preview')}
            </span>
            <span className="block text-lg font-semibold tabular-nums text-foreground">{sampleAmount}</span>
            <span className="block text-sm tabular-nums text-muted-foreground mt-1">{sampleDate}</span>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">
          {t('onboarding.postLogin.savingsHint')}
        </p>

        <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
          <span className="text-sm font-medium text-foreground/70">{t('onboarding.postLogin.hasSavingsGoal')}</span>
          <Switch checked={hasSavingsGoal} onCheckedChange={setHasSavingsGoal} />
        </div>

        {hasSavingsGoal && (
          <div className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-muted-foreground">
                {t('onboarding.postLogin.howMuch', { currency })}
              </label>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                placeholder="5000"
                value={savingsAmount}
                onChange={(e) => setSavingsAmount(e.target.value)}
                className={inputClasses}
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-muted-foreground">
                {t('onboarding.postLogin.byWhen')}{' '}
                <span className="text-muted-foreground font-normal">({t('onboarding.postLogin.optional')})</span>
              </label>
              <Input
                type="date"
                value={savingsDate}
                onChange={(e) => setSavingsDate(e.target.value)}
                className={inputClasses}
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{stepTitles[step]}</DialogTitle>
        </DialogHeader>

        <DialogBody className="min-h-[260px]">
          <div>
            <Progress value={(step / TOTAL_STEPS) * 100} className="h-2" />
            <p className="text-sm text-muted-foreground mt-2">{step} / {TOTAL_STEPS}</p>
          </div>

          {renderStep()}
        </DialogBody>

        <DialogFooter className="justify-between">
          {step > 1 ? (
            <Button variant="outline" onClick={() => setStep(step - 1)} disabled={saving} className="h-12 rounded-[14px] px-6 text-[15px] font-semibold border-0 bg-muted text-foreground hover:bg-[hsl(220,13%,91%)]">
              <ChevronLeft className="w-4 h-4 mr-2" />
              {t('onboarding.postLogin.back')}
            </Button>
          ) : (
            <button
              type="button"
              onClick={() => finish(true)}
              disabled={saving}
              className="text-sm text-muted-foreground hover:text-foreground/70 transition-colors disabled:opacity-50"
            >
              {t('onboarding.postLogin.skip')}
            </button>
          )}

          {step < TOTAL_STEPS ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canProceed} className="h-12 rounded-[14px] px-6 text-[15px] font-semibold min-w-[140px]">
              {t('onboarding.postLogin.next')}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={() => finish(false)} disabled={saving} className="h-12 rounded-[14px] px-6 text-[15px] font-semibold min-w-[140px]">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
              {t('onboarding.postLogin.finish')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
