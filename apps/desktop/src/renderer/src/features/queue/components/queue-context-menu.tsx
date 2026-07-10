import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger
} from "@vault/ui/components/context-menu";
import { Play, Pause, RotateCcw, X, Link2, FolderOpen } from "lucide-react";
import type { QueueItem } from "../types";

interface QueueContextMenuProps {
  children: React.ReactNode;
  item: QueueItem;
  onAction: (action: string, id: string) => void;
  onCopyLink: (id: string) => void;
  onOpenFolder: (id: string) => void;
}

export const QueueContextMenu = ({
  children,
  item,
  onAction,
  onCopyLink,
  onOpenFolder
}: QueueContextMenuProps) => {
  const isPaused = item.status === "paused";
  const isQueued = item.status === "queued";
  const isError = item.status === "error";
  const isDownloading = item.status === "downloading";

  const getMenuItems = () => {
    const items = [];

    // Status-specific actions
    if (isPaused || isDownloading) {
      items.push(
        <ContextMenuItem
          key="resume"
          onClick={() => onAction("resume", item.id)}
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
          onClick={() => onAction("pause", item.id)}
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
          onClick={() => onAction("retry", item.id)}
          className="flex items-center gap-2"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Retry
        </ContextMenuItem>
      );
    }

    // Common actions
    items.push(
      <ContextMenuItem
        key="copy-link"
        onClick={() => onCopyLink(item.id)}
        className="flex items-center gap-2"
      >
        <Link2 className="w-3.5 h-3.5" />
        Copy link
      </ContextMenuItem>,

      <ContextMenuItem
        key="open-folder"
        onClick={() => onOpenFolder(item.id)}
        className="flex items-center gap-2"
      >
        <FolderOpen className="w-3.5 h-3.5" />
        Open destination folder
      </ContextMenuItem>
    );

    // Separator
    items.push(<ContextMenuSeparator key="separator" />);

    // Danger actions
    items.push(
      <ContextMenuItem
        key="remove"
        onClick={() => onAction("cancel", item.id)}
        className="flex items-center gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
      >
        <X className="w-3.5 h-3.5 text-destructive!" />
        Remove from queue
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
