import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger
} from "@vault/ui/components/context-menu";
import { Play, FolderOpen, Trash2, ExternalLink } from "lucide-react";
import type { HistoryItem } from "../types";
import { toast } from "sonner";
import { useModalStore } from "@/stores/ui/modal.store";
import { useDeleteHistory } from "@/lib/mutations/history";
import { useOpenFile, useRevealFile } from "@/lib/mutations/downloads";
import { usePlayerActions } from "@renderer/stores/player/player.selectors";

interface HistoryContextMenuProps {
  children: React.ReactNode;
  item: HistoryItem;
}

export const HistoryContextMenu = ({ children, item }: HistoryContextMenuProps) => {
  const { openConfirmDialog } = useModalStore();
  const deleteHistory = useDeleteHistory();
  const openFileMutation = useOpenFile();
  const revealFileMutation = useRevealFile();
  const { playMedia } = usePlayerActions();

  return (
    <ContextMenu>
      <ContextMenuTrigger render={(props) => <div {...props}>{children}</div>} />
      <ContextMenuContent className="w-56">
        <ContextMenuItem
          onClick={() => {
            if (item.filePath) {
              playMedia(item);
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
        </ContextMenuItem>

        <ContextMenuItem
          onClick={() => {
            if (item.filePath) {
              openFileMutation.mutate(item.filePath);
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

        <ContextMenuItem
          onClick={() => {
            if (item.filePath) {
              revealFileMutation.mutate(item.filePath);
            } else {
              toast.error("File path not available", {
                description:
                  "This file might have been downloaded with an older version, or it was moved/deleted."
              });
            }
          }}
          className="flex items-center gap-2"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          Open in folder
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem
          onClick={() => {
            openConfirmDialog({
              title: "Delete item",
              description: `Are you sure you want to delete "${item.title}"?. This will only remove them from the list, not your disk.`,
              confirmText: "Delete",
              variant: "danger",
              onConfirm: () => {
                deleteHistory.mutate(item.id);
              }
            });
          }}
          className="flex items-center gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
        >
          <Trash2 className="w-3.5 h-3.5 text-destructive!" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
