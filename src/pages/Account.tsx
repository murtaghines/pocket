import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardFooter } from "@/components/layout/DashboardFooter";
import { AccountHeader } from "@/components/account/AccountHeader";
import { AccountsWorkspace } from "@/components/account/AccountsWorkspace";
import { FilesWorkspace } from "@/components/account/FilesWorkspace";
import { AccountSettingsTab } from "@/components/account/AccountSettingsTab";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * `/account` is three pages driven by the sidebar: `?tab=accounts` and `?tab=files` are
 * workspaces (master/detail, like Categories & rules); anything else is Settings (profile, preferences,
 * data export, session, danger zone). Old `?tab=preferences|security` links land on Settings.
 */
export default function Account() {
  const { t: tc } = useTranslation("common");
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const tab = searchParams.get("tab");

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await new Promise((r) => setTimeout(r, 300));
    await signOut();
    toast({ title: tc("navigation.logoutSuccess") });
    navigate("/auth", { replace: true });
  };

  if (tab === "accounts" || tab === "files") {
    // Desktop: the workspace owns its own scrolling (fullBleed). Mobile: the document scrolls.
    return (
      <DashboardLayout fullBleed={!isMobile}>
        {tab === "accounts" ? <AccountsWorkspace /> : <FilesWorkspace />}
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className={`transition-opacity duration-300 ${isLoggingOut ? "opacity-0" : "opacity-100"}`}>
        <header className="px-3 pb-4 pt-2 md:px-[34px] md:pb-5 md:pt-[24px]">
          <AccountHeader />
        </header>
        <div className="relative z-20 px-3 pb-6 md:px-[34px]">
          <AccountSettingsTab onLogout={handleLogout} />
        </div>
      </div>
      <DashboardFooter />
    </DashboardLayout>
  );
}
