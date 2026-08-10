import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Landmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { SheetPanel, SHEET_BUTTON } from "@/components/imports/SheetPanel";
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

  const footer = (
    <Button
      className={cn(SHEET_BUTTON, "w-full")}
      onClick={handleSubmit}
      disabled={!canSubmit}
    >
      {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {mode === "create" ? t("accounts.create", "Create") : t("accounts.save", "Save")}
    </Button>
  );

  return (
    <SheetPanel
      open={open}
      onOpenChange={onOpenChange}
      title={
        <span className="inline-flex items-center gap-2">
          <Landmark className="w-4 h-4 text-primary" />
          {mode === "create"
            ? t("accounts.addAccount", "add account")
            : t("accounts.editAccount", "edit account")}
        </span>
      }
      footer={footer}
    >
      <>
        {/* Bank / Institution */}
        <div className="space-y-2">
          <label className="text-[13px] font-semibold text-foreground">
            {t("accounts.institution", "Bank")}
          </label>
          <Input
            placeholder={t("accounts.institutionPlaceholder", "e.g. Revolut, Santander, BBVA")}
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            autoFocus
            className="h-11 rounded-full bg-muted border-0 shadow-none px-5 focus-visible:ring-1 focus-visible:ring-primary placeholder:text-muted-foreground/50"
          />
        </div>

        {/* Nickname */}
        <div className="space-y-2">
          <label className="text-[13px] font-semibold text-foreground">
            {t("accounts.nickname", "Nickname")}{" "}
            <span className="font-normal text-muted-foreground">
              ({t("accounts.optional", "optional")})
            </span>
          </label>
          <Input
            placeholder={t("accounts.nicknamePlaceholder", "e.g. Personal, Shared")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            className="h-11 rounded-full bg-muted border-0 shadow-none px-5 focus-visible:ring-1 focus-visible:ring-primary placeholder:text-muted-foreground/50"
          />
          <p className="text-xs text-muted-foreground px-1">
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
          <label className="text-[13px] font-semibold text-foreground">
            {t("accounts.color", "Color")}
          </label>
          <div className="rounded-2xl bg-muted p-4 space-y-2.5">
            <div className="flex flex-wrap gap-2">
              {ACCOUNT_COLOR_PALETTE.blues.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "w-8 h-8 rounded-full transition-transform hover:scale-110",
                    color.toLowerCase() === c.toLowerCase()
                      ? "ring-2 ring-offset-2 ring-primary"
                      : "",
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {ACCOUNT_COLOR_PALETTE.yellows.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "w-8 h-8 rounded-full transition-transform hover:scale-110",
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
      </>
    </SheetPanel>
  );
}
