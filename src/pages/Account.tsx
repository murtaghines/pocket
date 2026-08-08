import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardFooter } from "@/components/layout/DashboardFooter";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AccountHeader } from "@/components/account/AccountHeader";
import { AccountOverviewTab } from "@/components/account/AccountOverviewTab";
import { AccountBankAccountsTab } from "@/components/account/AccountBankAccountsTab";
import { AccountPreferencesTab } from "@/components/account/AccountPreferencesTab";
import { AccountSecurityTab } from "@/components/account/AccountSecurityTab";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

type TabKey = "overview" | "accounts" | "preferences" | "security";

const UNDERLINE_TAB = "rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm whitespace-nowrap shrink-0";
const TAB_KEYS: TabKey[] = ["overview", "accounts", "preferences", "security"];

export default function Account() {
  const { t } = useTranslation("account");
  const { t: tc } = useTranslation("common");
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const rawTab = searchParams.get("tab") ?? "overview";
  const activeTab: TabKey = (TAB_KEYS as string[]).includes(rawTab)
    ? (rawTab as TabKey)
    : "overview";

  const handleTabChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === "overview") next.delete("tab");
    else next.set("tab", value);
    setSearchParams(next, { replace: true });
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await new Promise((r) => setTimeout(r, 300));
    await signOut();
    toast({ title: tc("navigation.logoutSuccess") });
    navigate("/auth", { replace: true });
  };

  return (
    <DashboardLayout>
      <div
        className={`transition-opacity duration-300 ${
          isLoggingOut ? "opacity-0" : "opacity-100"
        }`}
      >
        <main className="max-w-[1400px] mx-auto space-y-6">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            {/* Sticky on scroll: the person's name/avatar and the tab switcher stay reachable —
                pinned to the very top on mobile, and just below the sticky AppHeader on desktop. */}
            <div className="sticky top-12 z-20 -mx-4 -mt-4 bg-background/90 px-4 pt-4 backdrop-blur-[10px] md:top-[84px] md:mx-0 md:mt-0 md:px-0 md:pt-0 md:bg-background/85">
              <AccountHeader />
              <TabsList className="w-full justify-start bg-transparent border-b border-border rounded-none p-0 h-auto mt-4 overflow-x-auto scrollbar-none">
                <TabsTrigger value="overview" className={UNDERLINE_TAB}>
                  {t("tabs.overview", "Overview")}
                </TabsTrigger>
                <TabsTrigger value="accounts" className={UNDERLINE_TAB}>
                  {t("tabs.accounts", "Accounts")}
                </TabsTrigger>
                <TabsTrigger value="preferences" className={UNDERLINE_TAB}>
                  {t("tabs.preferences", "Preferences")}
                </TabsTrigger>
                <TabsTrigger value="security" className={UNDERLINE_TAB}>
                  {t("tabs.security", "Security")}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="mt-6">
              <AccountOverviewTab onNavigateTab={handleTabChange} />
            </TabsContent>
            <TabsContent value="accounts" className="mt-6">
              <AccountBankAccountsTab />
            </TabsContent>
            <TabsContent value="preferences" className="mt-6">
              <AccountPreferencesTab />
            </TabsContent>
            <TabsContent value="security" className="mt-6">
              <AccountSecurityTab onLogout={handleLogout} />
            </TabsContent>
          </Tabs>
        </main>
      </div>
      <DashboardFooter />
    </DashboardLayout>
  );
}
