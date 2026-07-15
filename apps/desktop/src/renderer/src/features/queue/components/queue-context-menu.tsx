import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger
} from "@vault/ui/components/context-menu";
import { Play, Pause, RotateCcw, X, Link2, FolderOpen } from "lucide-react";
import type { QueueItem } from "../types";
import { useCancelDownload, usePauseDownload, useResumeDownload, useRetryDownload } from "@/lib/mutations/downloads";
import { filesApi } from "@/lib/api/files";
import { toast } from "sonner";

interface QueueContextMenuProps {
  children: React.ReactNode;
  item: QueueItem;
}

export const QueueContextMenu = ({ children, item }: QueueContextMenuProps) => {
  const { mutate: cancelDownload } = useCancelDownload();
  const { mutate: pauseDownload } = usePauseDownload();
  const { mutate: resumeDownload } = useResumeDownload();
  const { mutate: retryDownload } = useRetryDownload();
  const isPaused = item.status === "paused";
  const isQueued = item.status === "queued";
  const isError = item.status === "error";
  const isDownloading = item.status === "downloading";

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
        key="copy-link"
        onClick={() => {
          if (item.url) {
            navigator.clipboard.writeText(item.url);
            toast.success("Link copied to clipboard");
          }
        }}
        className="flex items-center gap-2"
      >
        <Link2 className="w-3.5 h-3.5" />
        Copy link
      </ContextMenuItem>,

      <ContextMenuItem
        key="open-folder"
        onClick={() => {
          if (item.filePath) {
            filesApi.openInFolder(item.filePath);
          } else {
            toast.info("File not available yet", {
              description: "The file path will be available once the download completes."
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
        onClick={() => cancelDownload(item.id)}
        className="flex items-center gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
      >
        <X className="w-3.5 h-3.5 text-destructive!" />
        Cancel Download
      </ContextMenuItem>
    );

    return items;
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56">{getMenuItems()}</ContextMenuContent>
    </ContextMenu>
  );
};
