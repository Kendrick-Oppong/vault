import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger
} from "@vault/ui/components/context-menu";
import { Play, FolderOpen, Link2, Trash2 } from "lucide-react";
import type { LibraryItem } from "../types";

interface LibraryContextMenuProps {
  children: React.ReactNode;
  item: LibraryItem;
  onPlay: (id: string) => void;
  onOpenFolder: (id: string) => void;
  onCopyLink: (id: string) => void;
  onDelete: (id: string) => void;
}

export const LibraryContextMenu = ({
  children,
  item,
  onPlay,
  onOpenFolder,
  onCopyLink,
  onDelete
}: LibraryContextMenuProps) => {
  return (
    <ContextMenu>
      <ContextMenuTrigger render={(props) => <div {...props}>{children}</div>} />
      <ContextMenuContent className="w-56">
        <ContextMenuItem onClick={() => onPlay(item.id)} className="flex items-center gap-2">
          <Play className="w-3.5 h-3.5" />
          Play
        </ContextMenuItem>

        <ContextMenuItem onClick={() => onOpenFolder(item.id)} className="flex items-center gap-2">
          <FolderOpen className="w-3.5 h-3.5" />
          Open in folder
        </ContextMenuItem>

        <ContextMenuItem onClick={() => onCopyLink(item.id)} className="flex items-center gap-2">
          <Link2 className="w-3.5 h-3.5" />
          Copy link
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem
          onClick={() => onDelete(item.id)}
          className="flex items-center gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
