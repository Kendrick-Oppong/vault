import { useState } from "react";
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
import { useJobProgress } from "@/lib/queries/jobs";
import {
  useCancelDownload,
  usePauseDownload,
  useResumeDownload,
  useRetryDownload
} from "@/lib/mutations/downloads";
import { formatBytes } from "@/lib/utils/platform";

interface QueueItemProps {
  item: QueueItemType;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

const statusColorMap: Record<string, string> = {
  downloading: "text-blue-500",
  paused: "text-primary",
  queued: "text-muted-foreground",
  error: "text-destructive",
  completed: "text-green-500"
};

const statusIconMap = {
  downloading: Pause,
  paused: Play,
  queued: Clock,
  error: CircleAlert,
  completed: CircleAlert
} as const;

export const QueueItem = ({ item, isSelected, onSelect }: QueueItemProps) => {
  const StatusIcon = statusIconMap[item.status] || CircleAlert;
  const statusColor = statusColorMap[item.status] || "text-muted-foreground";
  const isPaused = item.status === "paused";
  const isQueued = item.status === "queued";
  const isError = item.status === "error";
  const isDownloading = item.status === "downloading";
  const isCompleted = item.status === "completed";
  const [imgError, setImgError] = useState(false);

  const { data: rawProgress } = useJobProgress(item.id);
  const { mutate: cancelDownload } = useCancelDownload();
  const { mutate: pauseDownload } = usePauseDownload();
  const { mutate: resumeDownload } = useResumeDownload();
  const { mutate: retryDownload } = useRetryDownload();

  // Map raw progress to queue item format if available
  const progress =
    !isCompleted && rawProgress?.downloaded_bytes && rawProgress?.total_bytes
      ? (rawProgress.downloaded_bytes / rawProgress.total_bytes) * 100
      : item.progress;

  const downloaded =
    !isCompleted && rawProgress?.downloaded_bytes
      ? formatBytes(rawProgress.downloaded_bytes)
      : item.downloaded;

  const size =
    !isCompleted && rawProgress?.total_bytes
      ? formatBytes(rawProgress.total_bytes)
      : rawProgress?.total_bytes_estimate
        ? `~${formatBytes(rawProgress.total_bytes_estimate)}`
        : item.size;

  const getActions = () => {
    if (isDownloading) {
      return (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => pauseDownload(item.id)}
            className="h-7 w-7 rounded hover:bg-accent transition-colors"
            title="Pause"
          >
            <Pause className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => cancelDownload(item.id)}
            className="h-7 w-7 rounded hover:bg-accent transition-colors"
            title="Cancel"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </>
      );
    }

    if (isPaused) {
      return (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => resumeDownload(item.id)}
            className="h-7 w-7 rounded hover:bg-accent transition-colors"
            title="Resume"
          >
            <Play className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => cancelDownload(item.id)}
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
          onClick={() => cancelDownload(item.id)}
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
            onClick={() => retryDownload(item.id)}
            className="h-7 w-7 rounded hover:bg-accent transition-colors"
            title="Retry"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => cancelDownload(item.id)}
            className="h-7 w-7 rounded hover:bg-accent transition-colors"
            title="Remove"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </>
      );
    }

    if (isCompleted) {
      return (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => cancelDownload(item.id)}
          className="h-7 w-7 rounded hover:bg-accent transition-colors"
          title="Remove"
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      );
    }

    return null;
  };

  const getStatusLabel = () => {
    if (isError) return "Failed";
    return item.status.charAt(0).toUpperCase() + item.status.slice(1);
  };

  return (
    <QueueContextMenu item={item}>
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
            isDownloading && "bg-blue-500",
            isCompleted && "bg-green-500"
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
            {item.thumbnail && !imgError ? (
              <img
                src={item.thumbnail}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <>
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-background" />
                <div className="absolute inset-0 flex items-center justify-center text-foreground/30">
                  {item.type === "video" ? (
                    <Video className="w-6 h-6" />
                  ) : (
                    <AudioLines className="w-6 h-6" />
                  )}
                </div>
              </>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
            <span className="absolute bottom-1 right-1 z-10 opacity-90 drop-shadow-md">
              {item.type === "video" ? (
                <Video className="w-3 h-3 text-white" />
              ) : (
                <Music className="w-3 h-3 text-white" />
              )}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[13px] font-medium truncate">{item.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[11.5px] text-muted-foreground">{item.channel}</p>
                  {item.duration && (
                    <>
                      <span className="text-muted-foreground/30">·</span>
                      <p className="text-[11.5px] text-muted-foreground">{item.duration}</p>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {progress !== undefined && !isQueued && !isError && (
                  <span className="text-[20px] leading-none font-bold text-muted-foreground">
                    {progress.toFixed(1)}
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

            {(isPaused || isDownloading) && progress !== undefined && (
              <div className="mt-2">
                <div className="h-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-muted-foreground transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                  <span>{isPaused ? "Paused" : "Downloading"}</span>
                  {downloaded && size && (
                    <span>
                      {downloaded} / {size}
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
