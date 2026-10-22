import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pencil } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useLocalization } from "@/hooks/useLocalization";
import { EditProfileDialog } from "@/components/account/EditProfileDialog";

export function AccountHeader() {
  const { t } = useTranslation("account");
  const { user } = useAuth();
  const { profile } = useProfile();
  const { formatDate } = useLocalization();
  const [editing, setEditing] = useState(false);

  const displayName =
    profile?.first_name || profile?.last_name
      ? `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim()
      : user?.email?.split("@")[0] || "User";

  const initials = (() => {
    const f = profile?.first_name?.charAt(0).toUpperCase() ?? "";
    const l = profile?.last_name?.charAt(0).toUpperCase() ?? "";
    return (f + l) || (user?.email?.charAt(0).toUpperCase() ?? "U");
  })();

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-[18px] font-bold text-primary-foreground md:bg-white/20 md:text-white">
          {initials}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-[19px] font-semibold leading-tight tracking-[-0.01em] text-foreground md:text-white">{displayName}</h1>
          <div className="mt-0.5 flex items-center gap-3">
            <span className="truncate text-sm text-muted-foreground md:text-white/70">{user?.email}</span>
            {user?.created_at && (
              <span className="hidden whitespace-nowrap text-xs text-muted-foreground/60 sm:inline md:text-white/50">
                · {t("security.memberSince", "Member since")} {formatDate(user.created_at)}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex h-9 shrink-0 items-center rounded-[12px] bg-muted p-1 md:bg-white/[0.16]">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="flex h-7 items-center gap-1.5 rounded-[9px] px-[13px] text-[13px] font-medium leading-none text-foreground/80 transition-colors hover:bg-black/5 md:text-white/90 md:hover:bg-white/10"
        >
          <Pencil className="h-[13px] w-[13px]" strokeWidth={2.2} />
          {t("settings.editProfile", "Edit profile")}
        </button>
      </div>
      <EditProfileDialog open={editing} onOpenChange={setEditing} />
    </div>
  );
}
