import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger
} from "@vault/ui/components/context-menu";
import { Play, Pause, RotateCcw, X, FolderOpen } from "lucide-react";
import type { QueueItem } from "../types";
import {
  useCancelDownload,
  usePauseDownload,
  useResumeDownload,
  useRetryDownload,
  useRevealFile
} from "@/lib/mutations/downloads";
import { toast } from "sonner";
import { useState } from "react";
import { ConfirmationDialog } from "@/features/ui/components/confirmation-dialog";

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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const isPaused = item.status === "paused";
  const isQueued = item.status === "queued";
  const isError = item.status === "error";
  const isDownloading = item.status === "downloading";
  const isCompleted = item.status === "completed";

  const getMenuItems = () => {
    const items: React.ReactNode[] = [];

    // Status-specific actions
    if (isPaused || isDownloading) {
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

    if (isPaused || isQueued || isDownloading) {
      items.push(
        <ContextMenuItem
          key="pause"
          onClick={() => pauseDownload(item.id)}
          className="flex items-center gap-2"
          disabled={isPaused || isQueued}
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
