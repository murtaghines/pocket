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
import { Loader2 } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";

const INPUT =
  "h-11 rounded-xl bg-muted border-[1.5px] border-transparent shadow-none px-3.5 text-sm font-medium focus-visible:bg-card focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/[0.14] focus-visible:outline-none placeholder:text-muted-foreground/50";

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditProfileDialog({ open, onOpenChange }: EditProfileDialogProps) {
  const { t } = useTranslation("account");
  const { profile, updateProfile, isUpdating } = useProfile();
  const { toast } = useToast();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  useEffect(() => {
    if (open) {
      setFirstName(profile?.first_name ?? "");
      setLastName(profile?.last_name ?? "");
    }
  }, [open, profile?.first_name, profile?.last_name]);

  const handleSave = () => {
    updateProfile(
      { first_name: firstName.trim(), last_name: lastName.trim() },
      {
        onSuccess: () => {
          onOpenChange(false);
          toast({ title: t("security.updateSuccess", "Profile updated") });
        },
        onError: () => toast({ title: t("security.updateError", "Could not update profile"), variant: "destructive" }),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("settings.editProfile", "Edit profile")}</DialogTitle>
          <DialogDescription className="sr-only">{t("settings.editProfile", "Edit profile")}</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-2">
            <label htmlFor="profile-first-name" className="text-[13px] font-medium text-muted-foreground">{t("security.firstName", "First name")}</label>
            <Input id="profile-first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={INPUT} autoFocus />
          </div>
          <div className="space-y-2">
            <label htmlFor="profile-last-name" className="text-[13px] font-medium text-muted-foreground">{t("security.lastName", "Last name")}</label>
            <Input
              id="profile-last-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              className={INPUT}
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button
            variant="outline"
            className="h-12 rounded-[14px] border-0 bg-muted px-6 text-[15px] font-semibold text-foreground hover:bg-[hsl(220,13%,91%)]"
            onClick={() => onOpenChange(false)}
          >
            {t("accounts.cancel", "Cancel")}
          </Button>
          <Button className="h-12 min-w-[140px] rounded-[14px] px-6 text-[15px] font-semibold" onClick={handleSave} disabled={isUpdating}>
            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("settings.save", "Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
