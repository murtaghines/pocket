import { AccountProfileCard } from "@/components/account/AccountProfileCard";
import { AccountPreferencesTab } from "@/components/account/AccountPreferencesTab";
import { ExportDataCard, SessionCard, DangerZoneCard } from "@/components/account/AccountDataCards";

interface AccountSettingsTabProps {
  onLogout: () => void;
}

/** One page for everything about the user: profile, preferences, data export, session and deletion. */
export function AccountSettingsTab({ onLogout }: AccountSettingsTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <AccountProfileCard />
        <SessionCard onLogout={onLogout} />
      </div>
      <AccountPreferencesTab />
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <ExportDataCard />
        <DangerZoneCard />
      </div>
    </div>
  );
}
