import { useState } from "react";
import { useTranslation } from "react-i18next";
import { User, Mail, Calendar, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useLocalization } from "@/hooks/useLocalization";
import { useToast } from "@/hooks/use-toast";

export function AccountProfileCard() {
  const { t } = useTranslation("account");
  const { t: tc } = useTranslation("common");
  const { user } = useAuth();
  const { profile, updateProfile, isUpdating } = useProfile();
  const { formatDate } = useLocalization();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

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
      },
    );
  };

  const displayName =
    profile?.first_name || profile?.last_name
      ? `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim()
      : null;

  const rows = [
    displayName && { icon: User, label: t("security.name", "Name"), value: displayName },
    { icon: Mail, label: t("security.email", "Email"), value: user?.email },
    user?.created_at && {
      icon: Calendar,
      label: t("security.memberSince", "Member since"),
      value: formatDate(user.created_at),
    },
  ].filter(Boolean) as { icon: React.ElementType; label: string; value?: string | null }[];

  return (
    <section className="bg-card rounded-xl p-5 md:p-6 shadow-section">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          {t("general.profile", "Profile")}
        </h3>
        {!isEditing && (
          <Button variant="ghost" size="sm" onClick={handleEdit} className="h-8 gap-1.5">
            <Pencil className="w-3.5 h-3.5" />
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
                className="h-9"
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
                className="h-9"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={isUpdating}>
              <Check className="w-3.5 h-3.5 mr-1" />
              {tc("save", "Save")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
              <X className="w-3.5 h-3.5 mr-1" />
              {tc("cancel", "Cancel")}
            </Button>
          </div>
        </div>
      ) : (
        <dl className="divide-y divide-border">
          {rows.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <div className="p-1.5 rounded-lg bg-accent shrink-0">
                <Icon className="w-4 h-4 text-accent-foreground" />
              </div>
              <dt className="text-sm text-muted-foreground w-28 shrink-0">{label}</dt>
              <dd className="text-sm font-medium text-foreground truncate">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
