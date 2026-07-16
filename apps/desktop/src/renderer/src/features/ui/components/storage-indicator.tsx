import { useSystemAlertsState } from "@/stores/system-alerts/system-alerts.selectors";
import { HardDrive } from "lucide-react";
import { formatBytes } from "@/lib/utils/platform";
import { cn } from "@vault/ui/lib/utils";

export const StorageIndicator = () => {
  const { diskSpaceFree, lowDisk } = useSystemAlertsState();

  if (!diskSpaceFree) return null;

  const formatted = formatBytes(diskSpaceFree);
  const percentage = Math.min((diskSpaceFree / (1024 * 1024 * 1024 * 100)) * 100, 100);

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-secondary/50 text-xs">
      <HardDrive className={cn("w-3.5 h-3.5", lowDisk ? "text-destructive" : "text-muted-foreground")} />
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground">{formatted}</span>
        <div className="w-12 h-1 rounded-full bg-secondary border border-border/50">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              lowDisk ? "bg-destructive" : "bg-primary"
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
};
