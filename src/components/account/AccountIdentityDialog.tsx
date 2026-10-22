import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogBody,
} from "@/components/ui/dialog";
import type { Account } from "@/hooks/useAccounts";
import { getDefaultAccountColor } from "@/lib/accountColors";
import { getAccountTypeIcon } from "@/lib/accountTypes";
import { AccountColorPicker } from "@/components/settings/AccountColorPicker";

interface AccountIdentityDialogProps {
  account: Account | null;
  onClose: () => void;
  onSave: (values: { institution: string; name: string; color: string }) => void;
}

const INPUT =
  "h-11 rounded-xl bg-muted border-[1.5px] border-transparent shadow-none px-3.5 text-sm font-medium focus-visible:bg-card focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/[0.14] focus-visible:outline-none placeholder:text-muted-foreground/50";

/** Name and colour only — the icon is fixed per account type, everything else is edited in place. */
export function AccountIdentityDialog({ account, onClose, onSave }: AccountIdentityDialogProps) {
  const { t } = useTranslation("account");
  const { t: tp } = useTranslation("profile");
  const [institution, setInstitution] = useState("");
  const [name, setName] = useState("");
  const [color, setColor] = useState("");

  useEffect(() => {
    if (!account) return;
    setInstitution(account.institution);
    setName(account.name === account.institution ? "" : account.name);
    setColor(account.color || getDefaultAccountColor(0));
  }, [account]);

  if (!account) return null;
  const TypeIcon = getAccountTypeIcon(account.account_type);
  const isInvestment = account.account_role === "INVESTMENT";
  const canSave = institution.trim().length > 0;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("identity.title", "Name and color")}</DialogTitle>
          <DialogDescription className="sr-only">{t("identity.title", "Name and color")}</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="flex items-center gap-3 rounded-xl bg-muted px-3.5 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}26`, color }}>
              <TypeIcon className="h-5 w-5" strokeWidth={2} />
            </div>
            <p className="text-[12.5px] text-muted-foreground">{t("identity.iconHint", "The icon is set by the account type. Pick any color you like.")}</p>
          </div>

          <div className="space-y-2">
            <label className="text-[13px] font-medium text-muted-foreground">
              {isInvestment ? t("accounts.platform", "Platform") : tp("accounts.institution", "Bank")}
            </label>
            <Input value={institution} onChange={(e) => setInstitution(e.target.value)} className={INPUT} autoFocus />
          </div>

          <div className="space-y-2">
            <label className="text-[13px] font-medium text-muted-foreground">
              {tp("accounts.nickname", "Nickname")} <span className="text-muted-foreground/60">({tp("accounts.optional", "optional")})</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={tp("accounts.nicknamePlaceholder", "e.g. Personal, Shared")}
              className={INPUT}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[13px] font-medium text-muted-foreground">{tp("accounts.color", "Color")}</label>
            <AccountColorPicker value={color} onChange={setColor} />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button
            variant="outline"
            className="h-12 rounded-[14px] border-0 bg-muted px-6 text-[15px] font-semibold text-foreground hover:bg-[hsl(220,13%,91%)]"
            onClick={onClose}
          >
            {t("accounts.cancel", "Cancel")}
          </Button>
          <Button
            className="h-12 min-w-[140px] rounded-[14px] px-6 text-[15px] font-semibold"
            disabled={!canSave}
            onClick={() => onSave({ institution: institution.trim(), name: name.trim(), color })}
          >
            {tp("accounts.save", "Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
