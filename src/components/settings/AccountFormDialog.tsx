import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Landmark } from "lucide-react";
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

/**
 * Single source of truth for creating/editing a cashflow account: bank (institution),
 * optional nickname to tell apart two accounts at the same bank (e.g. "Revolut" +
 * "Personal" / "Shared"), and a color. Used by AccountsManager (settings),
 * AccountSelectDialog (import flow), and AccountsStackCard (dashboard) so account
 * creation never happens ad hoc again.
 */
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
    // Only reset when the dialog opens, not on every initialValues identity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const canSubmit = institution.trim().length > 0 && !isSubmitting;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({ institution: institution.trim(), name: name.trim(), color });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-primary" />
            {mode === "create"
              ? t("accounts.addAccount", "Add account")
              : t("accounts.editAccount", "Edit account")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "accounts.formDescription",
              "The bank is required. Add a nickname if you have more than one account at the same bank.",
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="account-institution">
              {t("accounts.institution", "Bank")}
            </Label>
            <Input
              id="account-institution"
              placeholder={t("accounts.institutionPlaceholder", "e.g. Revolut, Santander, BBVA")}
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="account-nickname">
              {t("accounts.nickname", "Nickname")}{" "}
              <span className="text-muted-foreground font-normal">
                ({t("accounts.optional", "optional")})
              </span>
            </Label>
            <Input
              id="account-nickname"
              placeholder={t("accounts.nicknamePlaceholder", "e.g. Personal, Shared")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
            <p className="text-xs text-muted-foreground">
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

          <div className="space-y-2">
            <Label>{t("accounts.color", "Color")}</Label>
            <div className="flex flex-wrap gap-1.5">
              {ACCOUNT_COLOR_PALETTE.blues.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border transition-transform hover:scale-110 ${
                    color.toLowerCase() === c.toLowerCase()
                      ? "ring-2 ring-offset-2 ring-foreground"
                      : "border-border"
                  }`}
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
                  className={`w-7 h-7 rounded-full border transition-transform hover:scale-110 ${
                    color.toLowerCase() === c.toLowerCase()
                      ? "ring-2 ring-offset-2 ring-foreground"
                      : "border-border"
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("accounts.cancel", "Cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {mode === "create" ? t("accounts.create", "Create") : t("accounts.save", "Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
