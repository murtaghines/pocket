import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useLocalization } from "@/hooks/useLocalization";

export function AccountHeader() {
  const { t } = useTranslation("account");
  const { user } = useAuth();
  const { profile } = useProfile();
  const { formatDate } = useLocalization();

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
    <div className="flex items-center gap-4 pb-2">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center bg-primary text-primary-foreground text-[18px] font-bold shrink-0"
      >
        {initials}
      </div>
      <div className="min-w-0">
        <h1 className="text-[22px] font-bold tracking-[-0.01em] text-foreground leading-tight truncate">
          {displayName}
        </h1>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-sm text-muted-foreground truncate">{user?.email}</span>
          {user?.created_at && (
            <span className="hidden sm:inline text-xs text-muted-foreground/60 whitespace-nowrap">
              · {t("security.memberSince", "Member since")} {formatDate(user.created_at)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
