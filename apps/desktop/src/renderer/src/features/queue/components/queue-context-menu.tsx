import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger
} from "@vault/ui/components/context-menu";
import { Play, Pause, RotateCcw, X, FolderOpen, ExternalLink } from "lucide-react";
import type { QueueItem } from "../types";
import type { HistoryItem } from "@/features/history/types";
import {
  useCancelDownload,
  usePauseDownload,
  useResumeDownload,
  useRetryDownload,
  useRevealFile,
  useOpenFile
} from "@/lib/mutations/downloads";
import { toast } from "sonner";
import { useState } from "react";
import { ConfirmationDialog } from "@/features/ui/components/confirmation-dialog";
import { usePlayerActions } from "@renderer/stores/player/player.selectors";

interface QueueContextMenuProps {
  children: React.ReactNode;
  item: QueueItem;
}

export const QueueContextMenu = ({ children, item }: QueueContextMenuProps) => {
  const { mutate: cancelDownload } = useCancelDownload();
  const { mutate: pauseDownload } = usePauseDownload();
  const { mutate: resumeDownload } = useResumeDownload();
  const { mutate: retryDownload } = useRetryDownload();
  const { mutate: revealFile } = useRevealFile();
  const { mutate: openFile } = useOpenFile();
  const { playMedia } = usePlayerActions();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const isPaused = item.status === "paused";
  const isError = item.status === "error";
  const isDownloading = item.status === "downloading";
  const isCompleted = item.status === "completed";

  // Convert QueueItem to HistoryItem for player compatibility
  const queueItemToHistoryItem = (queueItem: QueueItem): HistoryItem => ({
    id: queueItem.id,
    title: queueItem.title,
    channel: queueItem.channel,
    type: queueItem.type,
    quality: (queueItem.format || "unknown") as HistoryItem["quality"],
    size: queueItem.size || "0",
    sizeBytes: 0, // Not available in QueueItem
    addedAt: queueItem.addedAt,
    duration: queueItem.duration,
    thumbnail: queueItem.thumbnail,
    url: queueItem.url,
    filePath: queueItem.filePath,
    status: queueItem.status,
    format: queueItem.format
  });

  // Trimmed downloads stream through ffmpeg (--download-sections) and can't be
  // resumed, so pause/resume would only cause a silent restart. Hide them.
  const isTrimmedDownload = Boolean(item.trimRange?.start || item.trimRange?.end);

  const getMenuItems = () => {
    const items: React.ReactNode[] = [];

    // Status-specific actions
    if (isPaused && !isTrimmedDownload) {
      items.push(
        <ContextMenuItem
          key="resume"
          onClick={() => resumeDownload(item.id)}
          className="flex items-center gap-2"
        >
          <Play className="w-3.5 h-3.5" />
          Resume
        </ContextMenuItem>
      );
    }

    if (isDownloading && !isTrimmedDownload) {
      items.push(
        <ContextMenuItem
          key="pause"
          onClick={() => pauseDownload(item.id)}
          className="flex items-center gap-2"
        >
          <Pause className="w-3.5 h-3.5" />
          Pause
        </ContextMenuItem>
      );
    }

    if (isError) {
      items.push(
        <ContextMenuItem
          key="retry"
          onClick={() => retryDownload(item.id)}
          className="flex items-center gap-2"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Retry
        </ContextMenuItem>
      );
    }

    // Completed download actions
    if (isCompleted) {
      items.push(
        <ContextMenuItem
          key="play-in-vault"
          onClick={() => {
            if (item.filePath) {
              playMedia(queueItemToHistoryItem(item));
            } else {
              toast.error("File path not available", {
                description:
                  "This file might have been downloaded with an older version, or it was moved/deleted."
              });
            }
          }}
          className="flex items-center gap-2"
        >
          <Play className="w-3.5 h-3.5" />
          Play in Vault
        </ContextMenuItem>,
        <ContextMenuItem
          key="play-external"
          onClick={() => {
            if (item.filePath) {
              openFile(item.filePath);
            } else {
              toast.error("File path not available", {
                description:
                  "This file might have been downloaded with an older version, or it was moved/deleted."
              });
            }
          }}
          className="flex items-center gap-2"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Play in External Player
        </ContextMenuItem>
      );
    }

    // Common actions + separator + danger
    items.push(
      <ContextMenuItem
        key="open-folder"
        onClick={() => {
          if (item.filePath) {
            revealFile(item.filePath);
          } else {
            toast.info(isCompleted ? "File path not available" : "File not available yet", {
              description: isCompleted
                ? "The destination path was not recorded for this download."
                : "The file path will be available once the download completes."
            });
          }
        }}
        className="flex items-center gap-2"
      >
        <FolderOpen className="w-3.5 h-3.5" />
        Open destination folder
      </ContextMenuItem>,

      <ContextMenuSeparator key="separator" />,

      <ContextMenuItem
        key="remove"
        onClick={() => setIsDeleteDialogOpen(true)}
        className="flex items-center gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
      >
        <X className="w-3.5 h-3.5 text-destructive!" />
        {isCompleted ? "Remove from queue" : "Cancel Download"}
      </ContextMenuItem>
    );

    return items;
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger>{children}</ContextMenuTrigger>
        <ContextMenuContent className="w-56">{getMenuItems()}</ContextMenuContent>
      </ContextMenu>

      <ConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={() => {
          cancelDownload(item.id);
          setIsDeleteDialogOpen(false);
        }}
        title={isCompleted ? "Remove from queue?" : "Cancel download?"}
        description={
          isCompleted
            ? "This will remove the item from the queue list. The downloaded file will remain on your disk and in history."
            : "Are you sure you want to cancel this download? Partial files may be deleted."
        }
        confirmText={isCompleted ? "Remove" : "Cancel Download"}
        variant="danger"
      />
    </>
  );
};
