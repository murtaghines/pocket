import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  User, Mail, Calendar, Pencil, Check, X, Landmark, FileText,
  SlidersHorizontal, Download, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useLocalization } from "@/hooks/useLocalization";
import { useAccounts } from "@/hooks/useAccounts";
import { useAccountOverviewStats } from "@/hooks/useAccountOverviewStats";
import { useToast } from "@/hooks/use-toast";

interface AccountGeneralTabProps {
  onNavigateTab: (tab: string) => void;
}

function ProfileCard() {
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

function DataSummaryCard({ onNavigateTab }: AccountGeneralTabProps) {
  const { t } = useTranslation("account");
  const { accounts } = useAccounts();
  const { data: stats, isLoading } = useAccountOverviewStats();

  const active = accounts.filter((a) => !a.archived);
  const bankCount = active.filter((a) => a.account_role === "CASH").length;
  const investmentCount = active.filter((a) => a.account_role === "INVESTMENT").length;

  const coverage = (() => {
    if (!stats?.minMonth || !stats.maxMonth) return "—";
    const min = stats.minMonth.replace("-", "/");
    const max = stats.maxMonth.replace("-", "/");
    return min === max ? min : `${min} → ${max}`;
  })();

  const rows = [
    {
      icon: Landmark,
      label: t("general.summary.accounts", "Accounts"),
      value: t("general.summary.accountsValue", {
        bank: bankCount,
        investment: investmentCount,
        defaultValue: "{{bank}} bank · {{investment}} investment",
      }),
      action: () => onNavigateTab("accounts"),
    },
    {
      icon: FileText,
      label: t("general.summary.files", "Files uploaded"),
      value: isLoading ? "…" : String(stats?.totalFiles ?? 0),
      to: "/my-data",
    },
    {
      icon: Calendar,
      label: t("general.summary.coverage", "Data coverage"),
      value: isLoading ? "…" : coverage,
      to: "/my-data",
    },
  ];

  return (
    <section className="bg-card rounded-xl p-5 md:p-6 shadow-section">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        {t("general.summary.title", "Your data")}
      </h3>
      <ul className="divide-y divide-border">
        {rows.map(({ icon: Icon, label, value, action, to }) => {
          const content = (
            <>
              <div className="p-1.5 rounded-lg bg-accent shrink-0">
                <Icon className="w-4 h-4 text-accent-foreground" />
              </div>
              <span className="text-sm text-muted-foreground w-28 shrink-0">{label}</span>
              <span className="text-sm font-medium text-foreground tabular-nums truncate flex-1">{value}</span>
              <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </>
          );
          const cls = "flex items-center gap-3 py-3 first:pt-0 last:pb-0 w-full text-left hover:opacity-80 transition-opacity";
          return (
            <li key={label}>
              {to ? (
                <Link to={to} className={cls}>{content}</Link>
              ) : (
                <button type="button" onClick={action} className={cls}>{content}</button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function QuickActions({ onNavigateTab }: AccountGeneralTabProps) {
  const { t } = useTranslation("account");

  const items = [
    { icon: Landmark, label: t("general.quick.accounts", "Manage accounts"), onClick: () => onNavigateTab("accounts") },
    { icon: SlidersHorizontal, label: t("general.quick.preferences", "Currency & formatting"), onClick: () => onNavigateTab("preferences") },
    { icon: Download, label: t("general.quick.export", "Export my data"), onClick: () => onNavigateTab("security") },
    { icon: FileText, label: t("general.quick.files", "Manage files"), to: "/my-data" },
  ];

  const cls = "flex items-center gap-3 bg-card rounded-xl p-4 shadow-section hover:bg-accent transition-colors text-left";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:col-span-2">
      {items.map(({ icon: Icon, label, onClick, to }) => {
        const content = (
          <>
            <Icon className="w-5 h-5 text-primary shrink-0" />
            <span className="text-sm font-medium text-foreground">{label}</span>
          </>
        );
        return to ? (
          <Link key={label} to={to} className={cls}>{content}</Link>
        ) : (
          <button key={label} type="button" onClick={onClick} className={cls}>{content}</button>
        );
      })}
    </div>
  );
}

export function AccountGeneralTab({ onNavigateTab }: AccountGeneralTabProps) {
  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
      <ProfileCard />
      <DataSummaryCard onNavigateTab={onNavigateTab} />
      <QuickActions onNavigateTab={onNavigateTab} />
    </div>
  );
}
