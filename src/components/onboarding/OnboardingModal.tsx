import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useProfile, type OnboardingAnswers } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, ChevronRight, Check, Loader2, Search, PiggyBank, TrendingUp, Wallet } from 'lucide-react';

interface OnboardingModalProps {
  open: boolean;
  onComplete: () => void;
}

const TOTAL_STEPS = 2;

const GOALS = [
  { id: 'understand_spending', label: 'Understand where my money goes', icon: Search },
  { id: 'save',                label: 'Save toward a goal',              icon: PiggyBank },
  { id: 'investments',         label: 'Track my investments',           icon: TrendingUp },
  { id: 'budget',              label: 'Build a budget',                 icon: Wallet },
] as const;

export function OnboardingModal({ open, onComplete }: OnboardingModalProps) {
  const { preferences, updatePreferences } = useUserPreferences();
  const { updateProfile } = useProfile();
  const { toast } = useToast();

  const currency = preferences?.base_currency || 'EUR';

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [primaryGoal, setPrimaryGoal] = useState<string>('');
  const [hasSavingsGoal, setHasSavingsGoal] = useState(false);
  const [savingsAmount, setSavingsAmount] = useState<string>('');
  const [savingsDate, setSavingsDate] = useState<string>('');

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
      }
      updatePreferences({ onboarding_completed: true });
      onComplete();
    } catch (error) {
      console.error('Error saving onboarding:', error);
      toast({
        title: 'Something went wrong',
        description: 'We could not save your answers. You can set them later in your profile.',
        variant: 'destructive',
      });
      // Still close so the user is never trapped.
      onComplete();
    } finally {
      setSaving(false);
    }
  };

  const canProceed = step === 1 ? !!primaryGoal : true;

  const renderStep = () => {
    if (step === 1) {
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            We tailor your dashboard to what matters most to you.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {GOALS.map(({ id, label, icon: Icon }) => {
              const active = primaryGoal === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPrimaryGoal(id)}
                  className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
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
                  <span className="text-sm font-medium text-foreground">{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">
          We'll show your progress toward it in your planning view. Totally optional.
        </p>

        <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
          <span className="text-sm font-medium text-foreground/70">I have a savings goal</span>
          <Switch checked={hasSavingsGoal} onCheckedChange={setHasSavingsGoal} />
        </div>

        {hasSavingsGoal && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground/70 mb-1.5">
                How much? ({currency})
              </label>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                placeholder="5000"
                value={savingsAmount}
                onChange={(e) => setSavingsAmount(e.target.value)}
                className="h-11 text-base border border-border rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/70 mb-1.5">
                By when? <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Input
                type="date"
                value={savingsDate}
                onChange={(e) => setSavingsDate(e.target.value)}
                className="h-11 text-base border border-border rounded-xl"
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">
            {step === 1 ? 'What brings you to pocket?' : 'Set a savings goal'}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-2">
          <Progress value={(step / TOTAL_STEPS) * 100} className="h-2" />
          <p className="text-sm text-muted-foreground mt-2">{step} / {TOTAL_STEPS}</p>
        </div>

        <div className="py-6 min-h-[260px]">{renderStep()}</div>

        <div className="flex items-center justify-between pt-4 border-t">
          {step > 1 ? (
            <Button variant="outline" onClick={() => setStep(step - 1)} disabled={saving}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          ) : (
            <button
              type="button"
              onClick={() => finish(true)}
              disabled={saving}
              className="text-sm text-muted-foreground hover:text-foreground/70 transition-colors disabled:opacity-50"
            >
              Skip for now
            </button>
          )}

          {step < TOTAL_STEPS ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canProceed}>
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={() => finish(false)} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
              Finish
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
