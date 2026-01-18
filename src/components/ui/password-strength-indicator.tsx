import { useMemo } from "react";
import { Check, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface PasswordStrengthIndicatorProps {
  password: string;
}

const requirements = [
  { key: "minLength", test: (pw: string) => pw.length >= 6, label: "At least 6 characters" },
  { key: "lowercase", test: (pw: string) => /[a-z]/.test(pw), label: "One lowercase letter" },
  { key: "uppercase", test: (pw: string) => /[A-Z]/.test(pw), label: "One uppercase letter" },
  { key: "number", test: (pw: string) => /[0-9]/.test(pw), label: "One number" },
  { key: "special", test: (pw: string) => /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\/'`;~]/.test(pw), label: "One special character" },
];

const strengthLabels: Record<number, string> = {
  0: "",
  1: "Very weak",
  2: "Weak",
  3: "Fair",
  4: "Strong",
  5: "Very strong",
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
  const { score, results } = useMemo(() => {
    const results = requirements.map((req) => ({
      ...req,
      passed: req.test(password),
    }));
    const score = results.filter((r) => r.passed).length;
    return { score, results };
  }, [password]);

  const progressValue = (score / 5) * 100;
  const strengthLabel = strengthLabels[score as keyof typeof strengthLabels];
  const progressColor = strengthColors[score as keyof typeof strengthColors];

  if (!password) {
    return null;
  }

  return (
    <div className="space-y-3 mt-2">
      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <div
            className={cn("h-full transition-all duration-300", progressColor)}
            style={{ width: `${progressValue}%` }}
          />
        </div>
        {strengthLabel && (
          <p className={cn(
            "text-xs font-medium",
            score <= 2 ? "text-destructive" : score <= 3 ? "text-yellow-600" : "text-emerald-600"
          )}>
            {strengthLabel}
          </p>
        )}
      </div>

      {/* Requirements checklist */}
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
              {req.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
