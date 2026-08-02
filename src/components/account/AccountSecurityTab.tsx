import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useLocalization } from "@/hooks/useLocalization";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  User, Mail, Calendar, Pencil, Check, X, LogOut,
  Download, Trash2, AlertTriangle, Loader2,
} from "lucide-react";

interface AccountSecurityTabProps {
  onLogout: () => void;
}

function PersonalInfoSection({ onLogout }: { onLogout: () => void }) {
  const { t } = useTranslation("account");
  const { t: tc } = useTranslation("common");
  const { user } = useAuth();
  const { profile, updateProfile, isUpdating } = useProfile();
  const { formatDate } = useLocalization();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState(profile?.first_name || "");
  const [lastName, setLastName] = useState(profile?.last_name || "");

  const handleEdit = () => {
    setFirstName(profile?.first_name || "");
    setLastName(profile?.last_name || "");
    setIsEditing(true);
  };

  const handleSave = () => {
    updateProfile(
      { first_name: firstName.trim(), last_name: lastName.trim() },
      {
        onSuccess: () => {
          setIsEditing(false);
          toast({ title: t("security.updateSuccess", "Profile updated") });
        },
        onError: () => {
          toast({ title: t("security.updateError", "Could not update profile"), variant: "destructive" });
        },
      }
    );
  };

  const displayName =
    profile?.first_name || profile?.last_name
      ? `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim()
      : null;

  return (
    <div className="bg-card rounded-xl p-5 md:p-6" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">
          {t("security.personalInfo", "Personal information")}
        </h3>
        {!isEditing && (
          <Button variant="ghost" size="sm" onClick={handleEdit} className="h-7 px-2 gap-1 text-xs">
            <Pencil className="w-3 h-3" />
            {t("security.editProfile", "Edit")}
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-first-name" className="text-xs">
                {t("security.firstName", "First name")}
              </Label>
              <Input
                id="edit-first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="h-8"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-last-name" className="text-xs">
                {t("security.lastName", "Last name")}
              </Label>
              <Input
                id="edit-last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="h-8"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={isUpdating} className="h-7">
              <Check className="w-3.5 h-3.5 mr-1" />
              {tc("save", "Save")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} className="h-7">
              <X className="w-3.5 h-3.5 mr-1" />
              {tc("cancel", "Cancel")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {displayName && (
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-primary/10 shrink-0">
                <User className="w-3.5 h-3.5 text-primary" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">{t("security.name", "Name")}</p>
                <p className="text-sm font-medium text-foreground">{displayName}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-primary/10 shrink-0">
              <Mail className="w-3.5 h-3.5 text-primary" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">{t("security.email", "Email")}</p>
              <p className="text-sm font-medium text-foreground">{user?.email}</p>
            </div>
          </div>
          {user?.created_at && (
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-primary/10 shrink-0">
                <Calendar className="w-3.5 h-3.5 text-primary" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">{t("security.memberSince", "Member since")}</p>
                <p className="text-sm font-medium text-foreground">{formatDate(user.created_at)}</p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 pt-4 border-t">
        <Button
          variant="outline"
          onClick={onLogout}
          className="w-full gap-2 text-muted-foreground hover:text-foreground"
          size="sm"
        >
          <LogOut className="w-3.5 h-3.5" />
          {t("security.logOut", "Log out")}
        </Button>
      </div>
    </div>
  );
}

function ExportDataSection() {
  const { t } = useTranslation("account");
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!user) return;
    setIsExporting(true);
    try {
      const [profileRes, prefsRes, accountsRes, importsRes, transactionsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("user_preferences").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("accounts").select("*").eq("user_id", user.id),
        supabase.from("imports").select("id, file_name, domain, status, uploaded_at, transactions_count").eq("user_id", user.id),
        supabase.from("transactions").select("*").eq("user_id", user.id).limit(10000),
      ]);

      const payload = {
        exported_at: new Date().toISOString(),
        profile: profileRes.data,
        preferences: prefsRes.data,
        accounts: accountsRes.data || [],
        imports: importsRes.data || [],
        transactions: transactionsRes.data || [],
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pocket-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-card rounded-xl p-5 md:p-6" style={{ boxShadow: "var(--shadow-card)" }}>
      <h3 className="text-sm font-semibold text-foreground mb-1">
        {t("security.exportData", "Export my data")}
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        {t("security.exportDescription", "Download all your data as a JSON file")}
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        disabled={isExporting}
        className="gap-2"
      >
        {isExporting ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Download className="w-3.5 h-3.5" />
        )}
        {isExporting
          ? t("security.exporting", "Exporting...")
          : t("security.exportDownload", "Download JSON")}
      </Button>
    </div>
  );
}

function DeleteAccountSection() {
  const { t } = useTranslation("profile");
  const [isOpen, setIsOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { signOut } = useAuth();
  const { t: ta } = useTranslation("account");

  const confirmWord = t("deleteAccount.confirmWord", "DELETE");

  const handleDelete = async () => {
    if (confirmText !== confirmWord) return;
    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-account");
      if (error) throw error;
      if (data?.success) {
        toast({ title: t("deleteAccount.deleted"), description: t("deleteAccount.deletedDescription") });
        await signOut();
      } else {
        throw new Error(data?.error || t("deleteAccount.error"));
      }
    } catch (error: any) {
      toast({ title: t("deleteAccount.errorTitle"), description: error.message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setIsOpen(false);
      setConfirmText("");
    }
  };

  return (
    <div className="bg-card rounded-xl p-5 md:p-6 border border-destructive/20" style={{ boxShadow: "var(--shadow-card)" }}>
      <h3 className="text-sm font-semibold text-destructive mb-1">
        {ta("security.dangerZone", "Danger zone")}
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        {ta("security.deleteWarning", "This action cannot be undone. All your data will be permanently deleted.")}
      </p>
      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm" className="gap-2">
            <Trash2 className="w-3.5 h-3.5" />
            {t("deleteAccount.button")}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              {t("deleteAccount.title")}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>{t("deleteAccount.warning")}</p>
                <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                  <li>{t("deleteAccount.items.transactions")}</li>
                  <li>{t("deleteAccount.items.files")}</li>
                  <li>{t("deleteAccount.items.investments")}</li>
                  <li>{t("deleteAccount.items.preferences")}</li>
                  <li>{t("deleteAccount.items.profile")}</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="confirm-delete" className="text-sm font-medium">
              {t("deleteAccount.typeToConfirm", { word: confirmWord })}
            </Label>
            <Input
              id="confirm-delete"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={confirmWord}
              className="mt-2"
              disabled={isDeleting}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t("deleteAccount.cancel")}</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={confirmText !== confirmWord || isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t("deleteAccount.deleting")}
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t("deleteAccount.confirm")}
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function AccountSecurityTab({ onLogout }: AccountSecurityTabProps) {
  return (
    <div className="space-y-4 max-w-2xl">
      <PersonalInfoSection onLogout={onLogout} />
      <ExportDataSection />
      <DeleteAccountSection />
    </div>
  );
}
