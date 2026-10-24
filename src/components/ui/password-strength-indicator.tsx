import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordStrengthIndicatorProps {
  password: string;
}

const requirementTests = [
  { key: "length", test: (pw: string) => pw.length >= 6 },
  { key: "lowercase", test: (pw: string) => /[a-z]/.test(pw) },
  { key: "uppercase", test: (pw: string) => /[A-Z]/.test(pw) },
  { key: "number", test: (pw: string) => /[0-9]/.test(pw) },
  { key: "special", test: (pw: string) => /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/'`;~]/.test(pw) },
];

const strengthKeys: Record<number, string> = {
  0: "",
  1: "veryWeak",
  2: "weak",
  3: "fair",
  4: "strong",
  5: "veryStrong",
};

const strengthColors = {
  0: "bg-muted",
  1: "bg-destructive",
  2: "bg-orange-500",
  3: "bg-yellow-500",
  4: "bg-emerald-400",
  5: "bg-emerald-500",
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

  const progressValue = (score / 5) * 100;
  const strengthKey = strengthKeys[score as keyof typeof strengthKeys];
  const progressColor = strengthColors[score as keyof typeof strengthColors];

  if (!password) {
    return null;
  }

  return (
    <div className="space-y-3 mt-2">
      <div className="space-y-1.5">
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <div
            className={cn("h-full transition-all duration-300", progressColor)}
            style={{ width: `${progressValue}%` }}
          />
        </div>
        {strengthKey && (
          <p className={cn(
            "text-xs font-medium",
            score <= 2 ? "text-destructive" : score <= 3 ? "text-yellow-600" : "text-emerald-600"
          )}>
            {t(`passwordStrength.${strengthKey}`)}
          </p>
        )}
      </div>

      <ul className="space-y-1">
        {results.map((req) => (
          <li key={req.key} className="flex items-center gap-2 text-xs">
            {req.passed ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <X className="w-3.5 h-3.5 text-muted-foreground" />
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
