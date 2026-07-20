import { useState } from "react";
import { Button } from "@vault/ui/components/button";
import { Progress } from "@vault/ui/components/progress";
import { WifiOff, AlertTriangle, Sparkles, X, Download } from "lucide-react";
import { cn } from "@vault/ui/lib/utils";
import {
  useSystemAlertsState,
  useSystemAlertsActions
} from "@/stores/system-alerts/system-alerts.selectors";
import { useDownloadUpdate, useInstallUpdate } from "@/lib/queries/app";

interface AlertBannerProps {
  type: "offline" | "disk" | "update";
  onDismiss?: () => void;
  onAction?: () => void;
  actionText?: string;
  message?: string;
  progress?: number | null;
  icon?: React.ComponentType<{ className?: string }>;
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
    defaultMessage: "Update available",
    defaultActionText: "Restart now"
  }
};

export const AlertBanner = ({
  type,
  onDismiss,
  onAction,
  actionText,
  message,
  progress,
  icon
}: AlertBannerProps) => {
  const config = alertConfig[type];
  const Icon = icon || config.icon;
  const displayMessage = message || config.defaultMessage;

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
      <span className="flex-1">{displayMessage}</span>

      {progress !== null && progress !== undefined && (
        <div className="w-24">
          <Progress value={progress} className="h-1.5" />
        </div>
      )}

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
  const {
    offline,
    lowDisk,
    updateAvailable,
    updateVersion,
    updateProgress,
    updateError,
    updateStatus
  } = useSystemAlertsState();
  const { dismissUpdateAlert, setUpdateStatus } = useSystemAlertsActions();
  const downloadUpdateMutation = useDownloadUpdate();
  const installUpdateMutation = useInstallUpdate();

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
    // Open the settings view where storage info is visible
  };

  const handleDownloadUpdate = () => {
    downloadUpdateMutation.mutate();
  };

  const handleInstallUpdate = () => {
    installUpdateMutation.mutate();
  };

  const handleRetryUpdate = () => {
    setUpdateStatus("available");
    handleDownloadUpdate();
  };

  const getUpdateMessage = () => {
    if (updateError) {
      return `Update failed: ${updateError}`;
    }
    if (updateStatus === "downloading") {
      return `Downloading Vault ${updateVersion || "update"}...`;
    }
    if (updateStatus === "downloaded") {
      return `Vault ${updateVersion || "update"} is ready to install.`;
    }
    return `Vault ${updateVersion || "update"} is available.`;
  };

  const getUpdateActionText = () => {
    if (updateError) {
      return "Retry";
    }
    if (updateStatus === "downloading") {
      return undefined;
    }
    if (updateStatus === "downloaded") {
      return "Restart now";
    }
    return "Download now";
  };

  const getUpdateAction = () => {
    if (updateError) {
      return handleRetryUpdate;
    }
    if (updateStatus === "downloading") {
      return undefined;
    }
    if (updateStatus === "downloaded") {
      return handleInstallUpdate;
    }
    return handleDownloadUpdate;
  };

  const getUpdateIcon = () => {
    if (updateError) {
      return AlertTriangle;
    }
    if (updateStatus === "downloading") {
      return Download;
    }
    return Sparkles;
  };

  return (
    <div className="flex flex-col">
      {offline && !dismissedOffline && (
        <AlertBanner
          type="offline"
          onDismiss={handleOfflineDismiss}
          onAction={handleOfflineAction}
        />
      )}

      {lowDisk && !dismissedDisk && (
        <AlertBanner type="disk" onDismiss={handleDiskDismiss} onAction={handleDiskAction} />
      )}

      {updateAvailable && !dismissedUpdate && (
        <AlertBanner
          type="update"
          onDismiss={handleUpdateDismiss}
          onAction={getUpdateAction()}
          actionText={getUpdateActionText()}
          message={getUpdateMessage()}
          progress={updateProgress}
          icon={getUpdateIcon()}
        />
      )}
    </div>
  );
};
