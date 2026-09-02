import { useState } from "react";
import { Checkbox } from "@vault/ui/components/checkbox";
import { Button } from "@vault/ui/components/button";
import { useModalStore } from "@/stores/ui/modal.store";
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
  AudioLines,
  CheckCircle2,
  Scissors,
  Download,
  Loader2,
  Settings2,
  type LucideIcon
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
import { formatBytes, getTimeAgo } from "@/lib/utils/platform";

interface QueueItemProps {
  item: QueueItemType;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

interface Phase {
  label: string;
  icon: LucideIcon;
  iconClass: string;
  spin?: boolean;
  barClass: string;
  railClass: string;
  determinate: boolean;
  percent?: number;
  showStats: boolean;
  showRate: boolean;
}

function formatTrimLabel(trimRange?: { start?: string; end?: string }): string | null {
  if (!trimRange) return null;
  if (!trimRange.start && !trimRange.end) return null;
  return `${trimRange.start || "0:00"}–${trimRange.end || "end"}`;
}

/** Maps postProcessStep to a user-friendly label. */
function getPostProcessLabel(step: string | undefined, mediaType: "video" | "music"): string {
  switch (step) {
    case "merging":
      return "Merging video + audio…";
    case "metadata":
      return "Embedding metadata…";
    case "thumbnail":
      return "Embedding thumbnail…";
    case "extractaudio":
      return mediaType === "music" ? "Extracting audio…" : "Converting audio…";
    case "remux":
      return "Remuxing…";
    case "sponsorblock":
      return "Removing sponsor segments…";
    case "chapters":
      return "Embedding chapters…";
    case "cutting":
      return "Cutting…";
    default:
      return mediaType === "video" ? "Finalizing…" : "Processing audio…";
  }
}

export const QueueItem = ({ item, isSelected, onSelect }: QueueItemProps) => {
  const isPaused = item.status === "paused";
  const isQueued = item.status === "queued";
  const isError = item.status === "error";
  const isDownloading = item.status === "downloading";
  const isCompleted = item.status === "completed";
  const [imgError, setImgError] = useState(false);

  const isTrimmedDownload = Boolean(item.trimRange?.start || item.trimRange?.end);

  const [resumeRequested, setResumeRequested] = useState(false);
  const [lastSeenStatus, setLastSeenStatus] = useState(item.status);

  if (item.status !== lastSeenStatus) {
    setLastSeenStatus(item.status);
    if (
      resumeRequested &&
      (item.status === "downloading" || item.status === "error" || item.status === "completed")
    ) {
      setResumeRequested(false);
    }
  }

  const isResuming = resumeRequested && (isPaused || isQueued);

  const { openConfirmDialog } = useModalStore();
  const { data: queriedProgress } = useJobProgress(item.id);
  const rawProgress = item.rawProgress ?? queriedProgress;
  const { mutate: cancelDownload } = useCancelDownload({
    successMessage: isCompleted || isError ? "Removed from queue" : "Download cancelled",
    errorMessage:
      isCompleted || isError ? "Failed to remove from queue" : "Failed to cancel download"
  });
  const { mutate: pauseDownload } = usePauseDownload();
  const { mutate: resumeDownload } = useResumeDownload();
  const { mutate: retryDownload } = useRetryDownload();

  const progressTotalBytes = rawProgress?.total_bytes ?? rawProgress?.total_bytes_estimate;
  const rawPercentComplete =
    typeof rawProgress?.percentComplete === "number" ? rawProgress.percentComplete : undefined;

  const progress =
    !isCompleted && rawPercentComplete !== undefined
      ? rawPercentComplete
      : !isCompleted && rawProgress?.downloaded_bytes != null && progressTotalBytes
        ? (rawProgress.downloaded_bytes / progressTotalBytes) * 100
        : item.progress;
  const clampedProgress =
    typeof progress === "number" && !Number.isNaN(progress)
      ? Math.max(0, Math.min(100, progress))
      : undefined;
  const hasPercent = clampedProgress !== undefined;

  const progressStatus = rawProgress?.status;
  const streamPhase = rawProgress?.streamPhase;
  const postProcessStep = rawProgress?.postProcessStep;
  const isCutting = isDownloading && progressStatus === "cutting";
  const isMerging =
    isDownloading && progressStatus === "processing" && postProcessStep === "merging";
  const isPostProcessing = isDownloading && progressStatus === "postprocessing";
  const isGenericProcessing = isDownloading && progressStatus === "processing" && !isMerging;
  const isDownloadingVideo =
    isDownloading && progressStatus === "downloading" && streamPhase === "video";
  const isDownloadingAudio =
    isDownloading && progressStatus === "downloading" && streamPhase === "audio";

  const downloaded =
    !isCompleted && rawProgress?.downloaded_bytes
      ? formatBytes(rawProgress.downloaded_bytes)
      : item.downloaded;
  const size =
    !isCompleted && rawProgress?.total_bytes
      ? formatBytes(rawProgress.total_bytes)
      : !isCompleted && rawProgress?.total_bytes_estimate
        ? `~${formatBytes(rawProgress.total_bytes_estimate)}`
        : item.size;
  const speed = !isCompleted && rawProgress?.formattedSpeed ? rawProgress.formattedSpeed : null;
  const eta = !isCompleted && rawProgress?.formattedEta ? rawProgress.formattedEta : null;
  const trimLabel = formatTrimLabel(item.trimRange);
  const ffmpegTime = rawProgress?.ffmpegTime;

  // ---- Single source of truth for the visual phase ----
  const phase: Phase = (() => {
    if (isError)
      return {
        label: "Failed",
        icon: CircleAlert,
        iconClass: "text-destructive",
        barClass: "bg-destructive",
        railClass: "bg-destructive",
        determinate: false,
        showStats: false,
        showRate: false
      };
    if (isCompleted)
      return {
        label: "Completed",
        icon: CheckCircle2,
        iconClass: "text-green-500",
        barClass: "bg-green-500",
        railClass: "bg-green-500",
        determinate: false,
        showStats: false,
        showRate: false
      };
    if (isResuming)
      return {
        label: "Resuming…",
        icon: Loader2,
        iconClass: "text-primary",
        spin: true,
        barClass: "bg-primary",
        railClass: "bg-primary",
        determinate: hasPercent,
        percent: clampedProgress,
        showStats: true,
        showRate: false
      };
    if (isQueued)
      return {
        label: "Queued",
        icon: Clock,
        iconClass: "text-muted-foreground",
        barClass: "bg-muted-foreground",
        railClass: "bg-muted-foreground",
        determinate: false,
        showStats: false,
        showRate: false
      };
    if (isPaused)
      return {
        label: "Paused",
        icon: Pause,
        iconClass: "text-primary",
        barClass: "bg-primary",
        railClass: "bg-primary",
        determinate: hasPercent,
        percent: clampedProgress,
        showStats: true,
        showRate: false
      };
    if (isCutting)
      return {
        label: "Cutting…",
        icon: Scissors,
        iconClass: "text-amber-500",
        barClass: "bg-amber-500",
        railClass: "bg-amber-500",
        determinate: hasPercent,
        percent: clampedProgress,
        showStats: true,
        showRate: false
      };
    if (isMerging)
      return {
        label: "Merging video + audio…",
        icon: Settings2,
        iconClass: "text-violet-500",
        spin: true,
        barClass: "bg-violet-500",
        railClass: "bg-violet-500",
        determinate: false,
        showStats: true,
        showRate: false
      };
    if (isPostProcessing)
      return {
        label: getPostProcessLabel(postProcessStep, item.type),
        icon: Settings2,
        iconClass: "text-violet-500",
        spin: true,
        barClass: "bg-violet-500",
        railClass: "bg-violet-500",
        determinate: false,
        showStats: true,
        showRate: false
      };
    if (isGenericProcessing)
      return {
        label: getPostProcessLabel(postProcessStep, item.type),
        icon: Settings2,
        iconClass: "text-violet-500",
        spin: true,
        barClass: "bg-violet-500",
        railClass: "bg-violet-500",
        determinate: false,
        showStats: true,
        showRate: false
      };
    if (isDownloadingVideo)
      return {
        label: "Downloading video…",
        icon: Download,
        iconClass: "text-blue-500",
        barClass: "bg-blue-500",
        railClass: "bg-blue-500",
        determinate: true,
        percent: clampedProgress,
        showStats: true,
        showRate: true
      };
    if (isDownloadingAudio)
      return {
        label: "Downloading audio…",
        icon: Download,
        iconClass: "text-cyan-500",
        barClass: "bg-cyan-500",
        railClass: "bg-cyan-500",
        determinate: true,
        percent: clampedProgress,
        showStats: true,
        showRate: true
      };
    if (hasPercent)
      return {
        label: "Downloading",
        icon: Download,
        iconClass: "text-blue-500",
        barClass: "bg-blue-500",
        railClass: "bg-blue-500",
        determinate: true,
        percent: clampedProgress,
        showStats: true,
        showRate: true
      };
    return {
      label: "Starting…",
      icon: Loader2,
      iconClass: "text-blue-500",
      spin: true,
      barClass: "bg-blue-500",
      railClass: "bg-blue-500",
      determinate: false,
      showStats: true,
      showRate: false
    };
  })();

  const showBigPercent = phase.determinate && phase.percent !== undefined;
  const showProgressBlock = isDownloading || isPaused || isResuming;

  const confirmCancel = () =>
    openConfirmDialog({
      title: "Cancel download?",
      description: "Are you sure you want to cancel this download? Partial files may be deleted.",
      confirmText: "Cancel Download",
      variant: "danger",
      onConfirm: () => cancelDownload(item.id)
    });

  const getActions = () => {
    if (isDownloading) {
      return (
        <>
          {!isTrimmedDownload && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => pauseDownload(item.id)}
              className="h-7 w-7 rounded hover:bg-accent transition-colors"
              title="Pause"
            >
              <Pause className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={confirmCancel}
            className="h-7 w-7 rounded hover:bg-accent transition-colors"
            title="Cancel"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </>
      );
    }
    if (isPaused || isResuming) {
      return (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setResumeRequested(true);
              resumeDownload(item.id);
            }}
            className="h-7 w-7 rounded hover:bg-accent transition-colors"
            title="Resume"
          >
            <Play className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={confirmCancel}
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

  const PhaseIcon = phase.icon;
  const thumbBadge = isPaused ? (
    <Pause className="w-3.5 h-3.5" />
  ) : isCompleted ? (
    <CheckCircle2 className="w-3.5 h-3.5" />
  ) : isError ? (
    <CircleAlert className="w-3.5 h-3.5" />
  ) : null;

  return (
    <QueueContextMenu item={item}>
      <div
        className={cn(
          "job-card group flex gap-0 rounded-xl border border-border bg-card hover:bg-card-hover transition-colors overflow-hidden cursor-context-menu",
          isSelected && "ring-[0.3px] ring-primary"
        )}
        data-job-id={item.id}
      >
        <div className={cn("w-1 shrink-0", phase.railClass)} />

        <div className="flex gap-3 p-3 flex-1 min-w-0">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onSelect(item.id)}
            className="w-4 h-4 dark:border-gray-300 shrink-0 self-start mt-1"
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
                <div className="absolute inset-0 bg-linear-to-br from-primary/20 to-background" />
                <div className="absolute inset-0 flex items-center justify-center text-foreground/30">
                  {item.type === "video" ? (
                    <Video className="w-6 h-6" />
                  ) : (
                    <AudioLines className="w-6 h-6" />
                  )}
                </div>
              </>
            )}
            <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-80" />
            <span className="absolute bottom-1 right-1 z-10 opacity-90 drop-shadow-md">
              {item.type === "video" ? (
                <Video className="w-3 h-3 text-white" />
              ) : (
                <Music className="w-3 h-3 text-white" />
              )}
            </span>
            {thumbBadge && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-white",
                    isPaused && "bg-primary",
                    isCompleted && "bg-green-500",
                    isError && "bg-destructive"
                  )}
                >
                  {thumbBadge}
                </div>
              </div>
            )}
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
                {showBigPercent && (
                  <span
                    className={cn(
                      "text-[20px] leading-none font-bold",
                      isPaused ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {phase.percent!.toFixed(1)}
                    <span className="text-[12px]">%</span>
                  </span>
                )}
                <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                  {getActions()}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <PhaseIcon className={cn("w-3 h-3", phase.iconClass, phase.spin && "animate-spin")} />
              <span className={cn("text-[11.5px]", phase.iconClass)}>{phase.label}</span>
              {item.format && (
                <span className="chip text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground">
                  {item.format}
                </span>
              )}
              {trimLabel && (
                <span
                  className="chip flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  title="Trimmed section"
                >
                  <Scissors className="w-2.5 h-2.5" />
                  {trimLabel}
                </span>
              )}
              {isCompleted && item.addedAt && (
                <>
                  <span className="text-muted-foreground/30">·</span>
                  <span className="text-[11px] text-muted-foreground">
                    {getTimeAgo(item.addedAt)}
                  </span>
                </>
              )}
            </div>

            {isQueued && !isResuming && (
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

            {showProgressBlock && (
              <div className="mt-2">
                <div className="relative h-1 rounded-full bg-muted overflow-hidden">
                  {phase.determinate && phase.percent !== undefined ? (
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        phase.barClass,
                        isPaused && "opacity-80"
                      )}
                      style={{ width: `${phase.percent}%` }}
                    />
                  ) : (
                    <div
                      className="absolute inset-y-0 w-1/3 rounded-full bg-muted-foreground/70 animate-[download-progress_1.2s_ease-in-out_infinite]"
                      style={{ left: "-33%" }}
                    />
                  )}
                </div>

                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    {isCutting && <Scissors className="w-3 h-3 text-amber-500" />}
                    <span
                      className={cn(
                        (isMerging || isPostProcessing || isGenericProcessing) && "animate-pulse"
                      )}
                    >
                      {phase.label}
                    </span>
                    {ffmpegTime && (
                      <span className="text-muted-foreground/70 tabular-nums text-[10px]">
                        ({ffmpegTime})
                      </span>
                    )}
                    {isPaused && hasPercent && (
                      <span className="text-muted-foreground/70">
                        at {phase.percent!.toFixed(1)}%
                      </span>
                    )}
                  </span>
                  {phase.showStats && downloaded && size && (
                    <div className="flex items-center gap-3">
                      <span>
                        {downloaded} / {size}
                      </span>
                      {phase.showRate && speed && (
                        <>
                          <span className="text-muted-foreground/30">·</span>
                          <span className="tabular-nums">{speed}</span>
                        </>
                      )}
                      {phase.showRate && eta && (
                        <>
                          <span className="text-muted-foreground/30">·</span>
                          <span className="tabular-nums">{eta} left</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {isMerging && (
                  <p className="text-[10.5px] text-muted-foreground/80 mt-1.5 leading-tight">
                    Merging can take a few minutes for long videos because audio is being re-encoded
                    for MP4.
                    <span className="text-primary font-medium">
                      {" "}
                      Tip: Switch to MKV for instant merging.
                    </span>
                  </p>
                )}
                {(isPostProcessing || isGenericProcessing) && !isMerging && !isCutting && (
                  <p className="text-[10.5px] text-muted-foreground/80 mt-1.5 leading-tight">
                    Finalizing the file… This may take a moment for longer videos.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </QueueContextMenu>
  );
};
