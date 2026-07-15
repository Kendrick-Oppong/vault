import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger
} from "@vault/ui/components/context-menu";
import { Play, FolderOpen, Link2, Trash2 } from "lucide-react";
import type { LibraryItem } from "../types";
import { toast } from "sonner";
import { useModalStore } from "@/stores/ui/modal.store";
import { useDeleteHistory } from "@/lib/mutations/history";
import { filesApi } from "@/lib/api/files";

interface LibraryContextMenuProps {
  children: React.ReactNode;
  item: LibraryItem;
}

export const LibraryContextMenu = ({ children, item }: LibraryContextMenuProps) => {
  const { openConfirmDialog } = useModalStore();
  const deleteHistory = useDeleteHistory();
  return (
    <ContextMenu>
      <ContextMenuTrigger render={(props) => <div {...props}>{children}</div>} />
      <ContextMenuContent className="w-56">
        <ContextMenuItem
          onClick={() => {
            if (item.filePath) {
              filesApi.openFile(item.filePath).then((err) => {
                if (err) toast.error("Could not open file", { description: err });
              });
            } else {
              toast.error("File path not available");
            }
          }}
          className="flex items-center gap-2"
        >
          <Play className="w-3.5 h-3.5" />
          Play
        </ContextMenuItem>

        <ContextMenuItem
          onClick={() => {
            if (item.filePath) {
              filesApi.openInFolder(item.filePath);
            } else {
              toast.error("File path not available");
            }
          }}
          className="flex items-center gap-2"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          Open in folder
        </ContextMenuItem>

        <ContextMenuItem
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
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem
          onClick={() => {
            openConfirmDialog({
              title: "Delete item",
              description: `Are you sure you want to delete "${item.title}"?`,
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
