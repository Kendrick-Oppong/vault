import { Button } from "@vault/ui/components/button";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { useDependenciesCheck } from "@/lib/queries/dependencies";
import type { DependenciesCheckResult } from "@/features/dependency-checker/types";
import { cn } from "@vault/ui/lib/utils";

export const DependencyChecker = () => {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useDependenciesCheck();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["dependencies", "check"] });
  };

  if (!data) {
    return (
      <div className="text-center text-sm text-muted-foreground">
        {isLoading && "Checking dependencies..."}
        {error && "Failed to check dependencies"}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {/* yt-dlp Status */}
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/30 border border-border">
          <div className="flex items-center gap-2 min-w-0">
            <div className="shrink-0">
              {data.ytDlp.installed ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-destructive" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium">yt-dlp</p>
              {data.ytDlp.version && (
                <p className="text-[11px] text-muted-foreground">{data.ytDlp.version}</p>
              )}
              {data.ytDlp.path && (
                <p className="text-[11px] text-muted-foreground truncate">{data.ytDlp.path}</p>
              )}
              {data.ytDlp.error && (
                <p className="text-[11px] text-destructive">{data.ytDlp.error}</p>
              )}
            </div>
          </div>
        </div>

        {/* ffmpeg Status */}
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/30 border border-border">
          <div className="flex items-center gap-2 min-w-0">
            <div className="shrink-0">
              {data.ffmpeg.installed ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-destructive" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium">ffmpeg</p>
              {data.ffmpeg.version && (
                <p className="text-[11px] text-muted-foreground">{data.ffmpeg.version}</p>
              )}
              {data.ffmpeg.path && (
                <p className="text-[11px] text-muted-foreground truncate">{data.ffmpeg.path}</p>
              )}
              {data.ffmpeg.error && (
                <p className="text-[11px] text-destructive">{data.ffmpeg.error}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Overall Status */}
      <div
        className={cn(
          "p-2.5 rounded-lg text-[12px] border",
          data.ready
            ? "bg-green-500/10 border-green-500/20 text-green-600"
            : "bg-destructive/10 border-destructive/20 text-destructive"
        )}
      >
        {data.ready ? "All dependencies are ready" : data.errorMessage || "Missing dependencies"}
      </div>

      {/* Refresh Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleRefresh}
        disabled={isLoading}
        className="w-full text-[12px] h-8"
      >
        <RefreshCw className={cn("w-3 h-3", isLoading && "animate-spin")} />
        Check Again
      </Button>
    </div>
  );
};
