import { useState } from "react";
import { Button } from "@vault/ui/components/button";
import { WifiOff, AlertTriangle, Sparkles, X } from "lucide-react";
import { cn } from "@vault/ui/lib/utils";
import { useSystemAlertsState, useSystemAlertsActions } from "@/stores/system-alerts/system-alerts.selectors";

interface AlertBannerProps {
  type: "offline" | "disk" | "update";
  onDismiss?: () => void;
  onAction?: () => void;
  actionText?: string;
}

const alertConfig = {
  offline: {
    icon: WifiOff,
    variant: "destructive" as const,
    bgColor: "bg-destructive/10",
    borderColor: "border-destructive/20",
    textColor: "text-destructive",
    iconColor: "text-destructive",
    defaultMessage:
      "Connection lost. Active downloads are paused and will resume automatically when connection is restored.",
    defaultActionText: "Retry"
  },
  disk: {
    icon: AlertTriangle,
    variant: "warning" as const,
    bgColor: "bg-primary/10",
    borderColor: "border-primary/20",
    textColor: "text-primary",
    iconColor: "text-primary",
    defaultMessage: "Low disk space — 2.1 GB free. Downloads may pause until space is available.",
    defaultActionText: "Manage"
  },
  update: {
    icon: Sparkles,
    variant: "info" as const,
    bgColor: "bg-secondary/60",
    borderColor: "border-border",
    textColor: "text-foreground",
    iconColor: "text-primary",
    defaultMessage: "Vault 0.2.0 is ready to install.",
    defaultActionText: "Restart now"
  }
};

export const AlertBanner = ({ type, onDismiss, onAction, actionText }: AlertBannerProps) => {
  const config = alertConfig[type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-4 py-2 text-[12.5px] border-b",
        config.bgColor,
        config.borderColor,
        config.textColor
      )}
    >
      <Icon className={cn("w-3.5 h-3.5 shrink-0", config.iconColor)} />
      <span className="flex-1">{config.defaultMessage}</span>

      {onAction && (
        <Button
          variant="link"
          size="sm"
          onClick={onAction}
          className={cn(
            "text-[12px] font-medium h-auto p-0",
            type === "update" ? "text-primary" : "text-inherit"
          )}
        >
          {actionText || config.defaultActionText}
        </Button>
      )}

      {onDismiss && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onDismiss}
          className="h-6 w-6 rounded-md hover:bg-background/50"
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
};

export const AlertBanners = () => {
  const { offline, lowDisk, updateAvailable } = useSystemAlertsState();
  const { dismissUpdateAlert } = useSystemAlertsActions();

  const [dismissedOffline, setDismissedOffline] = useState(false);
  const [dismissedDisk, setDismissedDisk] = useState(false);
  const [dismissedUpdate, setDismissedUpdate] = useState(false);

  const handleOfflineDismiss = () => {
    setDismissedOffline(true);
  };

  const handleDiskDismiss = () => {
    setDismissedDisk(true);
  };

  const handleUpdateDismiss = () => {
    setDismissedUpdate(true);
    dismissUpdateAlert();
  };

  const handleOfflineAction = () => {
    // Retry connection - would be called when network comes back online
  };

  const handleDiskAction = () => {
    // TODO: Open file manager to manage disk space
  };

  const handleUpdateAction = () => {
    // TODO: Trigger app update and restart
  };

  return (
    <div className="flex flex-col">
      {offline && !dismissedOffline && (
        <AlertBanner type="offline" onDismiss={handleOfflineDismiss} onAction={handleOfflineAction} />
      )}

      {lowDisk && !dismissedDisk && (
        <AlertBanner type="disk" onDismiss={handleDiskDismiss} onAction={handleDiskAction} />
      )}

      {updateAvailable && !dismissedUpdate && (
        <AlertBanner
          type="update"
          onDismiss={handleUpdateDismiss}
          onAction={handleUpdateAction}
          actionText="Restart now"
        />
      )}
    </div>
  );
};
