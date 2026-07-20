import { Progress } from "@vault/ui/components/progress";
import { HardDrive } from "lucide-react";
import { cn } from "@vault/ui/lib/utils";
import { formatBytes } from "@/lib/utils/platform";
import { useSystemAlertsState } from "@/stores/system-alerts/system-alerts.selectors";

export const StorageIndicator = () => {
  const { diskSpaceFree, diskSizeTotal, lowDisk } = useSystemAlertsState();

  if (!diskSpaceFree || !diskSizeTotal) return null;

  const formatted = formatBytes(diskSpaceFree);
  // Calculate used space percentage (more intuitive than free space)
  const usedSpace = diskSizeTotal - diskSpaceFree;
  const usedPercentage = Math.min((usedSpace / diskSizeTotal) * 100, 100);

  return (
    <div className="flex items-center gap-3 rounded-md bg-secondary/50 px-3 py-2">
      <HardDrive
        className={cn("h-4 w-4 shrink-0", lowDisk ? "text-destructive" : "text-muted-foreground")}
      />

      <div className="flex flex-1 items-center gap-3">
        <span className="min-w-fit text-xs text-muted-foreground">{formatted}</span>

        <Progress
          value={usedPercentage}
          className="h-2 flex-1"
          trackClassName="bg-foreground/20"
          indicatorClassName={cn(lowDisk ? "bg-destructive" : "bg-primary")}
        />
      </div>
    </div>
  );
};
