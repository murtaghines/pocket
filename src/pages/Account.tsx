import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardFooter } from "@/components/layout/DashboardFooter";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AccountHeader } from "@/components/account/AccountHeader";
import { AccountGeneralTab } from "@/components/account/AccountGeneralTab";
import { AccountBankAccountsTab } from "@/components/account/AccountBankAccountsTab";
import { AccountPreferencesTab } from "@/components/account/AccountPreferencesTab";
import { AccountSecurityTab } from "@/components/account/AccountSecurityTab";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

type TabKey = "general" | "accounts" | "preferences" | "security";

const SEGMENT_TAB =
  "h-[28px] shrink-0 whitespace-nowrap rounded-[9px] px-[13px] font-heading text-[13px] font-medium text-muted-foreground shadow-none transition-colors " +
  "data-[state=active]:bg-card data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-sm " +
  "md:text-white/85 md:hover:bg-white/10 md:data-[state=active]:bg-white md:data-[state=active]:text-primary";
const TAB_KEYS: TabKey[] = ["general", "accounts", "preferences", "security"];

export default function Account() {
  const { t } = useTranslation("account");
  const { t: tc } = useTranslation("common");
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const rawTab = searchParams.get("tab") ?? "general";
  const activeTab: TabKey = (TAB_KEYS as string[]).includes(rawTab)
    ? (rawTab as TabKey)
    : "general";

  const handleTabChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === "general") next.delete("tab");
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
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <header className="px-3 pt-2 pb-4 md:px-[34px] md:pt-[24px] md:pb-[78px]">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <AccountHeader />
              <TabsList className="h-auto w-full justify-start gap-[2px] overflow-x-auto rounded-[12px] bg-muted p-[4px] scrollbar-none md:w-auto md:shrink-0 md:bg-white/[0.16]">
                <TabsTrigger value="general" className={SEGMENT_TAB}>
                  {t("tabs.general", "General")}
                </TabsTrigger>
                <TabsTrigger value="accounts" className={SEGMENT_TAB}>
                  {t("tabs.accounts", "Accounts")}
                </TabsTrigger>
                <TabsTrigger value="preferences" className={SEGMENT_TAB}>
                  {t("tabs.preferences", "Preferences")}
                </TabsTrigger>
                <TabsTrigger value="security" className={SEGMENT_TAB}>
                  {t("tabs.security", "Security")}
                </TabsTrigger>
              </TabsList>
            </div>
          </header>

          <div className="relative z-20 px-3 pb-6 md:mt-[-50px] md:px-[34px]">
            <TabsContent value="general" className="mt-0">
              <AccountGeneralTab onNavigateTab={handleTabChange} />
            </TabsContent>
            <TabsContent value="accounts" className="mt-0">
              <AccountBankAccountsTab />
            </TabsContent>
            <TabsContent value="preferences" className="mt-0">
              <AccountPreferencesTab />
            </TabsContent>
            <TabsContent value="security" className="mt-0">
              <AccountSecurityTab onLogout={handleLogout} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
      <DashboardFooter />
    </DashboardLayout>
  );
}
