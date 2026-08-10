import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Landmark, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ACCOUNT_COLOR_PALETTE, getDefaultAccountColor } from "@/lib/accountColors";

export interface AccountFormValues {
  institution: string;
  name: string;
  color: string;
}

interface AccountFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialValues?: Partial<AccountFormValues>;
  isSubmitting?: boolean;
  onSubmit: (values: AccountFormValues) => void;
}

export function AccountFormDialog({
  open,
  onOpenChange,
  mode,
  initialValues,
  isSubmitting,
  onSubmit,
}: AccountFormDialogProps) {
  const { t } = useTranslation("profile");
  const [institution, setInstitution] = useState("");
  const [name, setName] = useState("");
  const [color, setColor] = useState("");

  useEffect(() => {
    if (open) {
      setInstitution(initialValues?.institution || "");
      setName(initialValues?.name || "");
      setColor(initialValues?.color || getDefaultAccountColor(0));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const canSubmit = institution.trim().length > 0 && !isSubmitting;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({ institution: institution.trim(), name: name.trim(), color });
  };

  if (!open) return null;

  const panel = (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col bg-background transition-transform duration-300 ease-out",
        open ? "translate-y-0" : "translate-y-full",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-accent"
        >
          <X className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Landmark className="w-4 h-4 text-primary" />
          {mode === "create"
            ? t("accounts.addAccount", "Add account")
            : t("accounts.editAccount", "Edit account")}
        </span>
        <div className="w-9" />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Bank / Institution */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t("accounts.institution", "Bank")}
          </label>
          <Input
            placeholder={t("accounts.institutionPlaceholder", "e.g. Revolut, Santander, BBVA")}
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            autoFocus
            className="h-11 rounded-xl bg-muted border-0 shadow-none focus-visible:ring-1 focus-visible:ring-primary placeholder:text-muted-foreground/50"
          />
        </div>

        {/* Nickname */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t("accounts.nickname", "Nickname")}{" "}
            <span className="normal-case font-normal">
              ({t("accounts.optional", "optional")})
            </span>
          </label>
          <Input
            placeholder={t("accounts.nicknamePlaceholder", "e.g. Personal, Shared")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            className="h-11 rounded-xl bg-muted border-0 shadow-none focus-visible:ring-1 focus-visible:ring-primary placeholder:text-muted-foreground/50"
          />
          <p className="text-[11px] text-muted-foreground">
            {institution.trim()
              ? t("accounts.previewLabel", {
                  preview: name.trim()
                    ? `${institution.trim()} · ${name.trim()}`
                    : institution.trim(),
                  defaultValue: `Shown as "${name.trim() ? `${institution.trim()} · ${name.trim()}` : institution.trim()}"`,
                })
              : t("accounts.previewHint", "Shown wherever this account appears")}
          </p>
        </div>

        {/* Color */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t("accounts.color", "Color")}
          </label>
          <div className="rounded-xl bg-muted p-3 space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {ACCOUNT_COLOR_PALETTE.blues.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "w-7 h-7 rounded-full transition-transform hover:scale-110",
                    color.toLowerCase() === c.toLowerCase()
                      ? "ring-2 ring-offset-2 ring-primary"
                      : "",
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ACCOUNT_COLOR_PALETTE.yellows.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "w-7 h-7 rounded-full transition-transform hover:scale-110",
                    color.toLowerCase() === c.toLowerCase()
                      ? "ring-2 ring-offset-2 ring-primary"
                      : "",
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 pb-6 pt-3 bg-background space-y-2">
        <Button
          className="w-full h-12 rounded-xl"
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {mode === "create" ? t("accounts.create", "Create") : t("accounts.save", "Save")}
        </Button>
        <Button
          variant="ghost"
          className="w-full h-10 rounded-xl text-muted-foreground"
          onClick={() => onOpenChange(false)}
        >
          {t("accounts.cancel", "Cancel")}
        </Button>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}
