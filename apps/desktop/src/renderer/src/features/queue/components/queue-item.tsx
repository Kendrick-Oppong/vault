import { Checkbox } from "@vault/ui/components/checkbox";
import { Button } from "@vault/ui/components/button";
import { cn } from "@vault/ui/lib/utils";
import {
  Video,
  Music,
  Play,
  X,
  RotateCcw,
  Pause,
  Clock,
  CircleAlert,
  ChevronDown,
  AudioLines
} from "lucide-react";
import { QueueContextMenu } from "./queue-context-menu";
import type { QueueItem as QueueItemType } from "../types";

interface QueueItemProps {
  item: QueueItemType;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onAction: (action: string, id: string) => void;
  onCopyLink: (id: string) => void;
  onOpenFolder: (id: string) => void;
}

const statusColorMap: Record<string, string> = {
  downloading: "text-blue-500",
  paused: "text-primary",
  queued: "text-muted-foreground",
  error: "text-destructive"
};

const statusIconMap = {
  downloading: Play,
  paused: Pause,
  queued: Clock,
  error: CircleAlert
} as const;

export const QueueItem = ({
  item,
  isSelected,
  onSelect,
  onAction,
  onCopyLink,
  onOpenFolder
}: QueueItemProps) => {
  const StatusIcon = statusIconMap[item.status];
  const statusColor = statusColorMap[item.status] || "text-muted-foreground";
  const isPaused = item.status === "paused";
  const isQueued = item.status === "queued";
  const isError = item.status === "error";
  const isDownloading = item.status === "downloading";

  const getActions = () => {
    if (isPaused || isDownloading) {
      return (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onAction("resume", item.id)}
            className="h-7 w-7 rounded hover:bg-accent transition-colors"
            title="Resume"
          >
            <Play className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onAction("cancel", item.id)}
            className="h-7 w-7 rounded hover:bg-accent transition-colors"
            title="Cancel"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </>
      );
    }

    if (isQueued) {
      return (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onAction("cancel", item.id)}
          className="h-7 w-7 rounded hover:bg-accent transition-colors"
          title="Remove"
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      );
    }

    if (isError) {
      return (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onAction("retry", item.id)}
            className="h-7 w-7 rounded hover:bg-accent transition-colors"
            title="Retry"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onAction("cancel", item.id)}
            className="h-7 w-7 rounded hover:bg-accent transition-colors"
            title="Remove"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </>
      );
    }

    return null;
  };

  const getStatusLabel = () => {
    if (isError) return "Failed";
    return item.status.charAt(0).toUpperCase() + item.status.slice(1);
  };

  return (
    <QueueContextMenu
      item={item}
      onAction={onAction}
      onCopyLink={onCopyLink}
      onOpenFolder={onOpenFolder}
    >
      <div
        className={cn(
          "job-card group flex gap-0 rounded-xl border border-border bg-card hover:bg-card-hover transition-colors overflow-hidden cursor-context-menu",
          isSelected && "ring-[0.3px] ring-primary"
        )}
        data-job-id={item.id}
      >
        <div
          className={cn(
            "w-1 shrink-0",
            isError && "bg-destructive",
            isPaused && "bg-primary",
            isQueued && "bg-muted-foreground",
            isDownloading && "bg-blue-500"
          )}
        />

        <div className="flex gap-3 p-3 flex-1 min-w-0">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onSelect(item.id)}
            className="w-4 h-4 shrink-0 self-start mt-1"
            onClick={(e) => e.stopPropagation()}
          />

          <div className="relative w-24 h-14 rounded-lg shrink-0 overflow-hidden bg-secondary">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-background" />
            <div className="absolute inset-0 flex items-center justify-center text-foreground/30">
              {item.type === "video" ? (
                <Video className="w-9 h-9" />
              ) : (
                <AudioLines className="w-9 h-9" />
              )}
            </div>
            <span className="absolute top-1.5 left-1.5 z-10 opacity-80">
              {item.type === "video" ? (
                <Video className="w-3 h-3 text-foreground" />
              ) : (
                <Music className="w-3 h-3 text-foreground" />
              )}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[13px] font-medium truncate">{item.title}</p>
                <p className="text-[11.5px] text-muted-foreground mt-0.5">{item.channel}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {item.progress !== undefined && !isQueued && !isError && (
                  <span className="text-[20px] leading-none font-bold text-muted-foreground">
                    {item.progress.toFixed(1)}
                    <span className="text-[12px]">%</span>
                  </span>
                )}

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {getActions()}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <StatusIcon
                className={cn("w-3 h-3", isError ? "text-destructive" : "text-muted-foreground")}
              />
              <span className={cn("text-[11.5px]", statusColor)}>{getStatusLabel()}</span>
              {item.format && (
                <span className="chip text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground">
                  {item.format}
                </span>
              )}
            </div>

            {isQueued && (
              <p className="text-[11.5px] text-muted-foreground mt-1.5">
                Waiting for a free download slot
              </p>
            )}

            {isError && item.errorMessage && (
              <div className="mt-2.5 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-[11.5px] text-destructive">{item.errorMessage}</p>
                {item.errorDetails && (
                  <details className="mt-1 group/err">
                    <summary className="text-[11.5px] text-destructive cursor-pointer list-none flex items-center gap-1">
                      <ChevronDown className="w-3 h-3 transition-transform group-open/err:rotate-180" />
                      Show details
                    </summary>
                    <pre className="text-[10.5px] text-muted-foreground mt-1.5 p-2 bg-secondary/40 rounded-md overflow-x-auto whitespace-pre-wrap">
                      {item.errorDetails}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {(isPaused || isDownloading) && item.progress !== undefined && (
              <div className="mt-2">
                <div className="h-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-muted-foreground transition-all"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                  <span>{isPaused ? "Paused" : "Downloading"}</span>
                  {item.downloaded && item.size && (
                    <span>
                      {item.downloaded} / {item.size}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </QueueContextMenu>
  );
};
