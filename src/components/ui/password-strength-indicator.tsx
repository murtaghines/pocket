import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordStrengthIndicatorProps {
  password: string;
}

const requirementTests = [
  { key: "length", test: (pw: string) => pw.length >= 6 },
  { key: "uppercase", test: (pw: string) => /[A-Z]/.test(pw) },
  { key: "number", test: (pw: string) => /[0-9]/.test(pw) },
  { key: "special", test: (pw: string) => /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/'`;~]/.test(pw) },
];

const strengthKeys: Record<number, string> = {
  0: "",
  1: "veryWeak",
  2: "weak",
  3: "good",
  4: "veryStrong",
};

const strengthColors = {
  0: "bg-muted",
  1: "bg-destructive",
  2: "bg-orange-500",
  3: "bg-emerald-400",
  4: "bg-emerald-500",
};

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const { t } = useTranslation('auth');

  const { score, results } = useMemo(() => {
    const results = requirementTests.map((req) => ({
      ...req,
      passed: req.test(password),
    }));
    const score = results.filter((r) => r.passed).length;
    return { score, results };
  }, [password]);

  const progressValue = (score / 4) * 100;
  const strengthKey = strengthKeys[score as keyof typeof strengthKeys];
  const progressColor = strengthColors[score as keyof typeof strengthColors];

  if (!password) {
    return null;
  }

  return (
    <div className="space-y-2 mt-2">
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
          <div
            className={cn("h-full transition-all duration-300", progressColor)}
            style={{ width: `${progressValue}%` }}
          />
        </div>
        {strengthKey && (
          <span className={cn(
            "text-xs font-medium whitespace-nowrap",
            score <= 2 ? "text-destructive" : score <= 3 ? "text-yellow-600" : "text-emerald-600"
          )}>
            {t(`passwordStrength.${strengthKey}`)}
          </span>
        )}
      </div>

      <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        {results.map((req) => (
          <li key={req.key} className="flex items-center gap-1.5 text-xs">
            {req.passed ? (
              <Check className="w-3 h-3 text-emerald-500 shrink-0" />
            ) : (
              <X className="w-3 h-3 text-muted-foreground shrink-0" />
            )}
            <span className={cn(
              req.passed ? "text-foreground" : "text-muted-foreground"
            )}>
              {t(`passwordRequirements.${req.key}`)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
