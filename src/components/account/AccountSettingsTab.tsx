import { AccountPreferencesTab } from "@/components/account/AccountPreferencesTab";
import { ExportDataCard, DangerZoneCard } from "@/components/account/AccountDataCards";

/** Everything about the user: formats and preferences, data export and account deletion. The profile
 *  (name, email, member since) lives in the page header with its own edit dialog; logging out is in the sidebar. */
export function AccountSettingsTab() {
  return (
    <AccountPreferencesTab
      rightExtra={
        <>
          <ExportDataCard />
          <DangerZoneCard />
        </>
      }
    />
  );
}
