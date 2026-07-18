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
          <AccountHeader />

          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="w-full justify-start bg-transparent border-b border-border rounded-none p-0 h-auto">
              <TabsTrigger
                value="overview"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm"
              >
                {t("tabs.overview", "Overview")}
              </TabsTrigger>
              <TabsTrigger
                value="accounts"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm"
              >
                {t("tabs.accounts", "Accounts")}
              </TabsTrigger>
              <TabsTrigger
                value="preferences"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm"
              >
                {t("tabs.preferences", "Preferences")}
              </TabsTrigger>
              <TabsTrigger
                value="security"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm"
              >
                {t("tabs.security", "Security")}
              </TabsTrigger>
            </TabsList>

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
