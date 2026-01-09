import { useState, forwardRef, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmailInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  onValidChange?: (isValid: boolean) => void;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const errorMessages = {
  es: "Formato de email inválido",
  en: "Invalid email format",
  pt: "Formato de email inválido",
};

const EmailInput = forwardRef<HTMLInputElement, EmailInputProps>(
  ({ className, value, onChange, onValidChange, ...props }, ref) => {
    const [touched, setTouched] = useState(false);
    const [internalValue, setInternalValue] = useState(value || "");

    const language = useMemo(() => {
      try {
        const prefs = localStorage.getItem("user_preferences");
        if (prefs) {
          const parsed = JSON.parse(prefs);
          return parsed.language || "en";
        }
      } catch {
        // ignore
      }
      return "en";
    }, []);

    const currentValue = value !== undefined ? value : internalValue;
    const isValid = emailRegex.test(String(currentValue));
    const showValidation = touched && String(currentValue).length > 0;

    useEffect(() => {
      onValidChange?.(isValid);
    }, [isValid, onValidChange]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInternalValue(e.target.value);
      onChange?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setTouched(true);
      props.onBlur?.(e);
    };

    return (
      <div className="space-y-1">
        <div className="relative">
          <Input
            type="email"
            className={cn(
              "pr-10",
              showValidation && !isValid && "border-destructive focus-visible:ring-destructive",
              showValidation && isValid && "border-emerald-500 focus-visible:ring-emerald-500",
              className
            )}
            ref={ref}
            value={currentValue}
            onChange={handleChange}
            onBlur={handleBlur}
            {...props}
          />
          {showValidation && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {isValid ? (
                <Check className="h-4 w-4 text-emerald-500" />
              ) : (
                <X className="h-4 w-4 text-destructive" />
              )}
            </div>
          )}
        </div>
        {showValidation && !isValid && (
          <p className="text-xs text-destructive">
            {errorMessages[language as keyof typeof errorMessages] || errorMessages.en}
          </p>
        )}
      </div>
    );
  }
);

EmailInput.displayName = "EmailInput";

export { EmailInput };
