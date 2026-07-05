import { WifiOff, Wifi } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { cn } from "@/lib/utils";

export function NetworkStatusBanner() {
  const { isOnline, wasOffline } = useNetworkStatus();
  const { t } = useTranslation("common");

  // Show nothing if always online
  if (isOnline && !wasOffline) return null;

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium transition-all duration-300",
        isOnline
          ? "bg-success text-success-foreground"
          : "bg-destructive text-destructive-foreground"
      )}
    >
      {isOnline ? (
        <>
          <Wifi className="w-4 h-4" />
          <span>{t("network.online")}</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4" />
          <span>{t("network.offline")}</span>
        </>
      )}
    </div>
  );
}
